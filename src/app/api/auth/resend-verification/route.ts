import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    console.log('=== RESEND VERIFICATION EMAIL ===')
    console.log('Email:', email)
    console.log('Timestamp:', new Date().toISOString())

    if (!email) {
      return NextResponse.json({
        success: false,
        error: 'Email es requerido'
      }, { status: 400 })
    }

    // Crear cliente de Supabase
    const supabase = createClient()

    // Reenviar email de verificación
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${process.env.NEXTAUTH_URL || 'https://barulogix.vercel.app'}/auth/login?verified=true`
      }
    })

    if (error) {
      console.log('RESEND ERROR:', error)
      return NextResponse.json({
        success: false,
        error: 'Error al reenviar email de verificación: ' + error.message
      }, { status: 400 })
    }

    console.log('Verification email resent successfully')

    return NextResponse.json({
      success: true,
      message: 'Email de verificación reenviado exitosamente',
      friendlyMessage: 'Te hemos enviado un nuevo email de verificación. Por favor, revisa tu bandeja de entrada y la carpeta de spam.'
    })

  } catch (error: any) {
    console.log('=== RESEND API ERROR ===')
    console.log('Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

