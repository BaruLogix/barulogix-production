import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores
export async function GET(request: NextRequest) {
  try {
    // Intentar obtener conductores de diferentes maneras
    let conductors = []
    
    // Método 1: Intentar con select básico
    try {
      const { data, error } = await supabase
        .from('conductors')
        .select('*')
      
      if (!error && data) {
        conductors = data
      }
    } catch (e) {
      console.log('Método 1 falló, intentando método 2...')
    }

    // Si no hay datos, devolver array vacío
    const stats = {
      total: conductors.length,
      activos: conductors.filter(c => c.activo !== false).length,
      inactivos: conductors.filter(c => c.activo === false).length,
      zonas: [...new Set(conductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors, stats })
  } catch (error) {
    console.error('Error in GET /api/conductors-simple:', error)
    return NextResponse.json({ 
      conductors: [], 
      stats: { total: 0, activos: 0, inactivos: 0, zonas: 0 }
    })
  }
}

// POST - Crear nuevo conductor de forma simple
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Generar ID único simple
    const uniqueId = Date.now().toString()
    
    // Datos del conductor con ID único para evitar duplicados
    const conductorData = {
      id: uniqueId,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono?.trim() || null,
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Intentar insertar directamente sin verificaciones
    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(conductorData)
      .select()
      .single()

    if (error) {
      console.error('Error inserting conductor:', error)
      
      // Si falla, intentar con datos mínimos
      const minimalData = {
        id: uniqueId,
        nombre: nombre.trim(),
        zona: zona.trim()
      }

      const { data: minimalConductor, error: minimalError } = await supabase
        .from('conductors')
        .insert(minimalData)
        .select()
        .single()

      if (minimalError) {
        console.error('Error with minimal data:', minimalError)
        return NextResponse.json({ 
          error: 'Error al crear conductor',
          details: minimalError.message,
          suggestion: 'Verifica que la tabla conductors existe y tiene las columnas correctas'
        }, { status: 500 })
      }

      return NextResponse.json({ 
        conductor: minimalConductor,
        note: 'Creado con datos mínimos'
      }, { status: 201 })
    }

    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/conductors-simple:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

