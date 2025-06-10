import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener conductor específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const { data: conductor, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ conductor })
  } catch (error) {
    console.error('Error in GET /api/conductors/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// PUT - Actualizar conductor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await request.json()
    const { name, zone, phone, email, is_active } = body

    if (!name || !zone) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Verificar que el conductor existe y pertenece al usuario
    const { data: existing } = await supabase
      .from('conductors')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // Verificar si ya existe otro conductor con el mismo nombre en la misma zona
    const { data: duplicate } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .eq('zone', zone)
      .neq('id', params.id)
      .single()

    if (duplicate) {
      return NextResponse.json({ error: 'Ya existe otro conductor con ese nombre en esa zona' }, { status: 400 })
    }

    // Actualizar conductor
    const { data: conductor, error } = await supabase
      .from('conductors')
      .update({
        name: name.trim(),
        zone: zone.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        is_active: is_active !== undefined ? is_active : true
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating conductor:', error)
      return NextResponse.json({ error: 'Error al actualizar conductor' }, { status: 500 })
    }

    return NextResponse.json({ conductor })
  } catch (error) {
    console.error('Error in PUT /api/conductors/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar conductor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar que el conductor existe y pertenece al usuario
    const { data: existing } = await supabase
      .from('conductors')
      .select('id, name')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // Verificar si el conductor tiene paquetes asignados
    const { data: packages } = await supabase
      .from('packages')
      .select('id')
      .eq('conductor_id', params.id)
      .eq('user_id', user.id)
      .limit(1)

    if (packages && packages.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el conductor porque tiene paquetes asignados. Primero reasigne o elimine los paquetes.' 
      }, { status: 400 })
    }

    // Eliminar conductor
    const { error } = await supabase
      .from('conductors')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting conductor:', error)
      return NextResponse.json({ error: 'Error al eliminar conductor' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Conductor eliminado exitosamente' })
  } catch (error) {
    console.error('Error in DELETE /api/conductors/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

