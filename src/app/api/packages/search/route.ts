import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES SEARCH ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para buscar paquetes'
      }, { status: 401 })
    }

    console.log('Buscando paquetes para user ID:', userId)

    const { searchParams } = new URL(request.url)
    const tracking = searchParams.get('tracking')
    const conductor_id = searchParams.get('conductor_id')
    const tipo = searchParams.get('tipo')
    const estado = searchParams.get('estado')
    const fecha_inicio = searchParams.get('fecha_inicio')
    const fecha_fin = searchParams.get('fecha_fin')
    const zona = searchParams.get('zona')

    if (!tracking && !conductor_id && !tipo && !estado && !fecha_inicio && !fecha_fin && !zona) {
      return NextResponse.json({ error: 'Debe proporcionar al menos un criterio de búsqueda' }, { status: 400 })
    }

    let query = supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors!inner(id, nombre, zona, user_id)
      `)
      .eq('conductor.user_id', userId) // Solo paquetes del usuario actual
      .order('created_at', { ascending: false })

    // Filtros de búsqueda
    if (tracking) {
      query = query.ilike('tracking', `%${tracking}%`)
    }
    
    if (conductor_id) {
      query = query.eq('conductor_id', conductor_id)
    }
    
    if (tipo) {
      query = query.eq('tipo', tipo)
    }
    
    if (estado !== null && estado !== undefined && estado !== '') {
      query = query.eq('estado', parseInt(estado))
    }
    
    if (fecha_inicio) {
      query = query.gte('fecha_entrega', fecha_inicio)
    }
    
    if (fecha_fin) {
      query = query.lte('fecha_entrega', fecha_fin)
    }

    // Filtro por zona del conductor
    if (zona) {
      const { data: conductorsInZone, error: conductorsError } = await supabase
        .from('conductors')
        .select('id')
        .eq('user_id', userId) // Solo conductores del usuario actual
        .ilike('zona', `%${zona}%`)

      if (conductorsError) {
        return NextResponse.json({ error: 'Error al buscar conductores por zona' }, { status: 500 })
      }

      const conductorIds = conductorsInZone.map(c => c.id)
      if (conductorIds.length > 0) {
        query = query.in('conductor_id', conductorIds)
      } else {
        // No hay conductores en esa zona para este usuario, retornar array vacío
        return NextResponse.json({ packages: [] })
      }
    }

    const { data: packages, error } = await query

    if (error) {
      console.error('Error searching packages:', error)
      return NextResponse.json({ error: 'Error al buscar paquetes' }, { status: 500 })
    }

    // Calcular estadísticas de la búsqueda
    const stats = {
      total: packages.length,
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

    return NextResponse.json({ packages, stats })
  } catch (error) {
    console.error('Error in package search:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

