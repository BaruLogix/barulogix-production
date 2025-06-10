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
    console.log('=== CONDUCTOR API DEBUG ===')
    
    const body = await request.json()
    console.log('Body recibido:', body)
    
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      console.log('Error: Faltan campos obligatorios')
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    console.log('Verificando conductor existente...')
    
    // Verificar si ya existe un conductor con el mismo nombre
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
    }

    if (existing) {
      console.log('Conductor ya existe')
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre' }, { status: 400 })
    }

    console.log('Intentando crear conductor...')

    // Estrategia 1: Solo campos básicos
    let insertData = {
      nombre: nombre.trim(),
      zona: zona.trim()
    }

    console.log('Datos a insertar (básicos):', insertData)

    let { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error con campos básicos:', error)
      
      // Estrategia 2: Intentar con diferentes combinaciones
      console.log('Intentando estrategia alternativa...')
      
      const { data: testData, error: testError } = await supabase
        .from('conductors')
        .select('*')
        .limit(1)
      
      console.log('Test select result:', { testData, testError })
      
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message,
        debug: {
          originalError: error,
          testResult: { testData, testError }
        }
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente:', conductor)
    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

