import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })
    }

    // Obtener historial de operaciones del usuario
    const { data: history, error } = await supabase
      .from('admin_operations_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching history:', error)
      return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 })
    }

    return NextResponse.json({ history })
  } catch (error) {
    console.error('Error in history API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { operation_type, description, details, affected_records } = body

    // Registrar la operación en el historial
    const { data, error } = await supabase
      .from('admin_operations_history')
      .insert([
        {
          user_id: userId,
          operation_type,
          description,
          details: details || {},
          affected_records: affected_records || 0,
          can_undo: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()

    if (error) {
      console.error('Error saving to history:', error)
      return NextResponse.json({ error: 'Error al guardar en historial' }, { status: 500 })
    }

    return NextResponse.json({ success: true, history_id: data[0].id })
  } catch (error) {
    console.error('Error in history POST:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
