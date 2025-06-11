import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES GET ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver paquetes'
      }, { status: 401 })
    }

    console.log('Buscando paquetes para user ID:', userId)

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
        conductor:conductors!inner(id, nombre, zona, user_id)
      `)
      .eq('conductor.user_id', userId) // Solo paquetes de conductores del usuario
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

    console.log('Paquetes encontrados:', packages?.length || 0)

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error in packages GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES POST ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear paquetes'
      }, { status: 401 })
    }

    console.log('Creando paquete para user ID:', userId)

    const body = await request.json()
    const { tracking, conductor_id, tipo, fecha_entrega, valor } = body

    // Validaciones
    if (!tracking || !conductor_id || !tipo || !fecha_entrega) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tracking, conductor_id, tipo, fecha_entrega' 
      }, { status: 400 })
    }

    // Verificar que el conductor existe Y pertenece al usuario actual
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id')
      .eq('id', conductor_id)
      .eq('user_id', userId) // Solo conductores del usuario actual
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado o no pertenece a su bodega' }, { status: 400 })
    }

    // Verificar que el tracking no existe para este usuario
    const { data: existingPackage, error: checkError } = await supabase
      .from('packages')
      .select('tracking, conductor:conductors!inner(user_id)')
      .eq('tracking', tracking)
      .eq('conductor.user_id', userId)
      .single()

    if (existingPackage) {
      return NextResponse.json({ error: 'Ya existe un paquete con este tracking en su bodega' }, { status: 400 })
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

    console.log('Paquete creado exitosamente:', newPackage)
    return NextResponse.json({ package: newPackage }, { status: 201 })
  } catch (error) {
    console.error('Error in packages POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

