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
      .from('packages') // Cambiado de 'deliveries' a 'packages'
      .select(`
        id,
        tracking,
        tipo,
        estado,
        valor,
        fecha_entrega,
        fecha_entrega_cliente,
        created_at
      `)
      .eq('conductor_id', conductorId)

    // Aplicar filtros según la categoría
    switch (category) {
      case 'shein_temu_entregados':
        baseQuery = baseQuery
          .eq('tipo', 'Shein/Temu')
          .eq('estado', 1) // 1 para entregado
        break
      
      case 'shein_temu_pendientes':
        baseQuery = baseQuery
          .eq('tipo', 'Shein/Temu')
          .neq('estado', 1) // 0 o 2 para no entregado/devuelto
        break
      
      case 'dropi_entregados':
        baseQuery = baseQuery
          .eq('tipo', 'Dropi')
          .eq('estado', 1)
        break
      
      case 'dropi_pendientes':
        baseQuery = baseQuery
          .eq('tipo', 'Dropi')
          .neq('estado', 1)
        break
      
      case 'valor_pendiente':
        baseQuery = baseQuery
          .eq('tipo', 'Dropi') // Solo Dropi para valor pendiente
          .neq('estado', 1) // 0 o 2 para no entregado/devuelto
          .not("valor", "is", null) // Asegurarse de que el valor no sea nulo
        break
      
      default:
        return NextResponse.json({ 
          error: 'Categoría no válida'
        }, { status: 400 })
    }

    // Aplicar filtros temporales (usando fecha_entrega en lugar de created_at)
    switch (filterType) {
      case 'range':
        if (startDate && endDate) {
          baseQuery = baseQuery
            .gte('fecha_entrega', startDate)
            .lte('fecha_entrega', endDate)
        }
        break
      
      case 'lastDays':
        if (lastDays) {
          const days = parseInt(lastDays)
          if (days > 0 && days <= 30) {
            const startDateCalc = new Date()
            startDateCalc.setDate(startDateCalc.getDate() - days)
            baseQuery = baseQuery.gte('fecha_entrega', startDateCalc.toISOString().split('T')[0])
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
            .gte('fecha_entrega', startOfMonth.toISOString().split('T')[0])
            .lte('fecha_entrega', endOfMonth.toISOString().split('T')[0])
        }
        break
    }

    // Función para obtener TODOS los paquetes con paginación automática
    const getAllPackages = async (baseQuery: any) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await baseQuery
          .order('fecha_entrega', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
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

      console.log(`TOTAL FINAL de paquetes obtenidos: ${allPackages.length}`)
      return allPackages
    }

    // Ejecutar query con paginación automática
    const packages = await getAllPackages(baseQuery)

    // Calcular días de atraso para cada paquete
    const enrichedPackages = packages.map(pkg => {
      let diasAtraso = 0
      
      // Solo calcular días de atraso si el estado es 'No entregado' (0)
      if (pkg.estado === 0 && pkg.fecha_entrega) {
        const fechaEntregaProgramada = new Date(pkg.fecha_entrega)
        const hoy = new Date()
        if (hoy > fechaEntregaProgramada) {
          diasAtraso = Math.floor((hoy.getTime() - fechaEntregaProgramada.getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      return {
        id: pkg.id,
        numero_tracking: pkg.tracking,
        plataforma: pkg.tipo,
        estado: pkg.estado === 0 ? 'No Entregado' : (pkg.estado === 1 ? 'Entregado' : 'Devuelto'),
        valor: pkg.valor || 0,
        fecha_entrega_conductor_formateada: pkg.fecha_entrega 
          ? new Date(pkg.fecha_entrega).toLocaleDateString() 
          : 'N/A',
        fecha_entrega_cliente_formateada: pkg.fecha_entrega_cliente 
          ? new Date(pkg.fecha_entrega_cliente).toLocaleDateString() 
          : 'N/A',
        dias_atraso: diasAtraso,
        valor_formateado: pkg.valor ? `$${pkg.valor.toLocaleString('es-CO')}` : '$0',
        direccion_entrega: 'N/A' // No disponible en la tabla packages, se puede omitir o dejar como N/A
      }
    })

    console.log(`Encontrados ${enrichedPackages.length} paquetes para categoría ${category}`)

    return NextResponse.json({ 
      conductor: conductor,
      category: category,
      deliveries: enrichedPackages,
      total: enrichedPackages.length,
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


