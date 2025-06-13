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
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] === INICIO REGISTER API ===`)
  
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

    // 3. Hashear la contraseña
    const passwordHash = await hashPassword(password)
    console.log(`[${requestId}] Password hashed.`)

    // 4. Generar token de verificación
    const verificationToken = generateVerificationToken()
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
    console.log(`[${requestId}] Verification token generated.`)

    // 5. Insertar en la tabla conductor_auth
    const normalizedEmail = email.toLowerCase().trim()
    console.log(`[${requestId}] Inserting new conductor auth entry for conductor_id:`, conductor_id, 'email:', normalizedEmail)
    
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
      console.error(`[${requestId}] Error al registrar conductor en conductor_auth (insert error):`, {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      })
      
      // Manejar específicamente el error de email duplicado
      if (insertError.code === '23505') {
        console.log(`[${requestId}] Unique constraint violation: Email already registered.`)
        return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
      }
      
      console.log(`[${requestId}] Returning 500 error for non-unique constraint violation`)
      return NextResponse.json({ error: 'Error interno al registrar conductor' }, { status: 500 })
    }

    console.log(`[${requestId}] Conductor auth entry created successfully:`, {
      id: newConductorAuth.id,
      conductor_id: newConductorAuth.conductor_id,
      email: newConductorAuth.email
    })

    // 6. Enviar correo de verificación usando la función centralizada
    try {
      console.log(`[${requestId}] Attempting to send verification email to:`, normalizedEmail)
      await sendVerificationEmail(
        normalizedEmail,
        conductorData.nombre || 'Conductor',
        verificationToken
      )
      console.log(`[${requestId}] Verification email sent successfully.`)
    } catch (emailError) {
      console.error(`[${requestId}] Error al enviar correo de verificación:`, emailError)
      // Aunque falle el email, el registro en DB fue exitoso
      return NextResponse.json({ message: 'Conductor registrado, pero falló el envío del correo de verificación.' }, { status: 200 })
    }

    console.log(`[${requestId}] Conductor registration process completed successfully.`)
    return NextResponse.json({ message: 'Conductor registrado exitosamente. Por favor, verifica tu email.' }, { status: 201 })

  } catch (error) {
    console.error(`[${requestId}] Error general en la API de registro de conductor:`, error)
    
    // Handle unique constraint violation for email
    if (error.code === '23505') {
      console.log(`[${requestId}] Unique constraint violation in catch: Email already registered.`)
      return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
    }
    
    console.log(`[${requestId}] Returning 500 error for general exception`)
    return NextResponse.json({ error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}


