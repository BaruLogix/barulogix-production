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
          can_undo: false, // Las operaciones de conductores no se pueden deshacer
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error('Error logging operation to history:', error)
  }
}

// GET - Obtener todos los conductores del usuario logueado
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })

    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`Error fetching conductors: ${error.message}`)

    const stats = {
      total: conductors.length,
      activos: conductors.filter(c => c.activo).length,
      inactivos: conductors.filter(c => !c.activo).length,
      zonas: [...new Set(conductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors, stats })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })

    const body = await request.json()
    const { nombre, zona, telefono, email } = body
    if (!nombre || !zona) return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert({ user_id: userId, nombre, zona, telefono, email, activo: true })
      .select()
      .single()

    if (error) throw new Error(`Error creando conductor: ${error.message}`)

    await logOperation(
      userId,
      'create_conductor',
      `Crear conductor: ${conductor.nombre}`,
      { conductor },
      1
    )

    return NextResponse.json({ conductor }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar conductor
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const conductorId = searchParams.get('id')
    if (!conductorId) return NextResponse.json({ error: 'ID de conductor requerido' }, { status: 400 })

    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, nombre')
      .eq('id', conductorId)
      .eq('user_id', userId)
      .single()

    if (conductorError || !conductor) throw new Error('Conductor no encontrado o no pertenece a su cuenta')

    const { error: deleteError } = await supabase.from('conductors').delete().eq('id', conductorId)
    if (deleteError) throw new Error(`Error eliminando conductor: ${deleteError.message}`)

    await logOperation(
      userId,
      'delete_conductor',
      `Eliminar conductor: ${conductor.nombre}`,
      { conductor },
      1
    )

    return NextResponse.json({ message: 'Conductor eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
