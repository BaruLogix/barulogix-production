import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conductor_id = searchParams.get('conductor_id')
    const tipo = searchParams.get('tipo')
    const estado = searchParams.get('estado')
    const fecha_inicio = searchParams.get('fecha_inicio')
    const fecha_fin = searchParams.get('fecha_fin')
    const search = searchParams.get('search')

    let query = supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .order('created_at', { ascending: false })

    // Filtros
    if (conductor_id) {
      query = query.eq('conductor_id', conductor_id)
    }
    
    if (tipo) {
      query = query.eq('tipo', tipo)
    }
    
    if (estado !== null && estado !== undefined) {
      query = query.eq('estado', parseInt(estado))
    }
    
    if (fecha_inicio) {
      query = query.gte('fecha_entrega', fecha_inicio)
    }
    
    if (fecha_fin) {
      query = query.lte('fecha_entrega', fecha_fin)
    }
    
    if (search) {
      query = query.ilike('tracking', `%${search}%`)
    }

    const { data: packages, error } = await query

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
    }

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error in packages GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tracking, conductor_id, tipo, fecha_entrega, valor } = body

    // Validaciones
    if (!tracking || !conductor_id || !tipo || !fecha_entrega) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tracking, conductor_id, tipo, fecha_entrega' 
      }, { status: 400 })
    }

    // Verificar que el conductor existe
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id')
      .eq('id', conductor_id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 400 })
    }

    // Verificar que el tracking no existe
    const { data: existingPackage, error: checkError } = await supabase
      .from('packages')
      .select('tracking')
      .eq('tracking', tracking)
      .single()

    if (existingPackage) {
      return NextResponse.json({ error: 'Ya existe un paquete con este tracking' }, { status: 400 })
    }

    // Crear el paquete
    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert([{
        tracking,
        conductor_id,
        tipo,
        estado: 0, // No entregado por defecto
        fecha_entrega,
        valor: tipo === 'Dropi' ? valor : null
      }])
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .single()

    if (error) {
      console.error('Error creating package:', error)
      return NextResponse.json({ error: 'Error al crear paquete' }, { status: 500 })
    }

    return NextResponse.json({ package: newPackage }, { status: 201 })
  } catch (error) {
    console.error('Error in packages POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

