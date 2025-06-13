import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isValidEmail, isValidPassword } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7)
  console.log(`[${requestId}] === INICIO REGISTER API (SUPABASE AUTH) ===`)
  
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

    // 3. Usar Supabase Auth para registrar el usuario
    console.log(`[${requestId}] Creating user with Supabase Auth...`)
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password,
      options: {
        data: {
          conductor_id: conductor_id,
          nombre: conductorData.nombre,
          user_type: 'conductor'
        }
      }
    })

    if (authError) {
      console.error(`[${requestId}] Supabase Auth error:`, authError)
      
      // Manejar específicamente el error de email duplicado
      if (authError.message?.includes('already registered') || authError.message?.includes('already exists')) {
        console.log(`[${requestId}] Email already registered in Supabase Auth`)
        return NextResponse.json({ error: 'Este email ya está registrado para un conductor' }, { status: 409 })
      }
      
      return NextResponse.json({ error: 'Error al registrar usuario: ' + authError.message }, { status: 500 })
    }

    if (!authData.user) {
      console.error(`[${requestId}] No user data returned from Supabase Auth`)
      return NextResponse.json({ error: 'Error interno: No se pudo crear el usuario' }, { status: 500 })
    }

    console.log(`[${requestId}] User created successfully with Supabase Auth:`, {
      id: authData.user.id,
      email: authData.user.email,
      email_confirmed_at: authData.user.email_confirmed_at
    })

    // 4. Crear entrada en conductor_auth vinculada al usuario de Supabase Auth
    console.log(`[${requestId}] Creating conductor_auth entry...`)
    const { data: conductorAuthData, error: conductorAuthError } = await supabaseAdmin
      .from('conductor_auth')
      .insert({
        id: authData.user.id, // Usar el mismo ID del usuario de Supabase Auth
        conductor_id: conductor_id,
        email: authData.user.email,
        email_verified: !!authData.user.email_confirmed_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (conductorAuthError) {
      console.error(`[${requestId}] Error creating conductor_auth entry:`, conductorAuthError)
      
      // Si falla la creación de conductor_auth, eliminar el usuario de Supabase Auth
      console.log(`[${requestId}] Cleaning up: Deleting user from Supabase Auth...`)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json({ error: 'Error interno al crear perfil de conductor' }, { status: 500 })
    }

    console.log(`[${requestId}] Conductor auth entry created successfully:`, {
      id: conductorAuthData.id,
      conductor_id: conductorAuthData.conductor_id,
      email: conductorAuthData.email
    })

    // 5. Verificar si se necesita enviar correo de verificación
    if (!authData.user.email_confirmed_at) {
      console.log(`[${requestId}] Email verification required. Supabase Auth will handle email sending.`)
      return NextResponse.json({ 
        message: 'Conductor registrado exitosamente. Por favor, verifica tu email para completar el registro.',
        email_verification_required: true
      }, { status: 201 })
    } else {
      console.log(`[${requestId}] Email already verified.`)
      return NextResponse.json({ 
        message: 'Conductor registrado exitosamente.',
        email_verification_required: false
      }, { status: 201 })
    }

  } catch (error) {
    console.error(`[${requestId}] Error general en la API de registro de conductor:`, error)
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}

