import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVerificationToken, sendPasswordResetEmail } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email es requerido' },
        { status: 400 }
      )
    }

    // Verificar si existe un conductor con ese email
    const { data: conductor, error: conductorError } = await supabase
      .from('conductor_auth')
      .select('conductor_id, email')
      .eq('email', email)
      .eq('email_verified', true)
      .single()

    if (conductorError || !conductor) {
      // Por seguridad, no revelamos si el email existe o no
      return NextResponse.json({
        message: 'Si el email existe en nuestro sistema, recibirás un correo con instrucciones para restablecer tu contraseña.'
      })
    }

    // Generar token de restablecimiento
    const resetToken = generateVerificationToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    // Guardar token en la base de datos
    const { error: updateError } = await supabase
      .from('conductor_auth')
      .update({
        reset_token: resetToken,
        reset_token_expires: expiresAt.toISOString()
      })
      .eq('conductor_id', conductor.conductor_id)

    if (updateError) {
      console.error('Error saving reset token:', updateError)
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      )
    }

    // Obtener información del conductor para el email
    const { data: conductorInfo } = await supabase
      .from('conductors')
      .select('nombre')
      .eq('id', conductor.conductor_id)
      .single()

    // Enviar email de restablecimiento
    try {
      await sendPasswordResetEmail(
        email,
        conductorInfo?.nombre || 'Conductor',
        resetToken
      )
    } catch (emailError) {
      console.error('Error sending reset email:', emailError)
      // No revelamos el error de email por seguridad
    }

    return NextResponse.json({
      message: 'Si el email existe en nuestro sistema, recibirás un correo con instrucciones para restablecer tu contraseña.'
    })

  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

