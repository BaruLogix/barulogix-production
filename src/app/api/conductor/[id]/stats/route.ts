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

    // Construir filtro de fecha
    let dateFilter = ''
    let dateParams: any[] = []

    switch (filterType) {
      case 'range':
        if (startDate && endDate) {
          dateFilter = 'AND fecha_entrega >= $2 AND fecha_entrega <= $3'
          dateParams = [startDate, endDate]
        }
        break
      
      case 'lastDays':
        if (lastDays) {
          const days = parseInt(lastDays)
          if (days > 0 && days <= 30) {
            const startDateCalc = new Date()
            startDateCalc.setDate(startDateCalc.getDate() - days)
            dateFilter = 'AND fecha_entrega >= $2'
            dateParams = [startDateCalc.toISOString().split('T')[0]] // Solo la fecha
          }
        }
        break
      
      case 'month':
        if (month && year) {
          const monthNum = parseInt(month)
          const yearNum = parseInt(year)
          const startOfMonth = new Date(yearNum, monthNum - 1, 1)
          const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59)
          dateFilter = 'AND fecha_entrega >= $2 AND fecha_entrega <= $3'
          dateParams = [startOfMonth.toISOString().split('T')[0], endOfMonth.toISOString().split('T')[0]] // Solo la fecha
        }
        break
      
      default:
        // 'all' - sin filtro de fecha
        break
    }

    // Consultas para estadísticas (usando la tabla 'packages')
    const queries = [
      // Paquetes Shein/Temu entregados
      `SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as total_value 
       FROM packages 
       WHERE conductor_id = $1 
       AND tipo = 'Shein/Temu' 
       AND estado = 1 
       ${dateFilter}`,
      
      // Paquetes Shein/Temu pendientes (estado 0 o 2)
      `SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as total_value 
       FROM packages 
       WHERE conductor_id = $1 
       AND tipo = 'Shein/Temu' 
       AND estado != 1 
       ${dateFilter}`,
      
      // Paquetes Dropi entregados
      `SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as total_value 
       FROM packages 
       WHERE conductor_id = $1 
       AND tipo = 'Dropi' 
       AND estado = 1 
       ${dateFilter}`,
      
      // Paquetes Dropi pendientes (estado 0 o 2)
      `SELECT COUNT(*) as count, COALESCE(SUM(valor), 0) as total_value 
       FROM packages 
       WHERE conductor_id = $1 
       AND tipo = 'Dropi' 
       AND estado != 1 
       ${dateFilter}`,
      
      // Valor total pendiente (solo Dropi, estado 0 o 2)
      `SELECT COALESCE(SUM(valor), 0) as total_pending 
       FROM packages 
       WHERE conductor_id = $1 
       AND tipo = 'Dropi' 
       AND estado != 1 
       ${dateFilter}`,
      
      // Días de atraso promedio (solo paquetes 'No entregado' = 0)
      `SELECT AVG(
         CASE 
           WHEN fecha_entrega < CURRENT_DATE AND estado = 0 
           THEN EXTRACT(DAY FROM CURRENT_DATE - fecha_entrega)
           ELSE 0 
         END
       ) as avg_delay_days
       FROM packages 
       WHERE conductor_id = $1 
       ${dateFilter}`
    ]

    const results = []
    
    for (const query of queries) {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query,
        params: [conductorId, ...dateParams]
      })
      
      if (error) {
        console.error('Error executing query:', error)
        results.push({ count: 0, total_value: 0, total_pending: 0, avg_delay_days: 0 })
      } else {
        results.push(data[0] || { count: 0, total_value: 0, total_pending: 0, avg_delay_days: 0 })
      }
    }

    const stats = {
      shein_temu_entregados: {
        count: parseInt(results[0]?.count || 0),
        value: parseFloat(results[0]?.total_value || 0)
      },
      shein_temu_pendientes: {
        count: parseInt(results[1]?.count || 0),
        value: parseFloat(results[1]?.total_value || 0)
      },
      dropi_entregados: {
        count: parseInt(results[2]?.count || 0),
        value: parseFloat(results[2]?.total_value || 0)
      },
      dropi_pendientes: {
        count: parseInt(results[3]?.count || 0),
        value: parseFloat(results[3]?.total_value || 0)
      },
      valor_pendiente: parseFloat(results[4]?.total_pending || 0),
      dias_atraso_promedio: parseFloat(results[5]?.avg_delay_days || 0)
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


