import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configurada' : 'NO CONFIGURADA',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configurada' : 'NO CONFIGURADA'
    },
    tests: []
  }

  try {
    // Test 1: Conexión básica
    debugInfo.tests.push({ test: 'Conexión básica', status: 'iniciando...' })
    
    const { data: connectionTest, error: connectionError } = await supabase
      .from('conductors')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Conexión básica',
        status: 'ERROR',
        error: connectionError
      }
    } else {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Conexión básica',
        status: 'OK',
        result: connectionTest
      }
    }

    // Test 2: Verificar esquema de tabla
    debugInfo.tests.push({ test: 'Esquema de tabla', status: 'iniciando...' })
    
    const { data: schemaTest, error: schemaError } = await supabase
      .from('conductors')
      .select('*')
      .limit(1)
    
    if (schemaError) {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Esquema de tabla',
        status: 'ERROR',
        error: schemaError
      }
    } else {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Esquema de tabla',
        status: 'OK',
        result: schemaTest,
        columns: schemaTest && schemaTest.length > 0 ? Object.keys(schemaTest[0]) : 'Tabla vacía'
      }
    }

    // Test 3: Intentar inserción simple
    debugInfo.tests.push({ test: 'Inserción de prueba', status: 'iniciando...' })
    
    const testData = {
      nombre: 'Test Debug ' + Date.now(),
      zona: 'Debug Zone'
    }
    
    const { data: insertTest, error: insertError } = await supabase
      .from('conductors')
      .insert(testData)
      .select()
      .single()
    
    if (insertError) {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Inserción de prueba',
        status: 'ERROR',
        error: insertError,
        attemptedData: testData
      }
    } else {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Inserción de prueba',
        status: 'OK',
        result: insertTest
      }
      
      // Limpiar el registro de prueba
      await supabase.from('conductors').delete().eq('id', insertTest.id)
    }

    // Test 4: Verificar permisos RLS
    debugInfo.tests.push({ test: 'Permisos RLS', status: 'iniciando...' })
    
    const { data: rlsTest, error: rlsError } = await supabase
      .rpc('has_table_privilege', { 
        table_name: 'conductors', 
        privilege: 'INSERT' 
      })
    
    if (rlsError) {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Permisos RLS',
        status: 'ERROR',
        error: rlsError
      }
    } else {
      debugInfo.tests[debugInfo.tests.length - 1] = {
        test: 'Permisos RLS',
        status: 'OK',
        result: rlsTest
      }
    }

  } catch (error) {
    debugInfo.tests.push({
      test: 'Error general',
      status: 'FATAL ERROR',
      error: {
        message: error.message,
        stack: error.stack
      }
    })
  }

  return NextResponse.json(debugInfo, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      receivedData: body,
      steps: []
    }

    // Paso 1: Validar datos
    debugInfo.steps.push({ step: 'Validación', status: 'OK', data: body })
    
    const { nombre, zona, telefono } = body
    
    if (!nombre || !zona) {
      return NextResponse.json({
        ...debugInfo,
        error: 'Faltan campos obligatorios',
        steps: [...debugInfo.steps, { step: 'Validación', status: 'ERROR', reason: 'Campos faltantes' }]
      }, { status: 400 })
    }

    // Paso 2: Verificar existente
    debugInfo.steps.push({ step: 'Verificar existente', status: 'iniciando...' })
    
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle()

    if (existingError) {
      debugInfo.steps[debugInfo.steps.length - 1] = {
        step: 'Verificar existente',
        status: 'ERROR',
        error: existingError
      }
      return NextResponse.json(debugInfo, { status: 500 })
    }

    debugInfo.steps[debugInfo.steps.length - 1] = {
      step: 'Verificar existente',
      status: 'OK',
      result: existing ? 'Existe' : 'No existe'
    }

    if (existing) {
      return NextResponse.json({
        ...debugInfo,
        error: 'Ya existe un conductor con ese nombre'
      }, { status: 400 })
    }

    // Paso 3: Insertar
    debugInfo.steps.push({ step: 'Insertar conductor', status: 'iniciando...' })
    
    const insertData = {
      nombre: nombre.trim(),
      zona: zona.trim()
    }

    const { data: conductor, error: insertError } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (insertError) {
      debugInfo.steps[debugInfo.steps.length - 1] = {
        step: 'Insertar conductor',
        status: 'ERROR',
        error: insertError,
        attemptedData: insertData
      }
      return NextResponse.json(debugInfo, { status: 500 })
    }

    debugInfo.steps[debugInfo.steps.length - 1] = {
      step: 'Insertar conductor',
      status: 'OK',
      result: conductor
    }

    return NextResponse.json({
      ...debugInfo,
      success: true,
      conductor
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({
      error: 'Error general',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

