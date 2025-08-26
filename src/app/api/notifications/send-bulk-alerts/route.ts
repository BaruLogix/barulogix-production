import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG SEND BULK ALERTS API ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para enviar alertas masivas'
      }, { status: 401 })
    }

    const body = await request.json()
    const { package_ids } = body

    console.log('Package IDs recibidos:', package_ids?.length || 0)

    if (!package_ids || !Array.isArray(package_ids) || package_ids.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de paquetes requerida',
        details: 'package_ids debe ser un array no vacío'
      }, { status: 400 })
    }

    // Obtener todos los paquetes con sus detalles
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select(`
        id,
        tracking,
        tipo,
        fecha_entrega,
        valor,
        conductor:conductors!inner(id, nombre, user_id)
      `)
      .in('id', package_ids)
      .eq('conductor.user_id', userId)

    if (packagesError) {
      console.error('Error obteniendo paquetes:', packagesError)
      return NextResponse.json({ 
        error: 'Error al obtener paquetes',
        details: packagesError.message
      }, { status: 500 })
    }

    if (!packages || packages.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron paquetes válidos'
      }, { status: 404 })
    }

    console.log(`Procesando ${packages.length} paquetes para alertas masivas`)

    // Calcular días de atraso y crear notificaciones
    const notifications = []
    const hoy = new Date()

    for (const pkg of packages) {
      const fechaEntrega = new Date(pkg.fecha_entrega)
      const diasAtraso = Math.floor((hoy.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))

      const titulo = 'Paquete Atrasado - Priorizar'
      const mensaje = `El paquete ${pkg.tracking} está atrasado ${diasAtraso} días desde su fecha de entrega programada (${pkg.fecha_entrega}). Por favor, prioriza su entrega.${
        pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' && pkg.valor 
          ? ` Valor: $${pkg.valor.toLocaleString('es-CO')}`
          : ''
      }`

      notifications.push({
        conductor_id: pkg.conductor.id,
        user_id: userId,
        tipo: 'alerta_atraso',
        titulo: titulo,
        mensaje: mensaje,
        package_id: pkg.id,
        leida: false
      })
    }

    console.log(`Insertando ${notifications.length} notificaciones`)

    // Insertar todas las notificaciones de una vez
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (insertError) {
      console.error('Error insertando notificaciones:', insertError)
      return NextResponse.json({ 
        error: 'Error al crear las notificaciones',
        details: insertError.message
      }, { status: 500 })
    }

    console.log('✅ Notificaciones masivas creadas exitosamente')

    // Agrupar estadísticas por conductor
    const conductorStats = packages.reduce((acc, pkg) => {
      const conductorId = pkg.conductor.id
      if (!acc[conductorId]) {
        acc[conductorId] = {
          conductor_id: conductorId,
          conductor_nombre: pkg.conductor.nombre,
          total_alertas: 0,
          paquetes: []
        }
      }
      
      acc[conductorId].total_alertas++
      acc[conductorId].paquetes.push({
        tracking: pkg.tracking,
        tipo: pkg.tipo,
        fecha_entrega: pkg.fecha_entrega,
        valor: pkg.valor
      })
      
      return acc
    }, {} as any)

    const response = {
      success: true,
      total_notifications: insertedNotifications?.length || 0,
      total_packages: packages.length,
      total_conductors: Object.keys(conductorStats).length,
      conductor_stats: Object.values(conductorStats),
      created_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in send bulk alerts API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

