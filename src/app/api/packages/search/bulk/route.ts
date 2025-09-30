import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG BULK SEARCH ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para buscar paquetes'
      }, { status: 401 })
    }

    const body = await request.json()
    const { trackings } = body

    if (!trackings || !Array.isArray(trackings) || trackings.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de trackings requerida',
        details: 'Debe proporcionar una lista de números de tracking'
      }, { status: 400 })
    }

    // Limpiar y filtrar trackings válidos
    const cleanTrackings = trackings
      .map(t => t.toString().trim())
      .filter(t => t.length > 0)

    if (cleanTrackings.length === 0) {
      return NextResponse.json({ 
        error: 'No se encontraron trackings válidos',
        details: 'Todos los trackings están vacíos o son inválidos'
      }, { status: 400 })
    }

    console.log('Buscando paquetes para trackings:', cleanTrackings)

    // Buscar paquetes por tracking
    const { data: packages, error } = await supabase
      .from('packages')
      .select(`
        id,
        tracking,
        tipo,
        estado,
        fecha_entrega,
        fecha_entrega_cliente,
        valor,
        created_at,
        updated_at,
        conductor:conductors(
          id,
          nombre,
          zona,
          telefono,
          email
        )
      `)
      .in('tracking', cleanTrackings)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error buscando paquetes:', error)
      return NextResponse.json({ 
        error: 'Error al buscar paquetes',
        details: error.message
      }, { status: 500 })
    }

    // Calcular estadísticas
    const stats = {
      total_buscados: cleanTrackings.length,
      total_encontrados: packages?.length || 0,
      no_encontrados: cleanTrackings.length - (packages?.length || 0),
      entregados: packages?.filter(p => p.estado === 1).length || 0,
      pendientes: packages?.filter(p => p.estado === 0).length || 0,
      devueltos: packages?.filter(p => p.estado === 2).length || 0,
      valor_total_cod: packages?.filter(p => 
        (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.valor
      ).reduce((sum, p) => sum + (p.valor || 0), 0) || 0
    }

    // Identificar trackings no encontrados
    const foundTrackings = packages?.map(p => p.tracking) || []
    const notFoundTrackings = cleanTrackings.filter(t => !foundTrackings.includes(t))

    // Añadir información adicional a cada paquete
    const packagesWithDetails = packages?.map(pkg => {
      const fechaEntrega = new Date(pkg.fecha_entrega)
      const hoy = new Date()
      const diasAtraso = pkg.estado === 0 ? 
        Math.floor((hoy.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24)) : 0

      return {
        ...pkg,
        dias_atraso: diasAtraso,
        estado_texto: pkg.estado === 0 ? 'Pendiente' : 
                     pkg.estado === 1 ? 'Entregado' : 'Devuelto',
        tipo_texto: pkg.tipo === 'Paquetes Pagos' || pkg.tipo === 'Shein/Temu' ? 'Paquetes Pagos' :
                   pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' || pkg.tipo === 'Dropi' ? 'Paquetes COD' :
                   pkg.tipo,
        fecha_entrega_formateada: fechaEntrega.toLocaleDateString('es-CO'),
        fecha_entrega_cliente_formateada: pkg.fecha_entrega_cliente ? 
          new Date(pkg.fecha_entrega_cliente).toLocaleDateString('es-CO') : null,
        valor_formateado: pkg.valor ? 
          pkg.valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : null
      }
    }) || []

    console.log('Resultados de búsqueda masiva:', {
      total_buscados: stats.total_buscados,
      total_encontrados: stats.total_encontrados,
      no_encontrados: stats.no_encontrados
    })

    return NextResponse.json({
      success: true,
      packages: packagesWithDetails,
      stats,
      not_found_trackings: notFoundTrackings,
      search_summary: {
        searched: cleanTrackings,
        found: foundTrackings,
        not_found: notFoundTrackings
      }
    })

  } catch (error) {
    console.error('Error en búsqueda masiva:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

