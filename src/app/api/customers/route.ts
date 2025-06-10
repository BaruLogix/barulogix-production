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

    // Obtener clientes del usuario
    const { data: customers, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 })
    }

    return NextResponse.json({ customers })

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
      company,
      address,
      city,
      state,
      postal_code,
      country,
      customer_type,
      credit_limit,
      payment_terms,
      tax_id,
      notes
    } = body

    // Validaciones básicas
    if (!name || !address) {
      return NextResponse.json({ 
        error: 'Nombre y dirección son requeridos' 
      }, { status: 400 })
    }

    // Crear cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        user_id: user.id,
        name: name.trim(),
        email: email?.trim().toLowerCase(),
        phone: phone?.trim(),
        company: company?.trim(),
        address: address.trim(),
        city: city?.trim(),
        state: state?.trim(),
        postal_code: postal_code?.trim(),
        country: country?.trim() || 'Colombia',
        customer_type: customer_type || 'regular',
        credit_limit: credit_limit ? parseFloat(credit_limit) : 0.00,
        payment_terms: payment_terms ? parseInt(payment_terms) : 30,
        tax_id: tax_id?.trim(),
        notes: notes?.trim(),
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating customer:', error)
      
      if (error.code === '23505' && error.message.includes('email')) {
        return NextResponse.json({ error: 'Ya existe un cliente con este email' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Cliente creado exitosamente',
      customer 
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
      return NextResponse.json({ error: 'ID del cliente es requerido' }, { status: 400 })
    }

    // Actualizar cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating customer:', error)
      return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 })
    }

    if (!customer) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ 
      message: 'Cliente actualizado exitosamente',
      customer 
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
      return NextResponse.json({ error: 'ID del cliente es requerido' }, { status: 400 })
    }

    // Verificar si el cliente tiene entregas
    const { data: deliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select('id')
      .eq('customer_id', id)
      .limit(1)

    if (deliveriesError) {
      console.error('Error checking deliveries:', deliveriesError)
      return NextResponse.json({ error: 'Error al verificar entregas' }, { status: 500 })
    }

    if (deliveries && deliveries.length > 0) {
      // En lugar de eliminar, desactivar el cliente
      const { data: customer, error } = await supabase
        .from('customers')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error deactivating customer:', error)
        return NextResponse.json({ error: 'Error al desactivar cliente' }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Cliente desactivado (tiene entregas asociadas)',
        customer 
      })
    }

    // Eliminar cliente si no tiene entregas
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting customer:', error)
      return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Cliente eliminado exitosamente' })

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

