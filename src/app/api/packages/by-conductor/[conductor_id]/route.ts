import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { conductor_id: string } }
) {
  try {
    // Obtener parámetros de filtro
    const { searchParams } = new URL(request.url)
    const filterType = searchParams.get('filterType') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const lastDays = searchParams.get('lastDays')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    console.log('=== DEBUG PACKAGES BY CONDUCTOR ===')
    console.log('Conductor ID:', params.conductor_id)
    console.log('Filter Type:', filterType)

    // Verificar que el conductor existe
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('*')
      .eq('id', params.conductor_id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    console.log('Conductor encontrado:', conductor.nombre)

    // Función para obtener TODOS los paquetes con paginación automática (COPIADA DEL DASHBOARD)
    const getAllPackages = async (conductorId: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`[CONDUCTOR ANALYSIS] Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await supabase
          .from('packages')
          .select('*')
          .eq('conductor_id', conductorId)
          .order('fecha_entrega', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('[CONDUCTOR ANALYSIS] Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`[CONDUCTOR ANALYSIS] Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
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

      console.log(`[CONDUCTOR ANALYSIS] TOTAL FINAL de paquetes obtenidos: ${allPackages.length}`)
      return allPackages
    }

    // Obtener TODOS los paquetes usando paginación automática
    let packages = await getAllPackages(params.conductor_id)

    // Aplicar filtros temporales en memoria
    const now = new Date()

    switch (filterType) {
      case 'range':
        if (startDate && endDate) {
          packages = packages.filter(p => 
            p.fecha_entrega >= startDate && p.fecha_entrega <= endDate
          )
        }
        break
      
      case 'lastDays':
        if (lastDays) {
          const daysAgo = new Date()
          daysAgo.setDate(now.getDate() - parseInt(lastDays))
          const dateStr = daysAgo.toISOString().split('T')[0]
          packages = packages.filter(p => p.fecha_entrega >= dateStr)
        }
        break
      
      case 'month':
        if (month && year) {
          const targetYear = parseInt(year)
          const targetMonth = parseInt(month)
          const monthStart = new Date(targetYear, targetMonth - 1, 1)
          const monthEnd = new Date(targetYear, targetMonth, 0)
          const startStr = monthStart.toISOString().split('T')[0]
          const endStr = monthEnd.toISOString().split('T')[0]
          packages = packages.filter(p => 
            p.fecha_entrega >= startStr && p.fecha_entrega <= endStr
          )
        }
        break
      
      case 'all':
      default:
        // Sin filtro de fecha
        break
    }

    console.log('Paquetes encontrados:', packages?.length || 0)

    // Separar paquetes por tipo (incluyendo tipos antiguos y nuevos)
    const paquetes_shein = packages.filter(p => p.tipo === 'Shein/Temu' || p.tipo === 'Paquetes Pagos')
    const paquetes_dropi = packages.filter(p => p.tipo === 'Dropi' || p.tipo === 'Paquetes Pago Contra Entrega (COD)')

    // Debug: mostrar tipos encontrados
    const tiposCounts = packages.reduce((acc, p) => {
      acc[p.tipo] = (acc[p.tipo] || 0) + 1;
      return acc;
    }, {});
    console.log('Tipos de paquetes encontrados:', tiposCounts);

    // Calcular estadísticas
    const stats = {
      total_paquetes: packages.length,
      
      // Shein/Temu
      shein_total: paquetes_shein.length,
      shein_entregados: paquetes_shein.filter(p => p.estado === 1).length,
      shein_no_entregados: paquetes_shein.filter(p => p.estado === 0).length,
      shein_devueltos: paquetes_shein.filter(p => p.estado === 2).length,
      
      // Dropi
      dropi_total: paquetes_dropi.length,
      dropi_entregados: paquetes_dropi.filter(p => p.estado === 1).length,
      dropi_no_entregados: paquetes_dropi.filter(p => p.estado === 0).length,
      dropi_devueltos: paquetes_dropi.filter(p => p.estado === 2).length,
      
      // Valores Dropi
      dropi_valor_total: paquetes_dropi
        .filter(p => p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      
      dropi_valor_entregado: paquetes_dropi
        .filter(p => p.estado === 1 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      
      dropi_valor_pendiente: paquetes_dropi
        .filter(p => p.estado !== 1 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      
      dropi_valor_devuelto: paquetes_dropi
        .filter(p => p.estado === 2 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      
      reset_automatico: false
    }

    // Paquetes no entregados con días de atraso
    stats.paquetes_atrasados = packages
      .filter(p => p.estado === 0)
      .map(p => ({
        ...p,
        dias_atraso: Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
      }))
      .sort((a, b) => b.dias_atraso - a.dias_atraso)

    // Agregar días de atraso a todos los paquetes
    const packagesWithDays = packages.map(p => ({
      ...p,
      dias_atraso: p.estado === 0 ? Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }))

    return NextResponse.json({ 
      packages: packagesWithDays, 
      stats,
      conductor: conductor,
      paquetes_shein,
      paquetes_dropi
    })
  } catch (error) {
    console.error('Error in conductor packages GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

