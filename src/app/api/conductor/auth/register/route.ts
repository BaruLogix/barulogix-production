import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidEmail, isValidPassword, hashPassword, generateVerificationToken } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] === INICIO REGISTER API (MANUAL) ===`)
  
  try {
    const { conductor_id, email, password } = await req.json()

    console.log(`[${requestId}] === DEBUG REGISTER API ===`)
    console.log(`[${requestId}] Conductor ID:`, conductor_id)
    console.log(`[${requestId}] Email:`, email)
    console.log(`[${requestId}] Password provided:`, !!password)

    // 1. Validar inputs
    if (!conductor_id || !email || !password) {
      console.log(`[${requestId}] Validation Error: Missing conductor_id, email, or password`)
      return NextResponse.json({ error: 'Conductor ID, email y contraseña son requeridos' }, { status: 400 })
    }

    if (!isValidEmail(email)) {
      console.log(`[${requestId}] Validation Error: Invalid email format`)
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
    }

    const passwordValidation = isValidPassword(password)
    if (!passwordValidation.valid) {
      console.log(`[${requestId}] Validation Error: Invalid password:`, passwordValidation.message)
      return NextResponse.json({ error: passwordValidation.message }, { status: 400 })
    }

    // 2. Verificar si el conductor_id existe en la tabla conductors
    console.log(`[${requestId}] Checking if conductor_id exists:`, conductor_id)
    const { data: conductorData, error: conductorError } = await supabaseAdmin
      .from('conductors')
      .select('id, nombre')
      .eq('id', conductor_id)
      .single()

    if (conductorError || !conductorData) {
      console.error(`[${requestId}] Error or Conductor ID not found:`, conductorError)
      return NextResponse.json({ error: 'Conductor ID no encontrado o error al buscar conductor' }, { status: 404 })
    }
    console.log(`[${requestId}] Conductor data found:`, { id: conductorData.id, nombre: conductorData.nombre })

    // 3. Verificar si el email ya existe en conductor_auth
    console.log(`[${requestId}] Checking if email already exists in conductor_auth...`)
    const { data: existingAuth, error: checkError } = await supabaseAdmin
      .from('conductor_auth')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`[${requestId}] Error checking existing email:`, checkError)
      return NextResponse.json({ error: 'Error interno al verificar email' }, { status: 500 })
    }

    if (existingAuth) {
      console.log(`[${requestId}] Email already exists in conductor_auth:`, existingAuth)
      return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
    }

    console.log(`[${requestId}] Email is available for registration`)

    // 4. Hashear la contraseña
    console.log(`[${requestId}] Hashing password...`)
    const hashedPassword = await hashPassword(password)
    console.log(`[${requestId}] Password hashed successfully. Value: ${hashedPassword ? 'Present' : 'NULL/Undefined'}`)

    if (!hashedPassword) {
      console.error(`[${requestId}] Hashed password is NULL or undefined after hashing.`)
      return NextResponse.json({ error: 'Error interno al hashear la contraseña' }, { status: 500 })
    }

    // 5. Generar token de verificación
    console.log(`[${requestId}] Generating verification token...`)
    const verificationToken = generateVerificationToken()
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    console.log(`[${requestId}] Verification token generated`)

    // 6. Crear entrada en conductor_auth
    console.log(`[${requestId}] Creating conductor_auth entry...`)
    const { data: conductorAuthData, error: conductorAuthError } = await supabaseAdmin
      .from('conductor_auth')
      .insert({
        conductor_id: conductor_id,
        email: email.toLowerCase().trim(),
        password_hash: hashedPassword,
        email_verified: false,
        verification_token: verificationToken,
        verification_token_expires: verificationTokenExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (conductorAuthError) {
      console.error(`[${requestId}] Error creating conductor_auth entry:`, conductorAuthError)
      
      // Manejar específicamente el error de unique constraint violation
      if (conductorAuthError.code === '23505') {
        console.log(`[${requestId}] Unique constraint violation - email already exists`)
        return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Error interno al crear credenciales del conductor' }, { status: 500 })
    }

    console.log(`[${requestId}] Conductor auth entry created successfully:`, {
      id: conductorAuthData.id,
      conductor_id: conductorAuthData.conductor_id,
      email: conductorAuthData.email
    })

    // 7. Enviar correo de verificación
    console.log(`[${requestId}] Sending verification email...`)
    try {
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://barulogix-production.vercel.app'}/auth/conductor/verify?token=${verificationToken}`
      
      // Usar Supabase para enviar el correo de verificación
      const { error: emailError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email.toLowerCase().trim(),
        options: {
          redirectTo: verificationUrl
        }
      })

      if (emailError) {
        console.error(`[${requestId}] Error sending verification email:`, emailError)
        // No fallar la operación completa por un error de email
        console.log(`[${requestId}] Continuing despite email error...`)
      } else {
        console.log(`[${requestId}] Verification email sent successfully`)
      }
    } catch (emailError) {
      console.error(`[${requestId}] Exception sending verification email:`, emailError)
      // No fallar la operación completa por un error de email
    }

    console.log(`[${requestId}] === REGISTRO EXITOSO ===`)
    return NextResponse.json({ 
      message: 'Conductor registrado exitosamente. Por favor, verifica tu email para completar el registro.',
      email_verification_required: true
    }, { status: 201 })

  } catch (error) {
    console.error(`[${requestId}] Error general en la API de registro de conductor:`, error)
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}

