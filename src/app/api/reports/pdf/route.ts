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
        details: 'Debe estar logueado para generar reportes PDF'
      }, { status: 401 })
    }

    const body = await request.json()
    const { 
      type = 'general', 
      conductor_id = null, 
      fecha_desde = null, 
      fecha_hasta = null 
    } = body

    // Obtener conductores del usuario
    const { data: userConductors, error: conductorsError } = await supabase
      .from('conductors')
      .select('id, nombre, zona, activo')
      .eq('user_id', userId)

    if (conductorsError) {
      return NextResponse.json({ 
        error: 'Error obteniendo conductores del usuario' 
      }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)

    // Construir query base para paquetes
    let packagesQuery = supabase
      .from('packages')
      .select(`
        id,
        tracking,
        tipo,
        estado,
        fecha_entrega,
        valor,
        created_at,
        conductor:conductors(id, nombre, zona)
      `)
      .in('conductor_id', conductorIds)

    // Aplicar filtros de fecha si se proporcionan
    if (fecha_desde) {
      packagesQuery = packagesQuery.gte('fecha_entrega', fecha_desde)
    }
    if (fecha_hasta) {
      packagesQuery = packagesQuery.lte('fecha_entrega', fecha_hasta)
    }

    // Aplicar filtro de conductor específico si se proporciona
    if (type === 'specific' && conductor_id) {
      packagesQuery = packagesQuery.eq('conductor_id', conductor_id)
    }

    const { data: packages, error: packagesError } = await packagesQuery

    if (packagesError) {
      return NextResponse.json({ 
        error: 'Error obteniendo paquetes' 
      }, { status: 500 })
    }

    // Calcular estadísticas generales
    const totalPackages = packages.length
    const entregados = packages.filter(p => p.estado === 1).length
    const noEntregados = packages.filter(p => p.estado === 0).length
    const devueltos = packages.filter(p => p.estado === 2).length
    const valorTotalDropi = packages
      .filter(p => p.tipo === 'Dropi' && p.valor)
      .reduce((sum, p) => sum + (p.valor || 0), 0)

    // Calcular estadísticas por conductor
    const conductorStats = userConductors.map(conductor => {
      const conductorPackages = packages.filter(p => p.conductor?.id === conductor.id)
      const conductorEntregados = conductorPackages.filter(p => p.estado === 1).length
      const conductorNoEntregados = conductorPackages.filter(p => p.estado === 0).length
      const conductorDevueltos = conductorPackages.filter(p => p.estado === 2).length
      const conductorValorDropi = conductorPackages
        .filter(p => p.tipo === 'Dropi' && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0)

      return {
        conductor,
        stats: {
          total_packages: conductorPackages.length,
          shein_temu_count: conductorPackages.filter(p => p.tipo === 'Shein/Temu').length,
          dropi_count: conductorPackages.filter(p => p.tipo === 'Dropi').length,
          entregados: conductorEntregados,
          no_entregados: conductorNoEntregados,
          devueltos: conductorDevueltos,
          valor_total_dropi: conductorValorDropi
        }
      }
    })

    // Generar contenido del reporte
    const reportData = {
      metadata: {
        generated_at: new Date().toISOString(),
        user_id: userId,
        type,
        conductor_id,
        fecha_desde,
        fecha_hasta
      },
      general_stats: {
        total_conductors: userConductors.length,
        active_conductors: userConductors.filter(c => c.activo).length,
        total_packages: totalPackages,
        entregados,
        no_entregados: noEntregados,
        devueltos,
        valor_total_dropi: valorTotalDropi
      },
      conductor_stats: conductorStats,
      packages: packages.map(p => ({
        tracking: p.tracking,
        conductor: p.conductor?.nombre || 'N/A',
        zona: p.conductor?.zona || 'N/A',
        tipo: p.tipo,
        estado: p.estado === 0 ? 'No Entregado' : p.estado === 1 ? 'Entregado' : 'Devuelto',
        fecha_entrega: p.fecha_entrega,
        valor: p.valor || 0,
        created_at: p.created_at
      }))
    }

    return NextResponse.json({
      success: true,
      report_data: reportData,
      download_url: null // Se generará en el frontend
    })

  } catch (error) {
    console.error('Error in PDF generation:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

