import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores del usuario logueado
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario logueado desde localStorage (simulado por ahora)
    // En una implementación real, esto vendría del token JWT
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS GET ===')
    console.log('Email recibido:', userEmail)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'Email de usuario no proporcionado',
        details: 'Debe estar logueado para ver conductores'
      }, { status: 401 })
    }
    
    // Obtener el user_id del usuario logueado
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', userEmail)
      .single()

    console.log('Búsqueda de usuario:', { userEmail, currentUser, userError })

    if (userError || !currentUser) {
      console.log('Usuario no encontrado:', { userEmail, userError })
      
      // Debug: mostrar todos los emails para comparar
      const { data: allUsers } = await supabase
        .from('users')
        .select('email')
      
      console.log('Todos los emails en BD:', allUsers?.map(u => u.email))
      
      return NextResponse.json({ 
        error: 'Usuario no encontrado',
        details: `No se encontró usuario con email: ${userEmail}`,
        debug: {
          searchedEmail: userEmail,
          allEmails: allUsers?.map(u => u.email)
        }
      }, { status: 401 })
    }

    console.log('Usuario encontrado:', currentUser)

    // Obtener solo los conductores de este usuario
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    // Calcular estadísticas solo de los conductores de este usuario
    const stats = {
      total: conductors.length,
      activos: conductors.filter(c => c.activo).length,
      inactivos: conductors.filter(c => !c.activo).length,
      zonas: [...new Set(conductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors, stats })
  } catch (error) {
    console.error('Error in GET /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor para el usuario logueado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Obtener el usuario logueado desde localStorage (simulado por ahora)
    // En una implementación real, esto vendría del token JWT
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS POST ===')
    console.log('Email recibido:', userEmail)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'Email de usuario no proporcionado',
        details: 'Debe estar logueado para crear conductores'
      }, { status: 401 })
    }
    
    // Obtener el user_id del usuario logueado
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .ilike('email', userEmail)
      .single()

    console.log('Búsqueda de usuario POST:', { userEmail, currentUser, userError })

    if (userError || !currentUser) {
      console.error('Error obteniendo usuario logueado:', { userEmail, userError })
      
      // Debug: mostrar todos los emails para comparar
      const { data: allUsers } = await supabase
        .from('users')
        .select('email')
      
      console.log('Todos los emails en BD (POST):', allUsers?.map(u => u.email))
      
      return NextResponse.json({ 
        error: 'Usuario no encontrado',
        details: `No se encontró usuario con email: ${userEmail}`,
        debug: {
          searchedEmail: userEmail,
          allEmails: allUsers?.map(u => u.email)
        }
      }, { status: 401 })
    }

    console.log('Usuario encontrado para crear conductor:', currentUser)

    // Verificar si ya existe un conductor con el mismo nombre para este usuario
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .eq('user_id', currentUser.id)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en su bodega' }, { status: 400 })
    }

    // Crear el conductor asociado al usuario logueado
    const insertData = {
      user_id: currentUser.id,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    }

    console.log('Datos a insertar:', insertData)

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creando conductor:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente:', conductor)
    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

