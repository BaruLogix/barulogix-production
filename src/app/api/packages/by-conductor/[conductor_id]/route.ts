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

    // Construir query base
    let query = supabase
      .from('packages')
      .select('*')
      .eq('conductor_id', params.conductor_id)
      .order('fecha_entrega', { ascending: false })

    // Aplicar filtros temporales
    const now = new Date()
    let dateFilter = null

    switch (filterType) {
      case 'range':
        if (startDate) query = query.gte('fecha_entrega', startDate)
        if (endDate) query = query.lte('fecha_entrega', endDate)
        break
      
      case 'lastDays':
        const daysAgo = new Date()
        daysAgo.setDate(now.getDate() - parseInt(lastDays || '7'))
        query = query.gte('fecha_entrega', daysAgo.toISOString().split('T')[0])
        break
      
      case 'month':
        const targetYear = parseInt(year || now.getFullYear().toString())
        const targetMonth = parseInt(month || (now.getMonth() + 1).toString())
        const monthStart = new Date(targetYear, targetMonth - 1, 1)
        const monthEnd = new Date(targetYear, targetMonth, 0)
        query = query.gte('fecha_entrega', monthStart.toISOString().split('T')[0])
        query = query.lte('fecha_entrega', monthEnd.toISOString().split('T')[0])
        break
      
      case 'all':
      default:
        // Sin filtro de fecha
        break
    }

    const { data: packages, error } = await query

    if (error) {
      console.error('Error getting packages by conductor:', error)
      return NextResponse.json({ error: 'Error al obtener paquetes del conductor' }, { status: 500 })
    }

    console.log('Paquetes encontrados:', packages?.length || 0)

    // Separar paquetes por tipo
    const paquetes_shein = packages.filter(p => p.tipo === 'Shein/Temu')
    const paquetes_dropi = packages.filter(p => p.tipo === 'Dropi')

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

