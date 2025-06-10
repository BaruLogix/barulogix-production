import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET() {
  try {
    // Obtener estadísticas usando la función SQL
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_package_stats')

    if (statsError) {
      console.error('Error getting package stats:', statsError)
      // Fallback: calcular estadísticas manualmente
      const { data: packages, error: packagesError } = await supabase
        .from('packages')
        .select('tipo, estado, valor')

      if (packagesError) {
        return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
      }

      const stats = {
        total_packages: packages.length,
        no_entregados: packages.filter(p => p.estado === 0).length,
        entregados: packages.filter(p => p.estado === 1).length,
        devueltos: packages.filter(p => p.estado === 2).length,
        shein_temu: packages.filter(p => p.tipo === 'Shein/Temu').length,
        dropi: packages.filter(p => p.tipo === 'Dropi').length,
        valor_total_dropi: packages
          .filter(p => p.tipo === 'Dropi' && p.valor)
          .reduce((sum, p) => sum + (p.valor || 0), 0),
        valor_no_entregado_dropi: packages
          .filter(p => p.tipo === 'Dropi' && p.estado === 0 && p.valor)
          .reduce((sum, p) => sum + (p.valor || 0), 0)
      }

      return NextResponse.json({ stats })
    }

    return NextResponse.json({ stats: statsData })
  } catch (error) {
    console.error('Error in package stats GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

