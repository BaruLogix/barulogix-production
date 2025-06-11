import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('=== DIAGNÓSTICO COMPLETO DE CONDUCTORS ===')
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Verificar conexión básica
    try {
      const { data, error } = await supabase
        .from('conductors')
        .select('count(*)')
        .single()
      
      results.tests.push({
        test: 'Conexión básica',
        status: error ? 'ERROR' : 'OK',
        result: data,
        error: error
      })
    } catch (e) {
      results.tests.push({
        test: 'Conexión básica',
        status: 'ERROR',
        error: e.message
      })
    }

    // Test 2: Verificar estructura de tabla
    try {
      const { data, error } = await supabase
        .from('conductors')
        .select('*')
        .limit(1)
      
      results.tests.push({
        test: 'Estructura de tabla',
        status: error ? 'ERROR' : 'OK',
        result: data,
        columns: data && data.length > 0 ? Object.keys(data[0]) : 'Tabla vacía',
        error: error
      })
    } catch (e) {
      results.tests.push({
        test: 'Estructura de tabla',
        status: 'ERROR',
        error: e.message
      })
    }

    // Test 3: Probar inserción con UUID correcto
    try {
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        nombre: `Test ${Date.now()}`,
        zona: 'Test Zone',
        telefono: '1234567890',
        activo: true
      }

      const { data, error } = await supabase
        .from('conductors')
        .insert(testData)
        .select()
        .single()

      if (!error && data) {
        // Eliminar el registro de prueba
        await supabase
          .from('conductors')
          .delete()
          .eq('id', data.id)
      }

      results.tests.push({
        test: 'Inserción completa',
        status: error ? 'ERROR' : 'OK',
        result: data,
        attemptedData: testData,
        error: error
      })
    } catch (e) {
      results.tests.push({
        test: 'Inserción completa',
        status: 'ERROR',
        error: e.message
      })
    }

    // Test 4: Probar inserción mínima
    try {
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000',
        nombre: `Test Min ${Date.now()}`,
        zona: 'Test Zone Min'
      }

      const { data, error } = await supabase
        .from('conductors')
        .insert(testData)
        .select()
        .single()

      if (!error && data) {
        // Eliminar el registro de prueba
        await supabase
          .from('conductors')
          .delete()
          .eq('id', data.id)
      }

      results.tests.push({
        test: 'Inserción mínima',
        status: error ? 'ERROR' : 'OK',
        result: data,
        attemptedData: testData,
        error: error
      })
    } catch (e) {
      results.tests.push({
        test: 'Inserción mínima',
        status: 'ERROR',
        error: e.message
      })
    }

    // Test 5: Verificar permisos RLS
    try {
      const { data, error } = await supabase.rpc('version')
      
      results.tests.push({
        test: 'Permisos y RLS',
        status: error ? 'ERROR' : 'OK',
        result: data,
        error: error
      })
    } catch (e) {
      results.tests.push({
        test: 'Permisos y RLS',
        status: 'ERROR',
        error: e.message
      })
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Error en diagnóstico:', error)
    return NextResponse.json({ 
      error: 'Error en diagnóstico',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('=== TEST POST CONDUCTORS ===')
    console.log('Body recibido:', body)
    
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Intentar inserción paso a paso con logs detallados
    const insertData = {
      user_id: '00000000-0000-0000-0000-000000000000',
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    }

    console.log('Datos a insertar:', insertData)

    const { data, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    console.log('Resultado inserción:', { data, error })

    if (error) {
      return NextResponse.json({ 
        error: 'Error al crear conductor',
        details: error.message,
        code: error.code,
        hint: error.hint,
        insertData: insertData
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      conductor: data,
      message: 'Conductor creado exitosamente'
    })

  } catch (error) {
    console.error('Error en POST test:', error)
    return NextResponse.json({ 
      error: 'Error interno',
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

