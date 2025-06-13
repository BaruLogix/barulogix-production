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
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver conductores'
      }, { status: 401 })
    }

    const { data: conductor, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ conductor })
  } catch (error) {
    console.error('Error in GET /api/conductors/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}

// PUT - Actualizar conductor
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para actualizar conductores'
      }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, zona, telefono, email, activo } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Verificar que el conductor existe y pertenece al usuario
    const { data: existing } = await supabase
      .from('conductors')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // Verificar si ya existe otro conductor con el mismo nombre en la misma zona
    const { data: duplicate } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)
      .eq('nombre', nombre)
      .eq('zona', zona)
      .neq('id', params.id)
      .single()

    if (duplicate) {
      return NextResponse.json({ error: 'Ya existe otro conductor con ese nombre en esa zona' }, { status: 400 })
    }

    // Actualizar conductor
    const { data: conductor, error } = await supabase
      .from('conductors')
      .update({
        nombre: nombre.trim(),
        zona: zona.trim(),
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        activo: activo !== undefined ? activo : true
      })
      .eq('id', params.id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating conductor:', error)
      return NextResponse.json({ error: 'Error al actualizar conductor' }, { status: 500 })
    }

    return NextResponse.json({ conductor })
  } catch (error) {
    console.error("Error in PUT /api/conductors/[id]:", error)
    return NextResponse.json({ error: "Error interno del servidor", details: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}

// DELETE - Eliminar conductor
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG CONDUCTOR DELETE ===')
    console.log('User ID recibido:', userId)
    console.log('Conductor ID a eliminar:', params.id)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para eliminar conductores'
      }, { status: 401 })
    }

    // Verificar que el conductor existe y pertenece al usuario
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id, nombre')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    console.log('Conductor existente encontrado:', !!existing)
    console.log('Error al buscar conductor:', existingError)

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // Verificar si el conductor tiene paquetes asignados
    const { data: packages, error: packagesError } = await supabase
      .from('packages')
      .select('id')
      .eq('conductor_id', params.id)
      .eq('user_id', userId)
      .limit(1)

    console.log('Paquetes encontrados:', packages?.length || 0)
    console.log('Error al buscar paquetes:', packagesError)

    if (packages && packages.length > 0) {
      return NextResponse.json({ 
        error: 'No se puede eliminar el conductor porque tiene paquetes asignados. Primero reasigne o elimine los paquetes.' 
      }, { status: 400 })
    }

    // Eliminar credenciales de conductor si existen
    const { error: authDeleteError } = await supabase
      .from('conductor_auth')
      .delete()
      .eq('conductor_id', params.id)

    console.log('Error al eliminar credenciales:', authDeleteError)

    // Eliminar conductor
    const { error: deleteError } = await supabase
      .from('conductors')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    console.log('Error al eliminar conductor:', deleteError)

    if (deleteError) {
      console.error('Error deleting conductor:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar conductor', details: deleteError.message }, { status: 500 })
    }

    console.log('Conductor eliminado exitosamente')
    return NextResponse.json({ message: 'Conductor eliminado exitosamente' })
  } catch (error) {
    console.error('Error in DELETE /api/conductors/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}

