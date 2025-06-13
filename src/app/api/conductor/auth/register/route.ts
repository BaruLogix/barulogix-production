import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword, generateVerificationToken, isValidEmail, isValidPassword, sendVerificationEmail } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(req: NextRequest) {
  try {
    const { conductor_id, email, password } = await req.json()

    console.log('=== DEBUG REGISTER API ===')
    console.log('Conductor ID:', conductor_id)
    console.log('Email:', email)
    console.log('Password provided:', !!password)

    // 1. Validar inputs
    if (!conductor_id || !email || !password) {
      console.log('Validation Error: Missing conductor_id, email, or password')
      return NextResponse.json({ error: 'Conductor ID, email y contraseña son requeridos' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      console.log('Validation Error: Invalid email format')
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
    }

    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      console.log('Validation Error: Invalid password:', passwordValidation.message)
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    // 2. Verificar si el conductor_id existe en la tabla conductors
    console.log('Checking if conductor_id exists:', conductor_id)
    const { data: conductorData, error: conductorError } = await supabaseAdmin
      .from('conductors')
      .select('id, nombre')
      .eq('id', conductor_id)
      .single()

    if (conductorError || !conductorData) {
      console.error('Error or Conductor ID not found:', conductorError)
      return NextResponse.json({ error: 'Conductor ID no encontrado o error al buscar conductor' }, { status: 404 })
    }
    console.log('Conductor data found:', conductorData)

    // 3. Verificar si el email ya está registrado en conductor_auth
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Checking for existing email in conductor_auth (normalized):', normalizedEmail)
    const { data: existingAuth, error: existingAuthError } = await supabaseAdmin
      .from('conductor_auth')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle() // <-- Changed from single() to maybeSingle()

    console.log('Existing auth data (after maybeSingle):', existingAuth)
    console.log('Existing auth error (after maybeSingle):', existingAuthError)

    if (existingAuthError && existingAuthError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing email (unexpected error):', existingAuthError)
      return NextResponse.json({ error: 'Error al verificar email existente' }, { status: 500 })
    }

    if (existingAuth) {
      console.log('Email already registered for another conductor (conflict):', existingAuth.id)
      return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
    }
    console.log('Email is not registered, proceeding to hash password.')

    // 4. Hashear la contraseña
    const passwordHash = await hashPassword(password)
    console.log('Password hashed.')

    // 5. Generar token de verificación
    const verificationToken = generateVerificationToken()
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    console.log('Verification token generated.')

    // 6. Insertar en la tabla conductor_auth
    console.log('Inserting new conductor auth entry for conductor_id:', conductor_id, 'email:', normalizedEmail)
    const { data: newConductorAuth, error: insertError } = await supabaseAdmin
      .from('conductor_auth')
      .insert({
        conductor_id: conductor_id,
        email: normalizedEmail,
        password_hash: passwordHash,
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error al registrar conductor en conductor_auth (insert error):', insertError)
      return NextResponse.json({ error: 'Error interno al registrar conductor' }, { status: 500 })
    }

    console.log('Conductor auth entry created successfully:', newConductorAuth)

    // 7. Enviar correo de verificación usando la función centralizada
    try {
      console.log('Attempting to send verification email to:', normalizedEmail)
      await sendVerificationEmail(
        normalizedEmail,
        conductorData.nombre || 'Conductor',
        verificationToken
      )
      console.log('Verification email sent successfully.')
    } catch (emailError) {
      console.error('Error al enviar correo de verificación:', emailError)
      // Aunque falle el email, el registro en DB fue exitoso
      return NextResponse.json({ message: 'Conductor registrado, pero falló el envío del correo de verificación.' }, { status: 200 })
    }

    console.log('Conductor registration process completed successfully.')
    return NextResponse.json({ message: 'Conductor registrado exitosamente. Por favor, verifica tu email.' }, { status: 201 })

  } catch (error) {
    console.error('Error general en la API de registro de conductor:', error)
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}


