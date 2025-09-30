import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conductorId = params.id
    const { searchParams } = new URL(request.url)
    
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unread_only = searchParams.get('unread_only') === 'true'

    console.log('=== DEBUG CONDUCTOR NOTIFICATIONS API ===')
    console.log('Conductor ID:', conductorId)
    console.log('Parámetros:', { limit, offset, unread_only })

    if (!conductorId) {
      return NextResponse.json({ 
        error: 'ID de conductor no proporcionado'
      }, { status: 400 })
    }

    // Verificar que el conductor existe
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, nombre, zona, activo')
      .eq('id', conductorId)
      .single()

    if (conductorError || !conductor) {
      console.error('Error obteniendo conductor:', conductorError)
      return NextResponse.json({ 
        error: 'Conductor no encontrado'
      }, { status: 404 })
    }

    if (!conductor.activo) {
      return NextResponse.json({ 
        error: 'Conductor inactivo'
      }, { status: 403 })
    }

    // Construir query base
    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        message,
        package_id,
        is_read,
        created_at,
        package:packages(tracking, tipo, valor)
      `)
      .eq('conductor_id', conductorId)
      .order('created_at', { ascending: false })

    // Aplicar filtro de no leídas si se solicita
    if (unread_only) {
      query = query.eq("is_read", false);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error("Error obteniendo notificaciones:", notificationsError);
      console.error("Detalles del error:", notificationsError.details);
      console.error("Sugerencia del error:", notificationsError.hint);
      return NextResponse.json({ 
        error: "Error al obtener notificaciones",
        details: notificationsError.message
      }, { status: 500 });
    }

    // Obtener conteo total de notificaciones
    let totalQuery = supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("conductor_id", conductorId);

    if (unread_only) {
      totalQuery = totalQuery.eq("is_read", false);
    }

    const { count: totalCount, error: countError } = await totalQuery;

    if (countError) {
      console.error("Error obteniendo conteo:", countError);
    }

    // Obtener conteo de no leídas (siempre)
    const { count: unreadCount, error: unreadError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("conductor_id", conductorId)
      .eq("is_read", false);

    if (unreadError) {
      console.error("Error obteniendo conteo de no leídas:", unreadError);
    }

    // Formatear notificaciones con información adicional
    const formattedNotifications = (notifications || []).map(notification => {
      const createdAt = new Date(notification.created_at);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60));
      
      let timeAgo = "";
      if (diffHours < 1) {
        const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
        timeAgo = diffMinutes <= 1 ? "Hace un momento" : `Hace ${diffMinutes} minutos`;
      } else if (diffHours < 24) {
        timeAgo = diffHours === 1 ? "Hace 1 hora" : `Hace ${diffHours} horas`;
      } else {
        const diffDays = Math.floor(diffHours / 24);
        timeAgo = diffDays === 1 ? "Hace 1 día" : `Hace ${diffDays} días`;
      }

      return {
        ...notification,        type: notification.type, // Mapear 'type' a 'tipo' para compatibilidad con el frontend
        titulo: notification.type === 'alerta_atraso' ? 'Alerta de Paquete Atrasado' : 'Mensaje Personalizado', // Definir título basado en el tipo
        mensaje: notification.message, // Mapear 'message' a 'mensaje'
        leida: notification.is_read, // Mapear 'is_read' a 'leida'
        time_ago: timeAgo,
        formatted_date: createdAt.toLocaleDateString("es-CO", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Bogota"
        })
      };
    });

    console.log(`✅ Obtenidas ${formattedNotifications.length} notificaciones para conductor ${conductor.nombre}`)

    const response = {
      conductor: {
        id: conductor.id,
        nombre: conductor.nombre,
        zona: conductor.zona
      },
      notifications: formattedNotifications,
      pagination: {
        total: totalCount || 0,
        unread: unreadCount || 0,
        limit: limit,
        offset: offset,
        has_more: (totalCount || 0) > (offset + limit)
      },
      filters: {
        unread_only: unread_only
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in conductor notifications API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

