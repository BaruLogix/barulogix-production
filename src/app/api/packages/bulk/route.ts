import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para registrar operaciones en el historial
async function logOperation(userId: string, operationType: string, description: string, details: any, affectedRecords: number) {
  try {
    await supabase
      .from('admin_operations_history')
      .insert([
        {
          user_id: userId,
          operation_type: operationType,
          description,
          details,
          affected_records: affectedRecords,
          can_undo: true,
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error("Error logging operation to history:", error)
    console.log("--- DETALLES DEL ERROR DE LOGGING ---")
    console.log("User ID:", userId)
    console.log("Operation Type:", operationType)
    console.log("Description:", description)
    console.log("Details:", JSON.stringify(details, null, 2))
    console.log("Affected Records:", affectedRecords)
    console.log("--- FIN DETALLES DEL ERROR DE LOGGING ---")
    // No fallar la operación principal si falla el log
  }
}

export async function POST(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES BULK POST ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear paquetes masivos'
      }, { status: 401 })
    }

    console.log('Creando paquetes masivos para user ID:', userId)

    const body = await request.json()
    console.log('Body recibido para bulk:', body)
    
    const { tipo, data, conductor_id, fecha_entrega } = body

    if (!tipo || !data || !conductor_id || !fecha_entrega) {
      console.log('ERROR: Faltan campos requeridos en bulk')
      return NextResponse.json({ error: 'Tipo, datos, conductor y fecha de entrega son requeridos' }, { status: 400 })
    }

    console.log('Validando conductor para bulk:', conductor_id, 'usuario:', userId)

    // Verificar que el conductor existe Y pertenece al usuario actual
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id')
      .eq('id', conductor_id)
      .eq('user_id', userId) // Solo conductores del usuario actual
      .single()

    console.log('Resultado validación conductor bulk:', conductor, conductorError)

    if (conductorError || !conductor) {
      console.log('ERROR: Conductor no encontrado en bulk')
      return NextResponse.json({ error: 'Conductor no encontrado o no pertenece a su bodega' }, { status: 400 })
    }

    // Obtener todos los conductores del usuario para verificar duplicados
    const { data: userConductors, error: userConductorsError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)

    if (userConductorsError) {
      console.error('Error obteniendo conductores del usuario:', userConductorsError)
      return NextResponse.json({ error: 'Error verificando conductores' }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)
    console.log('IDs de conductores del usuario para bulk:', conductorIds)

    let packagesToInsert = []
    let errors = []

    if (tipo === 'paquetes_pagos' || tipo === 'shein_temu') {
      console.log('Procesando datos Paquetes Pagos...')
      // Procesar datos de Paquetes Pagos (solo trackings)
      const trackings = data.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      console.log('Trackings encontrados:', trackings.length)
      
      for (let i = 0; i < trackings.length; i++) {
        const tracking = trackings[i]
        
        if (tracking.length < 3) {
          errors.push(`Línea ${i + 1}: Tracking muy corto: "${tracking}"`)
          continue
        }

        // Verificar duplicados solo en conductores del usuario
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .in('conductor_id', conductorIds)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe en su bodega: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Paquetes Pagos',
          estado: 0, // No entregado
          fecha_entrega: fecha_entrega, // Usar fecha proporcionada
          valor: null
        })
      }
    } else if (tipo === 'paquetes_cod' || tipo === 'dropi') {
      console.log('Procesando datos Paquetes COD...')
      // Procesar datos de Paquetes COD (tracking + valor)
      const lines = data.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0)
      console.log('Líneas COD encontradas:', lines.length)
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const parts = line.split('\t') // Separado por tabs (Excel)
        
        if (parts.length < 2) {
          errors.push(`Línea ${i + 1}: Formato incorrecto. Debe tener tracking y valor separados por tab: "${line}"`)
          continue
        }

        const tracking = parts[0].trim()
        const valorStr = parts[1].trim()
        
        if (tracking.length < 3) {
          errors.push(`Línea ${i + 1}: Tracking muy corto: "${tracking}"`)
          continue
        }

        const valor = parseFloat(valorStr.replace(/[^\d.-]/g, ''))
        if (isNaN(valor) || valor <= 0) {
          errors.push(`Línea ${i + 1}: Valor inválido: "${valorStr}"`)
          continue
        }

        // Verificar duplicados solo en conductores del usuario
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .in('conductor_id', conductorIds)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe en su bodega: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Paquetes Pago Contra Entrega (COD)',
          estado: 0, // No entregado
          fecha_entrega: fecha_entrega, // Usar fecha proporcionada
          valor: valor
        })
      }
    } else {
      console.log('ERROR: Tipo de paquete inválido:', tipo)
      return NextResponse.json({ error: 'Tipo de paquete inválido' }, { status: 400 })
    }

    console.log(`Paquetes a insertar: ${packagesToInsert.length}`)
    console.log(`Errores encontrados: ${errors.length}`)
    console.log('Primeros 3 paquetes a insertar:', packagesToInsert.slice(0, 3))

    // Insertar paquetes válidos
    let insertedCount = 0
    if (packagesToInsert.length > 0) {
      console.log('Insertando paquetes en la base de datos...')
      
      const { data: insertedPackages, error: insertError } = await supabase
        .from('packages')
        .insert(packagesToInsert)
        .select()

      console.log('Resultado inserción bulk:', insertedPackages?.length || 0, insertError)

      if (insertError) {
        console.error('ERROR CRÍTICO insertando paquetes bulk:', insertError)
        console.error('Detalles del error bulk:', JSON.stringify(insertError, null, 2))
        return NextResponse.json({ 
          error: 'Error al insertar paquetes en la base de datos',
          details: insertError.message,
          code: insertError.code
        }, { status: 500 })
      }

      insertedCount = insertedPackages?.length || 0
      console.log('Paquetes insertados exitosamente:', insertedCount)
    }

    await logOperation(
      userId,
      'create_bulk_packages',
      `Crear paquetes masivos: ${insertedCount} paquetes de tipo "${tipo}"`,
      {
        tipo,
        conductor_id,
        fecha_entrega,
        inserted_packages: packagesToInsert,
        errors
      },
      insertedCount
    );

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      total_processed: packagesToInsert.length + errors.length,
      errors: errors
    });

  } catch (error) {
    console.error('ERROR CRÍTICO en packages bulk POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

