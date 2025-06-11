import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
// GET - Obtener todos los conductores del usuario logueado
export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar email directamente sin tabla users
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS GET ===')
    console.log('Email recibido:', userEmail)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'Email de usuario no proporcionado',
        details: 'Debe estar logueado para ver conductores'
      }, { status: 401 })
    }

    console.log('Buscando conductores para email:', userEmail)

    // Obtener conductores donde el campo user_email coincida con el email del usuario
    // Si no existe user_email, usar user_id como email temporal
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .or(`user_email.eq.${userEmail},user_id.eq.${userEmail}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    console.log('Conductores encontrados:', conductors?.length || 0)

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

    // SOLUCIÓN DEFINITIVA: Usar email directamente sin tabla users
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS POST ===')
    console.log('Email recibido:', userEmail)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'Email de usuario no proporcionado',
        details: 'Debe estar logueado para crear conductores'
      }, { status: 401 })
    }

    console.log('Creando conductor para email:', userEmail)

    // Verificar si ya existe un conductor con el mismo nombre para este usuario
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .or(`user_email.eq.${userEmail},user_id.eq.${userEmail}`)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en su bodega' }, { status: 400 })
    }

    // Crear el conductor asociado al email del usuario
    const insertData = {
      user_id: userEmail, // Usar email como identificador
      user_email: userEmail, // Agregar campo user_email si existe
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

