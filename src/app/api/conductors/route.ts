import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores
export async function GET(request: NextRequest) {
  try {
    // Obtener conductores (sin restricción de usuario - todos pueden ver todos)
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

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

// POST - Crear nuevo conductor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Verificar si ya existe un conductor con el mismo nombre
    const { data: existing } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre' }, { status: 400 })
    }

    // Preparar datos base
    const baseData = {
      nombre: nombre.trim(),
      zona: zona.trim()
    }

    // Intentar insertar con todos los campos primero
    let insertData = {
      ...baseData,
      telefono: telefono?.trim() || null,
      activo: true
    }

    let { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    // Si falla, intentar solo con campos básicos
    if (error && error.message.includes('column')) {
      console.log('Intentando inserción con campos básicos...')
      
      insertData = baseData
      
      const result = await supabase
        .from('conductors')
        .insert(insertData)
        .select()
        .single()
      
      conductor = result.data
      error = result.error
    }

    if (error) {
      console.error('Error creating conductor:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ conductor }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

