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

    // 2. Obtener parámetros de filtro de fecha
    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const lastDays = searchParams.get('last_days')
    const month = searchParams.get('month') // formato: YYYY-MM

    let dateFilter = ''
    let dateParams: any[] = []

    if (startDate && endDate) {
      dateFilter = 'AND created_at >= $2 AND created_at <= $3'
      dateParams = [startDate, endDate]
    } else if (lastDays) {
      const days = parseInt(lastDays)
      if (days > 0 && days <= 30) {
        dateFilter = 'AND created_at >= NOW() - INTERVAL \'$2 days\''
        dateParams = [days]
      }
    } else if (month) {
      const [year, monthNum] = month.split('-')
      dateFilter = 'AND EXTRACT(YEAR FROM created_at) = $2 AND EXTRACT(MONTH FROM created_at) = $3'
      dateParams = [parseInt(year), parseInt(monthNum)]
    }

    // 3. Consulta para obtener estadísticas de paquetes
    const { data: packagesData, error: packagesError } = await supabaseAdmin
      .rpc('get_conductor_stats', {
        p_conductor_id: conductorId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_last_days: lastDays ? parseInt(lastDays) : null,
        p_month: month
      })

    if (packagesError) {
      console.error('Error al obtener estadísticas:', packagesError)
      // Si la función RPC no existe, usar consulta directa
      return await getStatsDirectQuery(conductorId, startDate, endDate, lastDays, month)
    }

    return NextResponse.json({
      stats: packagesData[0] || {
        shein_temu_delivered: 0,
        shein_temu_pending: 0,
        dropi_delivered: 0,
        dropi_pending: 0,
        total_pending_value: 0,
        average_delay_days: 0,
        total_packages: 0,
        delivery_rate: 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error en la API de estadísticas del conductor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// Función auxiliar para consulta directa si no existe la función RPC
async function getStatsDirectQuery(conductorId: string, startDate: string | null, endDate: string | null, lastDays: string | null, month: string | null) {
  let query = supabaseAdmin
    .from('packages')
    .select('platform, status, value, created_at, delivery_date')
    .eq('conductor_id', conductorId)

  // Aplicar filtros de fecha
  if (startDate && endDate) {
    query = query.gte('created_at', startDate).lte('created_at', endDate)
  } else if (lastDays) {
    const days = parseInt(lastDays)
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - days)
    query = query.gte('created_at', pastDate.toISOString())
  } else if (month) {
    const [year, monthNum] = month.split('-')
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1)
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59)
    query = query.gte('created_at', startOfMonth.toISOString()).lte('created_at', endOfMonth.toISOString())
  }

  const { data: packages, error } = await query

  if (error) {
    throw error
  }

  // Calcular estadísticas manualmente
  const stats = {
    shein_temu_delivered: 0,
    shein_temu_pending: 0,
    dropi_delivered: 0,
    dropi_pending: 0,
    total_pending_value: 0,
    average_delay_days: 0,
    total_packages: packages?.length || 0,
    delivery_rate: 0
  }

  if (packages) {
    let totalDelayDays = 0
    let deliveredCount = 0
    let pendingValue = 0

    packages.forEach(pkg => {
      const isSheinTemu = pkg.platform === 'shein' || pkg.platform === 'temu'
      const isDropi = pkg.platform === 'dropi'
      const isDelivered = pkg.status === 'entregado'
      const isPending = pkg.status === 'pendiente' || pkg.status === 'en_transito'

      if (isSheinTemu) {
        if (isDelivered) stats.shein_temu_delivered++
        if (isPending) stats.shein_temu_pending++
      }

      if (isDropi) {
        if (isDelivered) stats.dropi_delivered++
        if (isPending) stats.dropi_pending++
      }

      if (isPending) {
        pendingValue += parseFloat(pkg.value) || 0
      }

      if (isDelivered && pkg.delivery_date) {
        const createdDate = new Date(pkg.created_at)
        const deliveryDate = new Date(pkg.delivery_date)
        const delayDays = Math.max(0, Math.floor((deliveryDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)))
        totalDelayDays += delayDays
        deliveredCount++
      }
    })

    stats.total_pending_value = pendingValue
    stats.average_delay_days = deliveredCount > 0 ? Math.round(totalDelayDays / deliveredCount) : 0
    stats.delivery_rate = stats.total_packages > 0 ? Math.round(((stats.shein_temu_delivered + stats.dropi_delivered) / stats.total_packages) * 100) : 0
  }

  return NextResponse.json({ stats }, { status: 200 })
}

