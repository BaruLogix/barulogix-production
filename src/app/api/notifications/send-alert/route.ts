import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG SEND ALERT API ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para enviar alertas'
      }, { status: 401 })
    }

    const body = await request.json()
    const { package_id, conductor_id, dias_atraso } = body

    console.log('Datos recibidos:', { package_id, conductor_id, dias_atraso })

    if (!package_id || !conductor_id || !dias_atraso) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos',
        details: 'package_id, conductor_id y dias_atraso son obligatorios'
      }, { status: 400 })
    }

    // Verificar que el paquete existe y pertenece al usuario
    const { data: packageData, error: packageError } = await supabase
      .from('packages')
      .select(`
        id,
        tracking,
        tipo,
        fecha_entrega,
        valor,
        conductor:conductors!inner(id, nombre, user_id)
      `)
      .eq('id', package_id)
      .eq('conductor.user_id', userId)
      .single()

    if (packageError || !packageData) {
      console.error('Error obteniendo paquete:', packageError)
      return NextResponse.json({ 
        error: 'Paquete no encontrado o no pertenece a su bodega'
      }, { status: 404 })
    }

    // Verificar que el conductor coincide
    if (packageData.conductor.id !== conductor_id) {
      return NextResponse.json({ 
        error: 'El conductor no coincide con el paquete'
      }, { status: 400 })
    }

    // Crear el mensaje de alerta
    const titulo = 'Paquete Atrasado - Priorizar'
    const mensaje = `El paquete ${packageData.tracking} está atrasado ${dias_atraso} días desde su fecha de entrega programada (${packageData.fecha_entrega}). Por favor, prioriza su entrega.${
      packageData.tipo === 'Paquetes Pago Contra Entrega (COD)' && packageData.valor 
        ? ` Valor: $${packageData.valor.toLocaleString('es-CO')}`
        : ''
    }`

    console.log('Creando notificación:', { titulo, mensaje })

    // Insertar la notificación en la base de datos
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        conductor_id: conductor_id,
        user_id: userId,
        tipo: 'alerta_atraso',
        titulo: titulo,
        mensaje: mensaje,
        package_id: package_id,
        leida: false
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Error creando notificación:', notificationError)
      return NextResponse.json({ 
        error: 'Error al crear la notificación',
        details: notificationError.message
      }, { status: 500 })
    }

    console.log('✅ Notificación creada exitosamente:', notification.id)

    const response = {
      success: true,
      notification_id: notification.id,
      conductor_nombre: packageData.conductor.nombre,
      package_tracking: packageData.tracking,
      dias_atraso: dias_atraso,
      mensaje: mensaje,
      created_at: notification.created_at
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in send alert API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

