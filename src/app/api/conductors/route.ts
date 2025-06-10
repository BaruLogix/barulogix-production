import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener conductores del usuario
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    return NextResponse.json({ conductors })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const {
      name,
      email,
      phone,
      license_number,
      license_type,
      license_expiry,
      vehicle_type,
      vehicle_plate,
      vehicle_model,
      vehicle_year,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      salary,
      commission_rate,
      notes
    } = body

    // Validaciones básicas
    if (!name || !email || !license_number) {
      return NextResponse.json({ 
        error: 'Nombre, email y número de licencia son requeridos' 
      }, { status: 400 })
    }

    // Crear conductor
    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim(),
        license_number: license_number.trim(),
        license_type: license_type || 'B',
        license_expiry,
        vehicle_type: vehicle_type?.trim(),
        vehicle_plate: vehicle_plate?.trim().toUpperCase(),
        vehicle_model: vehicle_model?.trim(),
        vehicle_year: vehicle_year ? parseInt(vehicle_year) : null,
        address: address?.trim(),
        emergency_contact_name: emergency_contact_name?.trim(),
        emergency_contact_phone: emergency_contact_phone?.trim(),
        salary: salary ? parseFloat(salary) : null,
        commission_rate: commission_rate ? parseFloat(commission_rate) : 0.00,
        notes: notes?.trim(),
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conductor:', error)
      
      if (error.code === '23505') { // Unique constraint violation
        if (error.message.includes('email')) {
          return NextResponse.json({ error: 'Ya existe un conductor con este email' }, { status: 409 })
        }
        if (error.message.includes('license_number')) {
          return NextResponse.json({ error: 'Ya existe un conductor con este número de licencia' }, { status: 409 })
        }
      }
      
      return NextResponse.json({ error: 'Error al crear conductor' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Conductor creado exitosamente',
      conductor 
    }, { status: 201 })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID del conductor es requerido' }, { status: 400 })
    }

    // Actualizar conductor
    const { data: conductor, error } = await supabase
      .from('conductors')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Asegurar que solo actualice sus propios conductores
      .select()
      .single()

    if (error) {
      console.error('Error updating conductor:', error)
      return NextResponse.json({ error: 'Error al actualizar conductor' }, { status: 500 })
    }

    if (!conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Conductor actualizado exitosamente',
      conductor 
    })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Obtener usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID del conductor es requerido' }, { status: 400 })
    }

    // Verificar si el conductor tiene entregas asignadas
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('conductor_id', id)
      .limit(1)

    if (deliveriesError) {
      console.error('Error checking deliveries:', deliveriesError)
      return NextResponse.json({ error: 'Error al verificar entregas' }, { status: 500 })
    }

    if (deliveries && deliveries.length > 0) {
      // En lugar de eliminar, desactivar el conductor
      const { data: conductor, error } = await supabase
        .from('conductors')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error deactivating conductor:', error)
        return NextResponse.json({ error: 'Error al desactivar conductor' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Conductor desactivado (tiene entregas asignadas)',
        conductor 
      })
    }

    // Eliminar conductor si no tiene entregas
    const { error } = await supabase
      .from('conductors')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting conductor:', error)
      return NextResponse.json({ error: 'Error al eliminar conductor' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Conductor eliminado exitosamente' })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

