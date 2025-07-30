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

    // Función para obtener TODOS los paquetes con paginación automática
    const getAllPackages = async (userId: string, fecha_inicio: string, fecha_fin: string, conductor_id?: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      console.log('🔄 Iniciando obtención de TODOS los paquetes para reportes...')

      while (hasMore) {
        console.log(`📦 Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        let packagesQuery = supabase
          .from('packages')
          .select(`
            *,
            conductor:conductors!inner(id, nombre, zona, user_id)
          `)
          .eq('conductor.user_id', userId)
          .gte('created_at', fecha_inicio)
          .lte('created_at', fecha_fin + 'T23:59:59.999Z')
          .range(from, from + pageSize - 1)

        // Si es reporte específico, filtrar por conductor
        if (conductor_id) {
          packagesQuery = packagesQuery.eq('conductor_id', conductor_id)
        }

        const { data: packages, error } = await packagesQuery

        if (error) {
          console.error('❌ Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`✅ Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
          // Si obtuvimos menos de pageSize, ya no hay más páginas
          if (packages.length < pageSize) {
            hasMore = false
          } else {
            from += pageSize
          }
        } else {
          hasMore = false
        }
      }

      console.log(`🎯 TOTAL FINAL de paquetes obtenidos para reportes: ${allPackages.length}`)
      return allPackages
    }

    console.log('Query de paquetes:', {
      userId,
      fecha_inicio,
      fecha_fin: fecha_fin + 'T23:59:59.999Z',
      tipo_reporte,
      conductor_id
    })

    // Obtener TODOS los paquetes usando paginación automática
    const packages = await getAllPackages(userId, fecha_inicio, fecha_fin, tipo_reporte === 'especifico' ? conductor_id : undefined)

    console.log('Paquetes encontrados:', packages?.length || 0)

    // Calcular estadísticas
    let totalPackages, entregados, noEntregados, devueltos, valorTotalDropi;
    
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
    
    // Si es reporte específico, usar solo las estadísticas del conductor seleccionado
    if (tipo_reporte === 'especifico' && conductor_id) {
      const selectedConductorStat = conductorStats.find(stat => stat.conductor.id === conductor_id);
      
      if (selectedConductorStat) {
        totalPackages = selectedConductorStat.stats.total_packages;
        entregados = selectedConductorStat.stats.entregados;
        noEntregados = selectedConductorStat.stats.no_entregados;
        devueltos = selectedConductorStat.stats.devueltos;
        valorTotalDropi = selectedConductorStat.stats.valor_total_dropi;
      } else {
        // Si no se encuentra el conductor, usar valores por defecto
        totalPackages = 0;
        entregados = 0;
        noEntregados = 0;
        devueltos = 0;
        valorTotalDropi = 0;
      }
    } else {
      // Para reportes generales, calcular totales de todos los paquetes
      totalPackages = packages?.length || 0;
      entregados = packages?.filter(p => p.estado === 1).length || 0;
      noEntregados = packages?.filter(p => p.estado === 0).length || 0;
      devueltos = packages?.filter(p => p.estado === 2).length || 0;
      valorTotalDropi = packages?.filter(p => p.tipo === 'Dropi' && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0) || 0;
    }

    // Estructura de respuesta para el frontend
    const reportData = {
      general_stats: {
        total_conductors: tipo_reporte === 'especifico' && conductor_id ? 1 : (conductors?.length || 0),
        active_conductors: tipo_reporte === 'especifico' && conductor_id ? 1 : (conductors?.filter(c => c.activo).length || 0),
        total_packages: totalPackages,
        entregados: entregados,
        no_entregados: noEntregados,
        devueltos: devueltos,
        valor_total_dropi: valorTotalDropi
      },
      conductor_stats: tipo_reporte === 'especifico' && conductor_id 
        ? conductorStats.filter(stat => stat.conductor.id === conductor_id)
        : conductorStats,
      packages: packages?.map(p => ({
        id: p.id,
        tracking: p.tracking,
        tipo: p.tipo,
        estado: p.estado,
        fecha_entrega: p.fecha_entrega,
        fecha_entrega_cliente: p.fecha_entrega_cliente,
        valor: p.valor,
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

