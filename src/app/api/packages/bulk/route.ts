import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES BULK POST ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear paquetes masivos'
      }, { status: 401 })
    }

    console.log('Creando paquetes masivos para user ID:', userId)

    const body = await request.json()
    const { tipo, data, conductor_id } = body

    if (!tipo || !data || !conductor_id) {
      return NextResponse.json({ error: 'Tipo, datos y conductor son requeridos' }, { status: 400 })
    }

    // Verificar que el conductor existe Y pertenece al usuario actual
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id')
      .eq('id', conductor_id)
      .eq('user_id', userId) // Solo conductores del usuario actual
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado o no pertenece a su bodega' }, { status: 400 })
    }

    // Obtener todos los conductores del usuario para verificar duplicados
    const { data: userConductors, error: userConductorsError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)

    if (userConductorsError) {
      console.error('Error obteniendo conductores del usuario:', userConductorsError)
      return NextResponse.json({ error: 'Error verificando conductores' }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)

    let packagesToInsert = []
    let errors = []

    if (tipo === 'shein_temu') {
      // Procesar datos de Shein/Temu (solo trackings)
      const trackings = data.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      
      for (let i = 0; i < trackings.length; i++) {
        const tracking = trackings[i]
        
        if (tracking.length < 3) {
          errors.push(`Línea ${i + 1}: Tracking muy corto: "${tracking}"`)
          continue
        }

        // Verificar duplicados solo en conductores del usuario
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .in('conductor_id', conductorIds)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe en su bodega: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Shein/Temu',
          estado: 0, // No entregado
          fecha_entrega: new Date().toISOString().split('T')[0],
          valor: null
        })
      }
    } else if (tipo === 'dropi') {
      // Procesar datos de Dropi (tracking + valor)
      const lines = data.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const parts = line.split('\t') // Separado por tabs (Excel)
        
        if (parts.length < 2) {
          errors.push(`Línea ${i + 1}: Formato incorrecto. Debe tener tracking y valor separados por tab: "${line}"`)
          continue
        }

        const tracking = parts[0].trim()
        const valorStr = parts[1].trim()
        
        if (tracking.length < 3) {
          errors.push(`Línea ${i + 1}: Tracking muy corto: "${tracking}"`)
          continue
        }

        const valor = parseFloat(valorStr.replace(/[^\d.-]/g, ''))
        if (isNaN(valor) || valor <= 0) {
          errors.push(`Línea ${i + 1}: Valor inválido: "${valorStr}"`)
          continue
        }

        // Verificar duplicados solo en conductores del usuario
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .in('conductor_id', conductorIds)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe en su bodega: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Dropi',
          estado: 0, // No entregado
          fecha_entrega: new Date().toISOString().split('T')[0],
          valor: valor
        })
      }
    } else {
      return NextResponse.json({ error: 'Tipo de paquete inválido' }, { status: 400 })
    }

    console.log(`Paquetes a insertar: ${packagesToInsert.length}`)
    console.log(`Errores encontrados: ${errors.length}`)

    // Insertar paquetes válidos
    let insertedCount = 0
    if (packagesToInsert.length > 0) {
      const { data: insertedPackages, error: insertError } = await supabase
        .from('packages')
        .insert(packagesToInsert)
        .select()

      if (insertError) {
        console.error('Error insertando paquetes:', insertError)
        return NextResponse.json({ error: 'Error al insertar paquetes en la base de datos' }, { status: 500 })
      }

      insertedCount = insertedPackages?.length || 0
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      total_processed: packagesToInsert.length + errors.length,
      errors: errors
    })

  } catch (error) {
    console.error('Error in packages bulk POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

