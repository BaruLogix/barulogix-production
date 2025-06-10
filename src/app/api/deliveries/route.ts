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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const conductor_id = searchParams.get('conductor_id')
    const customer_id = searchParams.get('customer_id')

    let query = supabase
      .from('deliveries')
      .select(`
        *,
        conductor:conductors(id, name, phone),
        customer:customers(id, name, phone, address)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (status) {
      query = query.eq('status', status)
    }
    if (conductor_id) {
      query = query.eq('conductor_id', conductor_id)
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id)
    }

    const { data: deliveries, error } = await query

    if (error) {
      console.error('Error fetching deliveries:', error)
      return NextResponse.json({ error: 'Error al obtener entregas' }, { status: 500 })
    }

    return NextResponse.json({ deliveries })

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
      customer_id,
      conductor_id,
      package_description,
      package_weight,
      package_dimensions,
      package_value,
      package_type,
      fragile,
      pickup_address,
      pickup_city,
      pickup_contact_name,
      pickup_contact_phone,
      pickup_date,
      pickup_time_start,
      pickup_time_end,
      delivery_address,
      delivery_city,
      delivery_contact_name,
      delivery_contact_phone,
      delivery_date,
      delivery_time_start,
      delivery_time_end,
      priority,
      base_cost,
      additional_fees,
      special_instructions,
      internal_notes
    } = body

    // Validaciones básicas
    if (!customer_id || !package_description || !pickup_address || !delivery_address || !base_cost) {
      return NextResponse.json({ 
        error: 'Cliente, descripción del paquete, direcciones y costo base son requeridos' 
      }, { status: 400 })
    }

    // Generar número de seguimiento único
    const tracking_number = `BL${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Calcular costo total
    const total_cost = parseFloat(base_cost) + (parseFloat(additional_fees) || 0)

    // Crear entrega
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .insert({
        user_id: user.id,
        customer_id,
        conductor_id: conductor_id || null,
        tracking_number,
        package_description: package_description.trim(),
        package_weight: package_weight ? parseFloat(package_weight) : null,
        package_dimensions: package_dimensions?.trim(),
        package_value: package_value ? parseFloat(package_value) : null,
        package_type: package_type || 'standard',
        fragile: fragile || false,
        pickup_address: pickup_address.trim(),
        pickup_city: pickup_city?.trim(),
        pickup_contact_name: pickup_contact_name?.trim(),
        pickup_contact_phone: pickup_contact_phone?.trim(),
        pickup_date,
        pickup_time_start,
        pickup_time_end,
        delivery_address: delivery_address.trim(),
        delivery_city: delivery_city?.trim(),
        delivery_contact_name: delivery_contact_name?.trim(),
        delivery_contact_phone: delivery_contact_phone?.trim(),
        delivery_date,
        delivery_time_start,
        delivery_time_end,
        priority: priority || 'normal',
        base_cost: parseFloat(base_cost),
        additional_fees: parseFloat(additional_fees) || 0,
        total_cost,
        special_instructions: special_instructions?.trim(),
        internal_notes: internal_notes?.trim(),
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating delivery:', error)
      return NextResponse.json({ error: 'Error al crear entrega' }, { status: 500 })
    }

    // Crear entrada en el historial
    await supabase
      .from('delivery_history')
      .insert({
        delivery_id: delivery.id,
        status: 'pending',
        notes: 'Entrega creada',
        updated_by: user.id
      })

    return NextResponse.json({ 
      message: 'Entrega creada exitosamente',
      delivery 
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
    const { id, status, location, notes, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'ID de la entrega es requerido' }, { status: 400 })
    }

    // Obtener entrega actual para comparar estado
    const { data: currentDelivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !currentDelivery) {
      return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 })
    }

    // Actualizar entrega
    const { data: delivery, error } = await supabase
      .from('deliveries')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating delivery:', error)
      return NextResponse.json({ error: 'Error al actualizar entrega' }, { status: 500 })
    }

    // Si el estado cambió, crear entrada en el historial
    if (status && status !== currentDelivery.status) {
      await supabase
        .from('delivery_history')
        .insert({
          delivery_id: id,
          status,
          location: location?.trim(),
          notes: notes?.trim(),
          updated_by: user.id
        })

      // Actualizar timestamps específicos según el estado
      const statusUpdates: any = { status }
      
      if (status === 'picked_up') {
        statusUpdates.actual_pickup = new Date().toISOString()
      } else if (status === 'delivered') {
        statusUpdates.actual_delivery = new Date().toISOString()
      }

      if (Object.keys(statusUpdates).length > 1) {
        await supabase
          .from('deliveries')
          .update(statusUpdates)
          .eq('id', id)
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({ 
      message: 'Entrega actualizada exitosamente',
      delivery 
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
      return NextResponse.json({ error: 'ID de la entrega es requerido' }, { status: 400 })
    }

    // Verificar que la entrega no esté en progreso
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Entrega no encontrada' }, { status: 404 })
    }

    if (['picked_up', 'in_transit', 'out_for_delivery'].includes(delivery.status)) {
      return NextResponse.json({ 
        error: 'No se puede eliminar una entrega en progreso' 
      }, { status: 400 })
    }

    // Eliminar entrega (esto también eliminará el historial por CASCADE)
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting delivery:', error)
      return NextResponse.json({ error: 'Error al eliminar entrega' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Entrega eliminada exitosamente' })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

