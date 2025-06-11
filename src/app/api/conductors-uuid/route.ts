import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para generar UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// GET - Obtener todos los conductores
export async function GET(request: NextRequest) {
  try {
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ 
        conductors: [], 
        stats: { total: 0, activos: 0, inactivos: 0, zonas: 0 },
        error: error.message
      })
    }

    const stats = {
      total: conductors?.length || 0,
      activos: conductors?.filter(c => c.activo !== false).length || 0,
      inactivos: conductors?.filter(c => c.activo === false).length || 0,
      zonas: conductors ? [...new Set(conductors.map(c => c.zona))].length : 0
    }

    return NextResponse.json({ 
      conductors: conductors || [], 
      stats 
    })
  } catch (error) {
    console.error('Error in GET:', error)
    return NextResponse.json({ 
      conductors: [], 
      stats: { total: 0, activos: 0, inactivos: 0, zonas: 0 },
      error: error.message
    })
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
      .eq('nombre', nombre.trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre' }, { status: 400 })
    }

    // Datos del conductor con esquema correcto
    const conductorData = {
      user_id: generateUUID(), // Generar user_id
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono?.trim() || null,
      activo: true
    }

    console.log('Insertando conductor:', conductorData)

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(conductorData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting conductor:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor',
        details: error.message
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente:', conductor)
    
    return NextResponse.json({ 
      conductor,
      success: true
    }, { status: 201 })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

