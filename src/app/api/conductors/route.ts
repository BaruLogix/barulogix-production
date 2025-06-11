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
    const userEmail = request.headers.get('x-user-email') || 'barulogix.platform@gmail.com'
    
    // Obtener el user_id del usuario logueado
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 401 })
    }

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
    const userEmail = request.headers.get('x-user-email') || 'barulogix.platform@gmail.com'
    
    // Obtener el user_id del usuario logueado
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !currentUser) {
      console.error('Error obteniendo usuario logueado:', userError)
      return NextResponse.json({ 
        error: 'Usuario no encontrado',
        details: 'Debe estar logueado para crear conductores'
      }, { status: 401 })
    }

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

    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

