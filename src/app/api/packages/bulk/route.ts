import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, data, conductor_id } = body

    if (!tipo || !data || !conductor_id) {
      return NextResponse.json({ error: 'Tipo, datos y conductor son requeridos' }, { status: 400 })
    }

    // Verificar que el conductor existe
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id')
      .eq('id', conductor_id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 400 })
    }

    let packagesToInsert = []
    let errors = []

    if (tipo === 'shein_temu') {
      // Procesar datos de Shein/Temu (solo trackings)
      const trackings = data.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      for (let i = 0; i < trackings.length; i++) {
        const tracking = trackings[i]
        
        if (tracking.length < 3) {
          errors.push(`Línea ${i + 1}: Tracking muy corto: "${tracking}"`)
          continue
        }

        // Verificar si ya existe
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Shein/Temu',
          estado: 0, // No entregado
          fecha_entrega: new Date().toISOString().split('T')[0],
          valor: null
        })
      }
    } else if (tipo === 'dropi') {
      // Procesar datos de Dropi (tracking + valor)
      const lines = data.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
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

        // Convertir valor a número
        const valor = parseFloat(valorStr.replace(/[^\d.-]/g, '')) // Remover caracteres no numéricos excepto punto y guión
        
        if (isNaN(valor) || valor <= 0) {
          errors.push(`Línea ${i + 1}: Valor inválido: "${valorStr}"`)
          continue
        }

        // Verificar si ya existe
        const { data: existing } = await supabase
          .from('packages')
          .select('id')
          .eq('tracking', tracking)
          .single()

        if (existing) {
          errors.push(`Línea ${i + 1}: Tracking ya existe: "${tracking}"`)
          continue
        }

        packagesToInsert.push({
          tracking: tracking,
          conductor_id: conductor_id,
          tipo: 'Dropi',
          estado: 0, // No entregado
          fecha_entrega: new Date().toISOString().split('T')[0],
          valor: valor
        })
      }
    } else {
      return NextResponse.json({ error: 'Tipo de paquete no válido' }, { status: 400 })
    }

    // Insertar paquetes válidos
    let insertedCount = 0
    if (packagesToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('packages')
        .insert(packagesToInsert)
        .select()

      if (insertError) {
        console.error('Error inserting packages:', insertError)
        return NextResponse.json({ error: 'Error al insertar paquetes' }, { status: 500 })
      }

      insertedCount = inserted.length
    }

    return NextResponse.json({
      success: true,
      inserted: insertedCount,
      errors: errors,
      total_processed: packagesToInsert.length + errors.length
    })

  } catch (error) {
    console.error('Error in bulk packages API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

