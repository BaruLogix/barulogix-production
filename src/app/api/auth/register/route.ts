import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    console.log('=== REGISTER ATTEMPT ===')
    console.log('Name:', name)
    console.log('Email:', email)
    console.log('Password length:', password?.length)
    console.log('Timestamp:', new Date().toISOString())

    // Validar datos de entrada
    if (!name || !email || !password) {
      console.log('ERROR: Missing required fields')
      return NextResponse.json({
        success: false,
        error: 'Todos los campos son requeridos'
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log('ERROR: Invalid email format')
      return NextResponse.json({
        success: false,
        error: 'Formato de email inválido'
      }, { status: 400 })
    }

    // Validar contraseña
    if (password.length < 6) {
      console.log('ERROR: Password too short')
      return NextResponse.json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      }, { status: 400 })
    }

    // Crear cliente de Supabase
    const supabase = createClient()

    // Verificar si el usuario ya existe en user_profiles
    console.log('Checking if user exists in profiles...')
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (existingProfile) {
      console.log('ERROR: User already exists in profiles')
      return NextResponse.json({
        success: false,
        error: 'El usuario ya existe'
      }, { status: 409 })
    }

    console.log('Creating user in Supabase Auth...')

    // Crear usuario en Supabase Auth con confirmación automática
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password: password,
      options: {
        data: {
          name: name.trim()
        },
        emailRedirectTo: `${process.env.NEXTAUTH_URL || 'https://barulogix.vercel.app'}/auth/login`
      }
    })

    if (authError) {
      console.log('AUTH SIGNUP ERROR:', authError)
      return NextResponse.json({
        success: false,
        error: 'Error al crear usuario: ' + authError.message,
        debug: {
          authError: authError.message
        }
      }, { status: 400 })
    }

    if (!authData.user) {
      console.log('ERROR: No user returned from signup')
      return NextResponse.json({
        success: false,
        error: 'No se pudo crear el usuario'
      }, { status: 500 })
    }

    console.log('User created in auth.users:', authData.user.id)

    // CONFIRMAR AUTOMÁTICAMENTE EL EMAIL DEL USUARIO
    console.log('Auto-confirming user email...')
    try {
      const { error: confirmError } = await supabase.auth.admin.updateUserById(
        authData.user.id,
        { email_confirm: true }
      )
      
      if (confirmError) {
        console.log('Email confirmation error:', confirmError)
      } else {
        console.log('Email confirmed automatically')
      }
    } catch (confirmErr) {
      console.log('Error confirming email:', confirmErr)
    }

    // Esperar un momento para que el trigger tenga tiempo de ejecutarse
    console.log('Waiting for trigger to execute...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Verificar si el trigger creó el perfil automáticamente
    console.log('Checking if trigger created profile...')
    const { data: autoProfile, error: autoProfileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (autoProfile) {
      console.log('SUCCESS: Profile created automatically by trigger')
      return NextResponse.json({
        success: true,
        message: 'Usuario creado exitosamente. ¡Ya puedes iniciar sesión!',
        user: {
          id: autoProfile.id,
          email: autoProfile.email,
          name: autoProfile.name,
          role: autoProfile.role,
          isActive: autoProfile.is_active,
          subscription: autoProfile.subscription
        },
        emailVerificationNote: 'Tu email ha sido verificado automáticamente. Si recibiste un email de confirmación, puedes ignorarlo.'
      })
    }

    console.log('Trigger did not create profile, creating manually...')

    // Si el trigger no funcionó, crear perfil manualmente
    const { data: manualProfile, error: manualProfileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        role: 'user',
        subscription: 'basic',
        is_active: true
      })
      .select()
      .single()

    if (manualProfileError) {
      console.log('MANUAL PROFILE CREATION ERROR:', manualProfileError)
      
      // Si falla la creación manual, intentar obtener el perfil existente
      const { data: existingProfileRetry } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (existingProfileRetry) {
        console.log('Profile found on retry')
        return NextResponse.json({
          success: true,
          message: 'Usuario creado exitosamente. ¡Ya puedes iniciar sesión!',
          user: {
            id: existingProfileRetry.id,
            email: existingProfileRetry.email,
            name: existingProfileRetry.name,
            role: existingProfileRetry.role,
            isActive: existingProfileRetry.is_active,
            subscription: existingProfileRetry.subscription
          },
          emailVerificationNote: 'Tu email ha sido verificado automáticamente.'
        })
      }

      // Si todo falla, eliminar el usuario de auth y reportar error
      console.log('Deleting user from auth due to profile creation failure')
      try {
        await supabase.auth.admin.deleteUser(authData.user.id)
      } catch (deleteError) {
        console.log('Error deleting user after profile creation failure:', deleteError)
      }

      return NextResponse.json({
        success: false,
        error: 'Error al crear perfil de usuario. Por favor, intenta nuevamente.',
        debug: {
          profileError: manualProfileError.message
        }
      }, { status: 500 })
    }

    console.log('SUCCESS: Profile created manually:', manualProfile.id)

    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente. ¡Ya puedes iniciar sesión!',
      user: {
        id: manualProfile.id,
        email: manualProfile.email,
        name: manualProfile.name,
        role: manualProfile.role,
        isActive: manualProfile.is_active,
        subscription: manualProfile.subscription
      },
      emailVerificationNote: 'Tu email ha sido verificado automáticamente. Si recibiste un email de confirmación, puedes ignorarlo.'
    })

  } catch (error: any) {
    console.log('=== REGISTER API ERROR ===')
    console.log('Error:', error)
    console.log('Stack:', error.stack)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor. Por favor, intenta nuevamente.',
      debug: {
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 })
  }
}

