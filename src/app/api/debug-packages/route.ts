import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES TEST ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        debug: { headerReceived: null }
      }, { status: 401 })
    }

    // Test 1: Verificar conexión a Supabase
    const { data: testConnection, error: connectionError } = await supabase
      .from('packages')
      .select('count(*)')
      .limit(1)

    // Test 2: Verificar tabla conductors
    const { data: conductorsTest, error: conductorsError } = await supabase
      .from('conductors')
      .select('id, nombre, user_id')
      .eq('user_id', userId)

    // Test 3: Verificar estructura de packages
    const { data: packagesStructure, error: packagesError } = await supabase
      .from('packages')
      .select('*')
      .limit(1)

    return NextResponse.json({
      debug: {
        userId,
        tests: {
          connection: {
            success: !connectionError,
            error: connectionError?.message || null,
            data: testConnection
          },
          conductors: {
            success: !conductorsError,
            error: conductorsError?.message || null,
            count: conductorsTest?.length || 0,
            data: conductorsTest
          },
          packagesStructure: {
            success: !packagesError,
            error: packagesError?.message || null,
            structure: packagesStructure?.[0] || null
          }
        }
      }
    })
  } catch (error) {
    console.error('Error in debug packages:', error)
    return NextResponse.json({ 
      error: 'Error en debug',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES CREATE TEST ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado'
      }, { status: 401 })
    }

    const body = await request.json()
    console.log('Body recibido:', body)

    // Test de creación simple
    const testData = {
      tracking: `TEST-${Date.now()}`,
      conductor_id: body.conductor_id,
      tipo: 'Shein/Temu',
      estado: 0,
      fecha_entrega: new Date().toISOString().split('T')[0],
      valor: null
    }

    console.log('Datos de test:', testData)

    // Verificar conductor
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id, nombre')
      .eq('id', body.conductor_id)
      .eq('user_id', userId)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ 
        error: 'Conductor no encontrado',
        debug: {
          conductorId: body.conductor_id,
          userId,
          conductorError: conductorError?.message,
          conductor
        }
      }, { status: 400 })
    }

    // Intentar insertar
    const { data: newPackage, error: insertError } = await supabase
      .from('packages')
      .insert([testData])
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ 
        error: 'Error al insertar',
        debug: {
          insertError: insertError.message,
          testData,
          conductor
        }
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      package: newPackage,
      debug: {
        testData,
        conductor
      }
    })

  } catch (error) {
    console.error('Error in debug packages POST:', error)
    return NextResponse.json({ 
      error: 'Error en debug POST',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

