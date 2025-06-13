import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyPassword, generateConductorJWT, isValidEmail } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // 1. Validar inputs
    if (!email || !password) {
      return NextResponse.json({ error: 'Email y contraseña son requeridos' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
    }

    // 2. Buscar al conductor en conductor_auth
    const { data: conductorAuth, error: authError } = await supabaseAdmin
      .from('conductor_auth')
      .select('*')
      .eq('email', email)
      .single()

    if (authError || !conductorAuth) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // 3. Verificar contraseña
    const passwordMatch = await verifyPassword(password, conductorAuth.password_hash)
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // 4. Verificar si el email está verificado
    if (!conductorAuth.email_verified) {
      return NextResponse.json({ error: 'Por favor, verifica tu email antes de iniciar sesión.' }, { status: 403 })
    }

    // 5. Generar JWT para el conductor
    const token = generateConductorJWT({
      id: conductorAuth.id,
      conductor_id: conductorAuth.conductor_id,
      email: conductorAuth.email,
      email_verified: conductorAuth.email_verified,
    })

    // 6. Retornar token y datos del conductor
    return NextResponse.json({
      message: 'Inicio de sesión exitoso',
      token,
      conductor: {
        id: conductorAuth.conductor_id,
        email: conductorAuth.email,
      },
    }, { status: 200 })

  } catch (error) {
    console.error('Error en la API de login de conductor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}


