import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Obtener ID del usuario
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para registrar entregas'
      }, { status: 401 })
    }

    const body = await request.json()
    const { trackings, tipo_operacion, fecha_entrega_cliente } = body // tipo_operacion: 'entrega' o 'devolucion'

    if (!trackings || !Array.isArray(trackings) || trackings.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de trackings requerida' 
      }, { status: 400 })
    }

    if (!tipo_operacion || !['entrega', 'devolucion'].includes(tipo_operacion)) {
      return NextResponse.json({ 
        error: 'Tipo de operación inválido. Debe ser "entrega" o "devolucion"' 
      }, { status: 400 })
    }

    // Obtener conductores del usuario para filtrar
    const { data: userConductors, error: conductorsError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)

    if (conductorsError) {
      return NextResponse.json({ 
        error: 'Error obteniendo conductores del usuario' 
      }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)

    let processed = 0
    let errors = []
    let updated = []

    // Determinar nuevo estado
    const nuevoEstado = tipo_operacion === 'entrega' ? 1 : 2 // 1 = Entregado, 2 = Devuelto

    for (const tracking of trackings) {
      const trackingTrimmed = tracking.trim()
      
      if (!trackingTrimmed) {
        errors.push(`Tracking vacío ignorado`)
        continue
      }

      try {
        // Buscar el paquete en conductores del usuario
        const { data: package_data, error: findError } = await supabase
          .from('packages')
          .select(`
            id, 
            tracking, 
            estado, 
            tipo,
            conductor:conductors(id, nombre, zona)
          `)
          .eq('tracking', trackingTrimmed)
          .in('conductor_id', conductorIds)
          .single()

        if (findError || !package_data) {
          errors.push(`${trackingTrimmed}: No encontrado en su bodega`)
          continue
        }

        // Verificar si ya está en el estado deseado
        if (package_data.estado === nuevoEstado) {
          const estadoTexto = nuevoEstado === 1 ? 'entregado' : 'devuelto'
          errors.push(`${trackingTrimmed}: Ya está marcado como ${estadoTexto}`)
          continue
        }

        // Actualizar estado y fecha de entrega al cliente
        const updateData: any = { 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        }

        // Solo agregar fecha_entrega_cliente si es una entrega y se proporcionó la fecha
        if (tipo_operacion === 'entrega' && fecha_entrega_cliente) {
          updateData.fecha_entrega_cliente = fecha_entrega_cliente
        }

        const { data: updatedPackage, error: updateError } = await supabase
          .from('packages')
          .update(updateData)
          .eq('id', package_data.id)
          .select(`
            id,
            tracking,
            estado,
            tipo,
            conductor:conductors(nombre, zona)
          `)
          .single()

        if (updateError) {
          errors.push(`${trackingTrimmed}: Error al actualizar - ${updateError.message}`)
          continue
        }

        updated.push({
          tracking: trackingTrimmed,
          tipo: package_data.tipo,
          conductor: package_data.conductor?.nombre || 'N/A',
          zona: package_data.conductor?.zona || 'N/A',
          estado_anterior: package_data.estado,
          estado_nuevo: nuevoEstado
        })
        processed++

      } catch (error) {
        errors.push(`${trackingTrimmed}: Error procesando - ${error instanceof Error ? error.message : 'Error desconocido'}`)
      }
    }

    const operacionTexto = tipo_operacion === 'entrega' ? 'entregas' : 'devoluciones'

    return NextResponse.json({
      success: true,
      message: `Procesamiento de ${operacionTexto} completado`,
      processed,
      total_trackings: trackings.length,
      updated,
      errors
    })

  } catch (error) {
    console.error('Error in deliveries POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

