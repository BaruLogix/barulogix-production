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
    const { searchParams } = new URL(request.url)
    const fecha_inicio = searchParams.get('fecha_inicio')
    const fecha_fin = searchParams.get('fecha_fin')

    let query = supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .eq('conductor_id', params.conductor_id)
      .order('fecha_entrega', { ascending: false })

    // Filtros de fecha
    if (fecha_inicio) {
      query = query.gte('fecha_entrega', fecha_inicio)
    }
    
    if (fecha_fin) {
      query = query.lte('fecha_entrega', fecha_fin)
    }

    const { data: packages, error } = await query

    if (error) {
      console.error('Error getting packages by conductor:', error)
      return NextResponse.json({ error: 'Error al obtener paquetes del conductor' }, { status: 500 })
    }

    // Obtener información del conductor
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('*')
      .eq('id', params.conductor_id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // Separar paquetes por tipo
    const paquetes_shein = packages.filter(p => p.tipo === 'Shein/Temu')
    const paquetes_dropi = packages.filter(p => p.tipo === 'Dropi')

    // Calcular estadísticas
    const stats = {
      conductor: conductor,
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
      dropi_valor_no_entregado: paquetes_dropi
        .filter(p => p.estado === 0 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      
      // Paquetes no entregados con días de atraso
      paquetes_atrasados: packages
        .filter(p => p.estado === 0)
        .map(p => ({
          ...p,
          dias_atraso: Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.dias_atraso - a.dias_atraso)
    }

    return NextResponse.json({ 
      packages, 
      stats,
      paquetes_shein,
      paquetes_dropi
    })
  } catch (error) {
    console.error('Error in conductor packages GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

