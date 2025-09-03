import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener estadísticas del conductor con filtros temporales
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conductorId = params.id
    const { searchParams } = new URL(request.url)
    
    // Parámetros de filtro temporal
    const filterType = searchParams.get('filterType') || 'all' // all, range, lastDays, month
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const lastDays = searchParams.get('lastDays')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    console.log('=== DEBUG CONDUCTOR STATS API ===')
    console.log('Conductor ID:', conductorId)
    console.log('Filter Type:', filterType)
    console.log('Date Range:', { startDate, endDate, lastDays, month, year })

    if (!conductorId) {
      return NextResponse.json({ 
        error: 'ID de conductor no proporcionado'
      }, { status: 400 })
    }

    // Verificar que el conductor existe y está activo
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, nombre, activo')
      .eq('id', conductorId)
      .eq('activo', true)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ 
        error: 'Conductor no encontrado o inactivo'
      }, { status: 404 })
    }

    // Función para obtener TODOS los paquetes con paginación automática (COPIADA DEL DASHBOARD)
    const getAllPackages = async (conductorId: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`[CONDUCTOR STATS] Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await supabase
          .from('packages')
          .select('*')
          .eq('conductor_id', conductorId)
          .order('fecha_entrega', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('[CONDUCTOR STATS] Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`[CONDUCTOR STATS] Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
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

      console.log(`[CONDUCTOR STATS] TOTAL FINAL de paquetes obtenidos: ${allPackages.length}`)
      
      // Debug: verificar tipos de paquetes
      const tiposCounts = allPackages.reduce((acc, p) => {
        acc[p.tipo] = (acc[p.tipo] || 0) + 1;
        return acc;
      }, {});
      console.log(`[CONDUCTOR STATS] Tipos de paquetes encontrados:`, tiposCounts);
      
      return allPackages
    }

    // Obtener TODOS los paquetes usando paginación automática
    let allPackages = await getAllPackages(conductorId)

    // Aplicar filtros temporales en memoria
    switch (filterType) {
      case 'range':
        if (startDate && endDate) {
          allPackages = allPackages.filter(p => 
            p.fecha_entrega >= startDate && p.fecha_entrega <= endDate
          )
        }
        break
      
      case 'lastDays':
        if (lastDays) {
          const days = parseInt(lastDays)
          if (days > 0 && days <= 30) {
            const startDateCalc = new Date()
            startDateCalc.setDate(startDateCalc.getDate() - days)
            const startDateStr = startDateCalc.toISOString().split('T')[0]
            allPackages = allPackages.filter(p => p.fecha_entrega >= startDateStr)
          }
        }
        break
      
      case 'month':
        if (month && year) {
          const monthNum = parseInt(month)
          const yearNum = parseInt(year)
          const startOfMonth = new Date(yearNum, monthNum - 1, 1)
          const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59)
          const startDateStr = startOfMonth.toISOString().split('T')[0]
          const endDateStr = endOfMonth.toISOString().split('T')[0]
          allPackages = allPackages.filter(p => 
            p.fecha_entrega >= startDateStr && p.fecha_entrega <= endDateStr
          )
        }
        break
      
      default:
        // 'all' - sin filtro de fecha
        break
    }

    // Calcular estadísticas usando TODOS los paquetes en memoria
    const stats = {
      shein_entregados: allPackages.filter(p => (p.tipo === 'Paquetes Pagos' || p.tipo === 'Shein/Temu') && p.estado === 1).length,
      shein_total: allPackages.filter(p => (p.tipo === 'Paquetes Pagos' || p.tipo === 'Shein/Temu')).length,
      shein_devueltos: allPackages.filter(p => (p.tipo === 'Paquetes Pagos' || p.tipo === 'Shein/Temu') && p.estado === 2).length,
      dropi_entregados: allPackages.filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 1).length,
      dropi_no_entregados: allPackages.filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 0).length,
      dropi_devueltos: allPackages.filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 2).length,
      dropi_valor_entregado: allPackages
        .filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 1)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      dropi_valor_pendiente: allPackages
        .filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 0)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      dropi_valor_devuelto: allPackages
        .filter(p => (p.tipo === 'Paquetes Pago Contra Entrega (COD)' || p.tipo === 'Dropi') && p.estado === 2)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      dias_atraso_promedio: (() => {
        const atrasados = allPackages.filter(p => {
          if (p.estado !== 0) return false
          const fechaEntrega = new Date(p.fecha_entrega)
          const hoy = new Date()
          return hoy > fechaEntrega
        })
        
        if (atrasados.length === 0) return 0
        
        const totalDias = atrasados.reduce((sum, p) => {
          const fechaEntrega = new Date(p.fecha_entrega)
          const hoy = new Date()
          const dias = Math.floor((hoy.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))
          return sum + dias
        }, 0)
        
        return totalDias / atrasados.length
      })()
    }

    console.log('Estadísticas calculadas:', stats)

    return NextResponse.json({ 
      conductor: conductor,
      stats: stats,
      filter: {
        type: filterType,
        startDate,
        endDate,
        lastDays,
        month,
        year
      }
    })

  } catch (error) {
    console.error('Error in GET /api/conductor/[id]/stats:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

