import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Validar fortaleza de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Buscar conductor con el token válido
    const { data: conductor, error: conductorError } = await supabase
      .from('conductor_auth')
      .select('conductor_id, reset_token_expires')
      .eq('reset_token', token)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json(
        { error: 'Token de restablecimiento inválido' },
        { status: 400 }
      )
    }

    // Verificar si el token no ha expirado
    const now = new Date()
    const expiresAt = new Date(conductor.reset_token_expires)

    if (now > expiresAt) {
      return NextResponse.json(
        { error: 'El token de restablecimiento ha expirado' },
        { status: 400 }
      )
    }

    // Hash de la nueva contraseña
    const hashedPassword = await hashPassword(password)

    // Actualizar contraseña y limpiar tokens
    const { error: updateError } = await supabase
      .from('conductor_auth')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expires: null
      })
      .eq('conductor_id', conductor.conductor_id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Contraseña restablecida exitosamente'
    })

  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

