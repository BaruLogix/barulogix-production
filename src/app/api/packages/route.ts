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
      .limit(10000) // Aumentar límite a 10000 para obtener todos los paquetes

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
    console.log('Body recibido:', body)
    
    const { tracking, conductor_id, tipo, fecha_entrega, fecha_entrega_cliente, valor } = body

    // Validaciones
    if (!tracking || !conductor_id || !tipo || !fecha_entrega) {
      console.log('ERROR: Faltan campos requeridos')
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tracking, conductor_id, tipo, fecha_entrega' 
      }, { status: 400 })
    }

    console.log('Validando conductor:', conductor_id, 'para usuario:', userId)

    // Verificar que el conductor existe Y pertenece al usuario actual
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id')
      .eq('id', conductor_id)
      .eq('user_id', userId) // Solo conductores del usuario actual
      .single()

    console.log('Resultado validación conductor:', conductor, conductorError)

    if (conductorError || !conductor) {
      console.log('ERROR: Conductor no encontrado o no pertenece al usuario')
      return NextResponse.json({ error: 'Conductor no encontrado o no pertenece a su bodega' }, { status: 400 })
    }

    // Verificar que el tracking no existe para conductores de este usuario
    // Primero obtener todos los conductores del usuario
    const { data: userConductors, error: userConductorsError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)

    if (userConductorsError) {
      console.error('Error obteniendo conductores del usuario:', userConductorsError)
      return NextResponse.json({ error: 'Error verificando conductores' }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)
    console.log('IDs de conductores del usuario:', conductorIds)

    // Verificar duplicados solo en conductores del usuario
    const { data: existingPackage, error: checkError } = await supabase
      .from('packages')
      .select('tracking')
      .eq('tracking', tracking)
      .in('conductor_id', conductorIds)
      .single()

    console.log('Verificación duplicados:', existingPackage, checkError)

    if (existingPackage) {
      console.log('ERROR: Tracking duplicado')
      return NextResponse.json({ error: 'Ya existe un paquete con este tracking en su bodega' }, { status: 400 })
    }

    console.log('Insertando paquete en la base de datos...')
    console.log('Datos a insertar:', {
      tracking,
      conductor_id,
      tipo,
      estado: 0,
      fecha_entrega,
      fecha_entrega_cliente: fecha_entrega_cliente || null,
      valor: tipo === 'Dropi' ? valor : null
    })

    // Crear el paquete
    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert([{
        tracking,
        conductor_id,
        tipo,
        estado: 0, // No entregado por defecto
        fecha_entrega,
        fecha_entrega_cliente: fecha_entrega_cliente || null,
        valor: tipo === 'Dropi' ? valor : null
      }])
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .single()

    console.log('Resultado inserción:', newPackage, error)

    if (error) {
      console.error('ERROR CRÍTICO al crear paquete:', error)
      console.error('Detalles del error:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Error al crear paquete', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }

    console.log('Paquete creado exitosamente:', newPackage)
    return NextResponse.json({ package: newPackage }, { status: 201 })
  } catch (error) {
    console.error('ERROR CRÍTICO en packages POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

