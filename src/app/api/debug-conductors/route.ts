import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS TABLE ===')
    console.log('Email recibido:', userEmail)
    
    // Test 1: Ver estructura de la tabla
    const { data: allConductors, error: allError } = await supabase
      .from('conductors')
      .select('*')
      .limit(5)
    
    // Test 2: Intentar búsqueda simple
    let searchResult = null
    let searchError = null
    
    if (userEmail) {
      const { data, error } = await supabase
        .from('conductors')
        .select('*')
        .eq('user_id', userEmail)
      
      searchResult = data
      searchError = error
    }
    
    // Test 3: Intentar inserción de prueba
    let insertTest = null
    let insertError = null
    
    if (userEmail) {
      const testData = {
        user_id: userEmail,
        nombre: 'TEST_CONDUCTOR_' + Date.now(),
        zona: 'TEST_ZONA',
        telefono: '1234567890',
        activo: true
      }
      
      const { data, error } = await supabase
        .from('conductors')
        .insert(testData)
        .select()
        .single()
      
      insertTest = data
      insertError = error
      
      // Si se insertó, eliminarlo inmediatamente
      if (data && !error) {
        await supabase
          .from('conductors')
          .delete()
          .eq('id', data.id)
      }
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      emailProbado: userEmail,
      tests: {
        estructura: {
          conductores: allConductors,
          error: allError?.message || null,
          campos: allConductors?.[0] ? Object.keys(allConductors[0]) : []
        },
        busqueda: {
          resultado: searchResult,
          error: searchError?.message || null,
          encontrados: searchResult?.length || 0
        },
        insercion: {
          resultado: insertTest,
          error: insertError?.message || null,
          exitoso: !!insertTest && !insertError
        }
      }
    })
    
  } catch (error) {
    console.error('Error in debug conductors API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, userEmail } = body
    
    if (!nombre || !userEmail) {
      return NextResponse.json({ error: 'Nombre y userEmail requeridos' }, { status: 400 })
    }
    
    // Test específico de verificación de duplicados
    console.log('Probando verificación de duplicados...')
    
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id, nombre, user_id')
      .eq('nombre', nombre)
      .eq('user_id', userEmail)
      .maybeSingle()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      busqueda: {
        nombre: nombre,
        userEmail: userEmail,
        encontrado: existing,
        error: existingError?.message || null,
        existe: !!existing
      }
    })
    
  } catch (error) {
    console.error('Error in debug conductors POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

