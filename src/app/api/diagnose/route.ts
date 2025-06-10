import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    steps: []
  }

  try {
    // Paso 1: Verificar conexión
    diagnosis.steps.push({ step: 1, action: 'Verificar conexión', status: 'iniciando...' })
    
    const { data: healthCheck, error: healthError } = await supabase
      .from('conductors')
      .select('count')
      .limit(0)
    
    if (healthError) {
      diagnosis.steps[0] = { 
        step: 1, 
        action: 'Verificar conexión', 
        status: 'ERROR', 
        error: healthError,
        solution: 'La tabla conductors no existe o no es accesible'
      }
      return NextResponse.json(diagnosis)
    }
    
    diagnosis.steps[0] = { step: 1, action: 'Verificar conexión', status: 'OK' }

    // Paso 2: Obtener estructura real de la tabla
    diagnosis.steps.push({ step: 2, action: 'Obtener estructura de tabla', status: 'iniciando...' })
    
    const { data: sampleData, error: sampleError } = await supabase
      .from('conductors')
      .select('*')
      .limit(1)
    
    if (sampleError) {
      diagnosis.steps[1] = { 
        step: 2, 
        action: 'Obtener estructura de tabla', 
        status: 'ERROR', 
        error: sampleError 
      }
    } else {
      const columns = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : []
      diagnosis.steps[1] = { 
        step: 2, 
        action: 'Obtener estructura de tabla', 
        status: 'OK',
        availableColumns: columns,
        sampleData: sampleData
      }
    }

    // Paso 3: Intentar inserción mínima
    diagnosis.steps.push({ step: 3, action: 'Probar inserción mínima', status: 'iniciando...' })
    
    const testId = 'test_' + Date.now()
    const minimalInsert = { id: testId }
    
    const { data: insertResult, error: insertError } = await supabase
      .from('conductors')
      .insert(minimalInsert)
      .select()
    
    if (insertError) {
      diagnosis.steps[2] = { 
        step: 3, 
        action: 'Probar inserción mínima', 
        status: 'ERROR', 
        error: insertError,
        attemptedData: minimalInsert
      }
    } else {
      diagnosis.steps[2] = { 
        step: 3, 
        action: 'Probar inserción mínima', 
        status: 'OK',
        result: insertResult
      }
      
      // Limpiar el registro de prueba
      await supabase.from('conductors').delete().eq('id', testId)
    }

    // Paso 4: Probar inserción con nombre y zona
    diagnosis.steps.push({ step: 4, action: 'Probar inserción con nombre/zona', status: 'iniciando...' })
    
    const testId2 = 'test_' + (Date.now() + 1)
    const nameZoneInsert = { 
      id: testId2,
      nombre: 'Test Conductor',
      zona: 'Test Zona'
    }
    
    const { data: nameZoneResult, error: nameZoneError } = await supabase
      .from('conductors')
      .insert(nameZoneInsert)
      .select()
    
    if (nameZoneError) {
      diagnosis.steps[3] = { 
        step: 4, 
        action: 'Probar inserción con nombre/zona', 
        status: 'ERROR', 
        error: nameZoneError,
        attemptedData: nameZoneInsert
      }
    } else {
      diagnosis.steps[3] = { 
        step: 4, 
        action: 'Probar inserción con nombre/zona', 
        status: 'OK',
        result: nameZoneResult
      }
      
      // Limpiar el registro de prueba
      await supabase.from('conductors').delete().eq('id', testId2)
    }

    // Paso 5: Probar inserción completa
    diagnosis.steps.push({ step: 5, action: 'Probar inserción completa', status: 'iniciando...' })
    
    const testId3 = 'test_' + (Date.now() + 2)
    const fullInsert = { 
      id: testId3,
      nombre: 'Test Conductor Full',
      zona: 'Test Zona Full',
      telefono: '1234567890',
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    const { data: fullResult, error: fullError } = await supabase
      .from('conductors')
      .insert(fullInsert)
      .select()
    
    if (fullError) {
      diagnosis.steps[4] = { 
        step: 5, 
        action: 'Probar inserción completa', 
        status: 'ERROR', 
        error: fullError,
        attemptedData: fullInsert
      }
    } else {
      diagnosis.steps[4] = { 
        step: 5, 
        action: 'Probar inserción completa', 
        status: 'OK',
        result: fullResult
      }
      
      // Limpiar el registro de prueba
      await supabase.from('conductors').delete().eq('id', testId3)
    }

    return NextResponse.json(diagnosis)

  } catch (error) {
    diagnosis.steps.push({
      step: 'ERROR_GENERAL',
      action: 'Error no controlado',
      status: 'FATAL',
      error: {
        message: error.message,
        stack: error.stack
      }
    })
    
    return NextResponse.json(diagnosis)
  }
}

