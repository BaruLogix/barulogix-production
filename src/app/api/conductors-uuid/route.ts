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
    // Intentar obtener todos los registros sin especificar columnas
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
    
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

    // Generar UUID válido
    const uuid = generateUUID()
    
    // Estrategia 1: Intentar insertar solo con ID (UUID)
    console.log('Intentando inserción con UUID:', uuid)
    
    let { data: conductor, error } = await supabase
      .from('conductors')
      .insert({ id: uuid })
      .select()
      .single()

    if (error) {
      console.error('Error con UUID solo:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor',
        details: error.message,
        debug: {
          attemptedUUID: uuid,
          suggestion: 'La tabla conductors necesita ser recreada con el esquema correcto'
        }
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente con UUID:', conductor)
    
    // Si llegamos aquí, la inserción funcionó
    return NextResponse.json({ 
      conductor,
      success: true,
      note: 'Conductor creado con UUID. Necesitas agregar las columnas nombre, zona, telefono, activo a la tabla.'
    }, { status: 201 })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

