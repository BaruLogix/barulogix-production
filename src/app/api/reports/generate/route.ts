import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG REPORTS GENERATE ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para generar reportes'
      }, { status: 401 })
    }

    const body = await request.json()
    const { tipo_reporte, fecha_inicio, fecha_fin, conductor_id } = body

    console.log('Parámetros recibidos:', { tipo_reporte, fecha_inicio, fecha_fin, conductor_id })

    if (!tipo_reporte || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tipo_reporte, fecha_inicio, fecha_fin' 
      }, { status: 400 })
    }

    // Obtener conductores del usuario
    const { data: conductors, error: conductorsError } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', userId)

    if (conductorsError) {
      console.error('Error obteniendo conductores:', conductorsError)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    console.log('Conductores encontrados:', conductors?.length || 0)

    // Obtener paquetes en el rango de fechas
    let packagesQuery = supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors!inner(id, nombre, zona, user_id)
      `)
      .eq('conductor.user_id', userId)
      .gte('fecha_entrega', fecha_inicio)
      .lte('fecha_entrega', fecha_fin)

    // Si es reporte específico, filtrar por conductor
    if (tipo_reporte === 'especifico' && conductor_id) {
      packagesQuery = packagesQuery.eq('conductor_id', conductor_id)
    }

    const { data: packages, error: packagesError } = await packagesQuery

    if (packagesError) {
      console.error('Error obteniendo paquetes:', packagesError)
      return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
    }

    console.log('Paquetes encontrados:', packages?.length || 0)

    // Calcular estadísticas generales
    const totalPackages = packages?.length || 0
    const entregados = packages?.filter(p => p.estado === 1).length || 0
    const noEntregados = packages?.filter(p => p.estado === 0).length || 0
    const devueltos = packages?.filter(p => p.estado === 2).length || 0
    const valorTotalDropi = packages?.filter(p => p.tipo === 'Dropi' && p.valor)
      .reduce((sum, p) => sum + (p.valor || 0), 0) || 0

    // Estadísticas por conductor
    const conductorStats = conductors?.map(conductor => {
      const conductorPackages = packages?.filter(p => p.conductor_id === conductor.id) || []
      const conductorShein = conductorPackages.filter(p => p.tipo === 'Shein/Temu')
      const conductorDropi = conductorPackages.filter(p => p.tipo === 'Dropi')
      const conductorEntregados = conductorPackages.filter(p => p.estado === 1).length
      const conductorNoEntregados = conductorPackages.filter(p => p.estado === 0).length
      const conductorDevueltos = conductorPackages.filter(p => p.estado === 2).length
      const conductorValorDropi = conductorDropi
        .filter(p => p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0)

      // Calcular días promedio de atraso
      const paquetesPendientes = conductorPackages.filter(p => p.estado === 0)
      let diasPromedioAtraso = 0
      if (paquetesPendientes.length > 0) {
        const totalDiasAtraso = paquetesPendientes.reduce((sum, p) => {
          const fechaEntrega = new Date(p.fecha_entrega)
          const hoy = new Date()
          const diasAtraso = Math.floor((hoy.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))
          return sum + Math.max(0, diasAtraso)
        }, 0)
        diasPromedioAtraso = Math.round(totalDiasAtraso / paquetesPendientes.length)
      }

      return {
        conductor: {
          id: conductor.id,
          nombre: conductor.nombre,
          zona: conductor.zona
        },
        stats: {
          total_packages: conductorPackages.length,
          shein_temu_count: conductorShein.length,
          dropi_count: conductorDropi.length,
          entregados: conductorEntregados,
          no_entregados: conductorNoEntregados,
          devueltos: conductorDevueltos,
          valor_total_dropi: conductorValorDropi,
          dias_promedio_atraso: diasPromedioAtraso
        }
      }
    }) || []

    // Estructura de respuesta para el frontend
    const reportData = {
      general_stats: {
        total_conductors: conductors?.length || 0,
        active_conductors: conductors?.filter(c => c.activo).length || 0,
        total_packages: totalPackages,
        entregados: entregados,
        no_entregados: noEntregados,
        devueltos: devueltos,
        valor_total_dropi: valorTotalDropi
      },
      conductor_stats: conductorStats,
      packages: packages?.map(p => ({
        id: p.id,
        tracking: p.tracking,
        tipo: p.tipo,
        estado: p.estado,
        fecha_entrega: p.fecha_entrega,
        valor: p.valor || 0,
        conductor_id: p.conductor_id,
        conductor: p.conductor
      })) || [],
      metadata: {
        tipo_reporte,
        fecha_inicio,
        fecha_fin,
        conductor_id,
        generated_at: new Date().toISOString()
      }
    }

    console.log('Estadísticas calculadas:', reportData.general_stats)
    console.log('Conductores con estadísticas:', reportData.conductor_stats.length)

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

