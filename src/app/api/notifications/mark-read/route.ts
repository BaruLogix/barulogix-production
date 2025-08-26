import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notification_id, conductor_id } = body

    console.log('=== DEBUG MARK READ API ===')
    console.log('Datos recibidos:', { notification_id, conductor_id })

    if (!notification_id) {
      return NextResponse.json({ 
        error: 'ID de notificación requerido'
      }, { status: 400 })
    }

    // Construir query base
    let updateQuery = supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', notification_id)

    // Si se proporciona conductor_id, verificar que la notificación le pertenece
    if (conductor_id) {
      updateQuery = updateQuery.eq('conductor_id', conductor_id)
    }

    const { data: updatedNotification, error: updateError } = await updateQuery
      .select()
      .single()

    if (updateError) {
      console.error('Error marcando notificación como leída:', updateError)
      
      // Si no se encontró la notificación
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Notificación no encontrada o no pertenece al conductor'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Error al marcar notificación como leída',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Notificación marcada como leída:', notification_id)

    const response = {
      success: true,
      notification_id: notification_id,
      marked_read_at: updatedNotification.updated_at
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in mark read API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// También permitir marcar múltiples notificaciones como leídas
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { notification_ids, conductor_id, mark_all } = body

    console.log('=== DEBUG MARK MULTIPLE READ API ===')
    console.log('Datos recibidos:', { 
      notification_ids: notification_ids?.length || 0, 
      conductor_id, 
      mark_all 
    })

    if (!conductor_id) {
      return NextResponse.json({ 
        error: 'ID de conductor requerido'
      }, { status: 400 })
    }

    let updateQuery = supabase
      .from('notifications')
      .update({ 
        is_read: true,
        updated_at: new Date().toISOString()
      })
      .eq('conductor_id', conductor_id)
      .eq('is_read', false) // Solo marcar las que no están leídas

    if (mark_all) {
      // Marcar todas las notificaciones no leídas del conductor
      console.log('Marcando todas las notificaciones como leídas')
    } else if (notification_ids && Array.isArray(notification_ids) && notification_ids.length > 0) {
      // Marcar solo las notificaciones especificadas
      updateQuery = updateQuery.in('id', notification_ids)
      console.log(`Marcando ${notification_ids.length} notificaciones específicas`)
    } else {
      return NextResponse.json({ 
        error: 'Debe especificar notification_ids o mark_all=true'
      }, { status: 400 })
    }

    const { data: updatedNotifications, error: updateError } = await updateQuery
      .select('id')

    if (updateError) {
      console.error('Error marcando notificaciones como leídas:', updateError)
      return NextResponse.json({ 
        error: 'Error al marcar notificaciones como leídas',
        details: updateError.message
      }, { status: 500 })
    }

    const updatedCount = updatedNotifications?.length || 0
    console.log(`✅ ${updatedCount} notificaciones marcadas como leídas`)

    const response = {
      success: true,
      updated_count: updatedCount,
      conductor_id: conductor_id,
      marked_read_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in mark multiple read API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

