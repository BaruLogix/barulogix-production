import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConductorJWT, extractTokenFromHeader } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const authHeader = req.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Token de autenticación requerido' }, { status: 401 })
    }

    const decodedToken = verifyConductorJWT(token)
    if (!decodedToken) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    const conductorId = decodedToken.conductor_id

    // 2. Obtener parámetros de consulta
    const { searchParams } = new URL(req.url)
    const packageType = searchParams.get('type') // 'shein_temu_delivered', 'shein_temu_pending', 'dropi_delivered', 'dropi_pending'
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const lastDays = searchParams.get('last_days')
    const month = searchParams.get('month') // formato: YYYY-MM
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    if (!packageType) {
      return NextResponse.json({ error: 'Tipo de paquete requerido' }, { status: 400 })
    }

    // 3. Construir filtros basados en el tipo de paquete
    let platformFilter: string[] = []
    let statusFilter: string[] = []

    switch (packageType) {
      case 'shein_temu_delivered':
        platformFilter = ['shein', 'temu']
        statusFilter = ['entregado']
        break
      case 'shein_temu_pending':
        platformFilter = ['shein', 'temu']
        statusFilter = ['pendiente', 'en_transito']
        break
      case 'dropi_delivered':
        platformFilter = ['dropi']
        statusFilter = ['entregado']
        break
      case 'dropi_pending':
        platformFilter = ['dropi']
        statusFilter = ['pendiente', 'en_transito']
        break
      default:
        return NextResponse.json({ error: 'Tipo de paquete inválido' }, { status: 400 })
    }

    // 4. Construir consulta base
    let query = supabaseAdmin
      .from('packages')
      .select(`
        id,
        tracking_number,
        platform,
        status,
        value,
        created_at,
        delivery_date,
        customer_delivery_date,
        recipient_name,
        recipient_address
      `)
      .eq('conductor_id', conductorId)
      .in('platform', platformFilter)
      .in('status', statusFilter)

    // 5. Aplicar filtros de fecha
    if (startDate && endDate) {
      query = query.gte('created_at', startDate).lte('created_at', endDate)
    } else if (lastDays) {
      const days = parseInt(lastDays)
      if (days > 0 && days <= 30) {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - days)
        query = query.gte('created_at', pastDate.toISOString())
      }
    } else if (month) {
      const [year, monthNum] = month.split('-')
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
      query = query.gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString())
    }

    // 6. Aplicar paginación y ordenamiento
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: packages, error: packagesError } = await query

    if (packagesError) {
      console.error('Error al obtener paquetes:', packagesError)
      return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
    }

    // 7. Calcular días de atraso para cada paquete
    const packagesWithDelay = packages?.map(pkg => {
      let delayDays = 0
      
      if (pkg.status === 'entregado' && pkg.customer_delivery_date) {
        const createdDate = new Date(pkg.created_at)
        const deliveryDate = new Date(pkg.customer_delivery_date)
        delayDays = Math.max(0, Math.floor((deliveryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))
      } else if (pkg.status !== 'entregado') {
        // Para paquetes pendientes, calcular días desde la creación
        const createdDate = new Date(pkg.created_at)
        const today = new Date()
        delayDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      return {
        ...pkg,
        delay_days: delayDays,
        formatted_value: new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP'
        }).format(parseFloat(pkg.value) || 0),
        formatted_created_at: new Date(pkg.created_at).toLocaleDateString('es-CO'),
        formatted_delivery_date: pkg.delivery_date ? new Date(pkg.delivery_date).toLocaleDateString('es-CO') : null,
        formatted_customer_delivery_date: pkg.customer_delivery_date ? new Date(pkg.customer_delivery_date).toLocaleDateString('es-CO') : null
      }
    }) || []

    // 8. Obtener total de registros para paginación
    let countQuery = supabaseAdmin
      .from('packages')
      .select('id', { count: 'exact', head: true })
      .eq('conductor_id', conductorId)
      .in('platform', platformFilter)
      .in('status', statusFilter)

    // Aplicar los mismos filtros de fecha para el conteo
    if (startDate && endDate) {
      countQuery = countQuery.gte('created_at', startDate).lte('created_at', endDate)
    } else if (lastDays) {
      const days = parseInt(lastDays)
      if (days > 0 && days <= 30) {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - days)
        countQuery = countQuery.gte('created_at', pastDate.toISOString())
      }
    } else if (month) {
      const [year, monthNum] = month.split('-')
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
      countQuery = countQuery.gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString())
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Error al contar paquetes:', countError)
    }

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({
      packages: packagesWithDelay,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_records: count || 0,
        limit: limit,
        has_next: page < totalPages,
        has_prev: page > 1
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error en la API de paquetes del conductor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

