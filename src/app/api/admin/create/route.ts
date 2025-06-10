import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar si es admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Solo los administradores pueden crear usuarios' },
        { status: 403 }
      )
    }

    const { name, email, password, role, subscription } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Nombre, email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Crear usuario en Supabase Auth usando el cliente admin
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name
      },
      email_confirm: true
    })

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { success: false, error: 'Error al crear usuario' },
        { status: 500 }
      )
    }

    // Actualizar perfil con rol y suscripción específicos
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        role: role || 'user',
        subscription: subscription || 'basic'
      })
      .eq('id', data.user.id)

    if (profileError) {
      console.error('Error updating profile:', profileError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: name,
        role: role || 'user',
        subscription: subscription || 'basic'
      }
    })

  } catch (error) {
    console.error('Error en admin create:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

