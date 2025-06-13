import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateVerificationToken } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token de verificación no proporcionado' }, { status: 400 })
    }

    // 1. Buscar el conductor por el token de verificación
    const { data: conductorAuth, error: findError } = await supabaseAdmin
      .from('conductor_auth')
      .select('*')
      .eq('verification_token', token)
      .single()

    if (findError || !conductorAuth) {
      return NextResponse.json({ error: 'Token de verificación inválido o expirado' }, { status: 400 })
    }

    // 2. Verificar si el token ha expirado
    const now = new Date()
    const tokenExpires = new Date(conductorAuth.verification_token_expires)
    if (now > tokenExpires) {
      return NextResponse.json({ error: 'Token de verificación expirado' }, { status: 400 })
    }

    // 3. Marcar el email como verificado y limpiar el token
    const { error: updateError } = await supabaseAdmin
      .from('conductor_auth')
      .update({
        email_verified: true,
        verification_token: null,
        verification_token_expires: null,
      })
      .eq('id', conductorAuth.id)

    if (updateError) {
      console.error('Error al actualizar estado de verificación:', updateError)
      return NextResponse.json({ error: 'Error interno al verificar email' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Email verificado exitosamente. Ya puedes iniciar sesión.' }, { status: 200 })

  } catch (error) {
    console.error('Error en la API de verificación de email:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


