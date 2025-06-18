import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES STATS ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver estadísticas'
      }, { status: 401 })
    }

    console.log('Obteniendo estadísticas para user ID:', userId)

    // Obtener estadísticas solo de paquetes del usuario actual - AUMENTAR LÍMITE A 10000 para obtener todos los paquetes
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select(`
        tipo, estado, valor,
        conductor:conductors!inner(user_id)
      `)
      .eq('conductor.user_id', userId)
      .limit(10000) // Aumentar límite a 10000 para obtener todos los paquetes

    console.log('=== DEBUG STATS QUERY ===')
    console.log('Packages found:', packages?.length || 0)
    console.log('Query error:', packagesError)
    console.log('First 3 packages:', packages?.slice(0, 3))

    if (packagesError) {
      console.error('Error getting packages for stats:', packagesError)
      return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
    }

    console.log('Paquetes encontrados para estadísticas:', packages?.length || 0)

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
  } catch (error) {
    console.error('Error in package stats GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

