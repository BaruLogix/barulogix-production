import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG SEND CUSTOM MESSAGE API ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para enviar mensajes personalizados'
      }, { status: 401 })
    }

    const body = await request.json()
    const { mensaje, conductor_ids, send_to_all } = body

    console.log('Datos recibidos:', { 
      mensaje: mensaje?.substring(0, 50) + '...', 
      conductor_ids: conductor_ids?.length || 0,
      send_to_all 
    })

    if (!mensaje || mensaje.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Mensaje requerido',
        details: 'El mensaje no puede estar vacío'
      }, { status: 400 })
    }

    if (!send_to_all && (!conductor_ids || !Array.isArray(conductor_ids) || conductor_ids.length === 0)) {
      return NextResponse.json({ 
        error: 'Conductores requeridos',
        details: 'Debe seleccionar al menos un conductor o enviar a todos'
      }, { status: 400 })
    }

    let targetConductors = []

    if (send_to_all) {
      // Obtener todos los conductores activos del usuario
      const { data: allConductors, error: conductorsError } = await supabase
        .from('conductors')
        .select('id, nombre, zona')
        .eq('user_id', userId)
        .eq('activo', true)

      if (conductorsError) {
        console.error('Error obteniendo conductores:', conductorsError)
        return NextResponse.json({ 
          error: 'Error al obtener conductores',
          details: conductorsError.message
        }, { status: 500 })
      }

      targetConductors = allConductors || []
      console.log(`Enviando a todos los conductores: ${targetConductors.length}`)
    } else {
      // Verificar que los conductores seleccionados pertenecen al usuario
      const { data: selectedConductors, error: conductorsError } = await supabase
        .from('conductors')
        .select('id, nombre, zona')
        .in('id', conductor_ids)
        .eq('user_id', userId)
        .eq('activo', true)

      if (conductorsError) {
        console.error('Error obteniendo conductores seleccionados:', conductorsError)
        return NextResponse.json({ 
          error: 'Error al obtener conductores seleccionados',
          details: conductorsError.message
        }, { status: 500 })
      }

      targetConductors = selectedConductors || []
      console.log(`Enviando a conductores seleccionados: ${targetConductors.length}`)

      // Verificar que todos los conductores solicitados fueron encontrados
      if (targetConductors.length !== conductor_ids.length) {
        return NextResponse.json({ 
          error: 'Algunos conductores no fueron encontrados o no pertenecen a su bodega'
        }, { status: 400 })
      }
    }

    if (targetConductors.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron conductores válidos'
      }, { status: 404 })
    }

    // Crear las notificaciones para cada conductor
    const titulo = 'Mensaje de Bodega'
    const notifications = targetConductors.map(conductor => ({
      conductor_id: conductor.id,
      user_id: userId,
      tipo: 'mensaje_personalizado',
      message: mensaje.trim(),
      is_read: false
    }))

    console.log(`Insertando ${notifications.length} notificaciones personalizadas`);
    console.log("Objeto de notificaciones a insertar:", JSON.stringify(notifications, null, 2));

    // Insertar todas las notificaciones
    const { data: insertedNotifications, error: insertError } = await supabase
      .from("notifications")
      .insert(notifications)
      .select()

    if (insertError) {
      console.error("Error insertando notificaciones personalizadas:", insertError);
      console.error("Detalles del error:", insertError.details);
      console.error("Sugerencia del error:", insertError.hint);
      return NextResponse.json({ 
        error: "Error al crear las notificaciones",
        details: insertError.message
      }, { status: 500 });
    }

    console.log('✅ Mensajes personalizados enviados exitosamente')

    const response = {
      success: true,
      total_notifications: insertedNotifications?.length || 0,
      total_conductors: targetConductors.length,
      send_to_all: send_to_all,
      conductors: targetConductors.map(c => ({
        id: c.id,
        nombre: c.nombre,
        zona: c.zona
      })),
      mensaje: mensaje.trim(),
      created_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in send custom message API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

