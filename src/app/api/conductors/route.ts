import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores del usuario logueado
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log("=== DEBUG CONDUCTORS GET ===");
    console.log("User ID recibido:", userId);
    console.log("Buscando conductores para user ID:", userId);
    console.log("Consulta a Supabase para conductores...");

    // Obtener conductores del usuario actual
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    console.log('Conductores encontrados:', conductors?.length || 0)

    // Calcular estadísticas
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
  console.log('=== DEBUG CONDUCTORS POST API START ===');
  try {
    const body = await request.json()
    const { nombre, zona, telefono, email } = body

    if (!nombre || !zona) {
      console.log('Validation Error: Missing nombre or zona');
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG CONDUCTORS POST ===')
    console.log('User ID recibido:', userId)
    console.log('Email proporcionado:', email)
    
    if (!userId) {
      console.log('Auth Error: User ID not provided');
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear conductores'
      }, { status: 401 })
    }

    // Verificar si ya existe un conductor con el mismo nombre para este usuario
    console.log('Checking for existing conductor by name:', nombre);
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      console.log('Conflict: Conductor with this name already exists:', existing.id);
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en su bodega' }, { status: 400 })
    }

    // Crear el conductor
    const insertData = {
      user_id: userId,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      email: email ? email.trim() : null,
      activo: true
    }

    console.log('Datos a insertar en conductors:', insertData)

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creando conductor en tabla conductors:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente en tabla conductors:', conductor)
    console.log('ID único del conductor:', conductor.id)

    console.log('Conductor POST API finished successfully.');
    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

