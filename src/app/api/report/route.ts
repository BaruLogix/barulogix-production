import { NextRequest, NextResponse } from 'next/server'
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
          can_undo: false, // Los reportes no se pueden deshacer
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error('Error logging operation to history:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })

    const body = await request.json()
    const { report_type, conductor_id, date_from, date_to } = body

    if (!report_type) return NextResponse.json({ error: 'Tipo de reporte requerido' }, { status: 400 })

    // Aquí iría la lógica para generar el reporte...
    // Por ahora, solo registramos la operación en el historial

    let description = `Generar reporte: ${report_type}`
    if (conductor_id) description += ` para el conductor ${conductor_id}`
    if (date_from && date_to) description += ` entre ${date_from} y ${date_to}`

    await logOperation(
      userId,
      `generate_report_${report_type}`,
      description,
      { report_type, conductor_id, date_from, date_to },
      0 // No hay registros afectados directamente
    )

    return NextResponse.json({ message: 'La generación de reportes se registrará en el historial' })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
