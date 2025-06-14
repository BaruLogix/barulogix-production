import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener detalles de tracking por categoría
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; category: string } }
) {
  try {
    const conductorId = params.id
    const category = params.category
    const { searchParams } = new URL(request.url)
    
    // Parámetros de filtro temporal (mismos que en stats)
    const filterType = searchParams.get('filterType') || 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const lastDays = searchParams.get('lastDays')
    const month = searchParams.get('month')
    const year = searchParams.get('year')

    console.log('=== DEBUG CONDUCTOR TRACKING API ===')
    console.log('Conductor ID:', conductorId)
    console.log('Category:', category)
    console.log('Filter Type:', filterType)

    if (!conductorId || !category) {
      return NextResponse.json({ 
        error: 'Parámetros faltantes'
      }, { status: 400 })
    }

    // Verificar que el conductor existe y está activo
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, nombre')
      .eq('id', conductorId)
      .eq('activo', true)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ 
        error: 'Conductor no encontrado o inactivo'
      }, { status: 404 })
    }

    // Construir query base según la categoría
    let baseQuery = supabase
      .from('deliveries')
      .select(`
        id,
        numero_tracking,
        plataforma,
        estado,
        valor,
        fecha_entrega_conductor,
        fecha_entrega_cliente,
        fecha_entrega_programada,
        created_at,
        direccion_entrega
      `)
      .eq('conductor_id', conductorId)

    // Aplicar filtros según la categoría
    switch (category) {
      case 'shein_temu_entregados':
        baseQuery = baseQuery
          .in('plataforma', ['Shein', 'Temu'])
          .eq('estado', 'entregado')
        break
      
      case 'shein_temu_pendientes':
        baseQuery = baseQuery
          .in('plataforma', ['Shein', 'Temu'])
          .neq('estado', 'entregado')
        break
      
      case 'dropi_entregados':
        baseQuery = baseQuery
          .eq('plataforma', 'Dropi')
          .eq('estado', 'entregado')
        break
      
      case 'dropi_pendientes':
        baseQuery = baseQuery
          .eq('plataforma', 'Dropi')
          .neq('estado', 'entregado')
        break
      
      case 'valor_pendiente':
        baseQuery = baseQuery
          .neq('estado', 'entregado')
        break
      
      default:
        return NextResponse.json({ 
          error: 'Categoría no válida'
        }, { status: 400 })
    }

    // Aplicar filtros temporales
    switch (filterType) {
      case 'range':
        if (startDate && endDate) {
          baseQuery = baseQuery
            .gte('created_at', startDate)
            .lte('created_at', endDate)
        }
        break
      
      case 'lastDays':
        if (lastDays) {
          const days = parseInt(lastDays)
          if (days > 0 && days <= 30) {
            const startDateCalc = new Date()
            startDateCalc.setDate(startDateCalc.getDate() - days)
            baseQuery = baseQuery.gte('created_at', startDateCalc.toISOString())
          }
        }
        break
      
      case 'month':
        if (month && year) {
          const monthNum = parseInt(month)
          const yearNum = parseInt(year)
          const startOfMonth = new Date(yearNum, monthNum - 1, 1)
          const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59)
          baseQuery = baseQuery
            .gte('created_at', startOfMonth.toISOString())
            .lte('created_at', endOfMonth.toISOString())
        }
        break
    }

    // Ejecutar query
    const { data: deliveries, error } = await baseQuery
      .order('created_at', { ascending: false })
      .limit(100) // Limitar a 100 registros para rendimiento

    if (error) {
      console.error('Error fetching deliveries:', error)
      return NextResponse.json({ 
        error: 'Error al obtener datos de entregas'
      }, { status: 500 })
    }

    // Calcular días de atraso para cada entrega
    const enrichedDeliveries = deliveries.map(delivery => {
      let diasAtraso = 0
      
      if (delivery.fecha_entrega_programada && delivery.estado !== 'entregado') {
        const fechaProgramada = new Date(delivery.fecha_entrega_programada)
        const hoy = new Date()
        if (hoy > fechaProgramada) {
          diasAtraso = Math.floor((hoy.getTime() - fechaProgramada.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      return {
        ...delivery,
        dias_atraso: diasAtraso,
        valor_formateado: delivery.valor ? `$${delivery.valor.toLocaleString()}` : '$0',
        fecha_entrega_conductor_formateada: delivery.fecha_entrega_conductor 
          ? new Date(delivery.fecha_entrega_conductor).toLocaleDateString() 
          : 'N/A',
        fecha_entrega_cliente_formateada: delivery.fecha_entrega_cliente 
          ? new Date(delivery.fecha_entrega_cliente).toLocaleDateString() 
          : 'N/A'
      }
    })

    console.log(`Encontradas ${enrichedDeliveries.length} entregas para categoría ${category}`)

    return NextResponse.json({ 
      conductor: conductor,
      category: category,
      deliveries: enrichedDeliveries,
      total: enrichedDeliveries.length,
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
    console.error('Error in GET /api/conductor/[id]/tracking/[category]:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

