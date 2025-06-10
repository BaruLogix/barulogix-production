import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores usando SQL directo
export async function GET(request: NextRequest) {
  try {
    // Usar SQL directo para bypasear el cache
    const { data: conductors, error } = await supabase
      .rpc('exec_sql_query', {
        query: 'SELECT * FROM conductors ORDER BY created_at DESC'
      })

    if (error) {
      console.error('Error fetching conductors with SQL:', error)
      
      // Fallback: intentar con el método normal
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('conductors')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackError) {
        return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
      }

      const stats = {
        total: fallbackData.length,
        activos: fallbackData.filter(c => c.activo !== false).length,
        inactivos: fallbackData.filter(c => c.activo === false).length,
        zonas: [...new Set(fallbackData.map(c => c.zona))].length
      }

      return NextResponse.json({ conductors: fallbackData, stats })
    }

    // Procesar resultados del SQL directo
    const stats = {
      total: conductors.length,
      activos: conductors.filter(c => c.activo !== false).length,
      inactivos: conductors.filter(c => c.activo === false).length,
      zonas: [...new Set(conductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors, stats })
  } catch (error) {
    console.error('Error in GET /api/conductors-direct:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor usando SQL directo
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Verificar si ya existe usando SQL directo
    const checkQuery = `
      SELECT id FROM conductors 
      WHERE nombre = '${nombre.replace(/'/g, "''")}'
      LIMIT 1
    `

    const { data: existing, error: checkError } = await supabase
      .rpc('exec_sql_query', { query: checkQuery })

    if (checkError) {
      console.error('Error checking existing conductor:', checkError)
      return NextResponse.json({ error: 'Error verificando conductor existente' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre' }, { status: 400 })
    }

    // Insertar usando SQL directo
    const insertQuery = `
      INSERT INTO conductors (nombre, zona, telefono, activo, created_at, updated_at)
      VALUES (
        '${nombre.trim().replace(/'/g, "''")}',
        '${zona.trim().replace(/'/g, "''")}',
        ${telefono ? `'${telefono.trim().replace(/'/g, "''")}'` : 'NULL'},
        true,
        NOW(),
        NOW()
      )
      RETURNING *
    `

    const { data: conductor, error: insertError } = await supabase
      .rpc('exec_sql_query', { query: insertQuery })

    if (insertError) {
      console.error('Error inserting conductor with SQL:', insertError)
      
      // Fallback: intentar inserción básica sin campos opcionales
      const basicInsertQuery = `
        INSERT INTO conductors (nombre, zona, created_at)
        VALUES (
          '${nombre.trim().replace(/'/g, "''")}',
          '${zona.trim().replace(/'/g, "''")}',
          NOW()
        )
        RETURNING *
      `

      const { data: basicConductor, error: basicError } = await supabase
        .rpc('exec_sql_query', { query: basicInsertQuery })

      if (basicError) {
        return NextResponse.json({ 
          error: 'Error al crear conductor',
          details: basicError.message
        }, { status: 500 })
      }

      return NextResponse.json({ 
        conductor: basicConductor[0],
        note: 'Creado con campos básicos'
      }, { status: 201 })
    }

    return NextResponse.json({ conductor: conductor[0] }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/conductors-direct:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

