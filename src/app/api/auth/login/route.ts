import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('=== LOGIN ATTEMPT ===')
    console.log('Email:', email)
    console.log('Password length:', password?.length)
    console.log('Timestamp:', new Date().toISOString())

    // Validar datos de entrada
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email y contraseña son requeridos'
      }, { status: 400 })
    }

    // Crear cliente de Supabase
    const supabase = createClient()

    // Verificar si el usuario existe en auth.users ANTES de intentar login
    console.log('Checking if user exists in auth.users...')
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    let userExists = false
    let userConfirmed = false
    
    if (!listError && users) {
      const foundUser = users.users.find(u => u.email === email.trim().toLowerCase())
      if (foundUser) {
        userExists = true
        userConfirmed = !!foundUser.email_confirmed_at
        console.log('User found:', foundUser.id)
        console.log('User confirmed:', userConfirmed)
      }
    }

    // Intentar autenticación
    console.log('Attempting authentication...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    })

    // Manejar errores específicos de autenticación
    if (authError) {
      console.log('AUTH ERROR:', authError.message)
      console.log('AUTH ERROR CODE:', authError.status)

      // Error específico: Email no confirmado
      if (authError.message.includes('email_not_confirmed') || 
          authError.message.includes('Email not confirmed') ||
          (userExists && !userConfirmed)) {
        
        console.log('ERROR: Email not confirmed')
        return NextResponse.json({
          success: false,
          error: 'email_not_verified',
          message: 'Tu email aún no está verificado',
          friendlyMessage: 'Para poder iniciar sesión, necesitas verificar tu email. Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de verificación que te enviamos.',
          actions: {
            resendVerification: true,
            checkSpam: true,
            contactSupport: true
          },
          userEmail: email.trim().toLowerCase()
        }, { status: 401 })
      }

      // Error específico: Credenciales incorrectas
      if (authError.message.includes('Invalid login credentials') ||
          authError.message.includes('invalid_credentials')) {
        
        if (!userExists) {
          return NextResponse.json({
            success: false,
            error: 'user_not_found',
            message: 'No existe una cuenta con este email',
            friendlyMessage: 'No encontramos una cuenta registrada con este email. ¿Quizás necesitas crear una cuenta nueva?',
            actions: {
              register: true,
              checkEmail: true
            }
          }, { status: 401 })
        } else {
          return NextResponse.json({
            success: false,
            error: 'invalid_password',
            message: 'Contraseña incorrecta',
            friendlyMessage: 'La contraseña que ingresaste no es correcta. Por favor, verifica que esté bien escrita.',
            actions: {
              resetPassword: true,
              tryAgain: true
            }
          }, { status: 401 })
        }
      }

      // Otros errores de autenticación
      return NextResponse.json({
        success: false,
        error: 'auth_error',
        message: 'Error de autenticación',
        friendlyMessage: 'Hubo un problema al iniciar sesión. Por favor, intenta nuevamente en unos momentos.',
        debug: {
          authError: authError.message,
          authStatus: authError.status
        }
      }, { status: 401 })
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: 'no_user_returned',
        message: 'No se pudo autenticar el usuario'
      }, { status: 401 })
    }

    console.log('Authentication successful:', authData.user.id)

    // Verificar si el usuario tiene perfil
    console.log('Checking user profile...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      console.log('Profile not found, creating...')
      
      // Crear perfil si no existe
      const { data: newProfile, error: createProfileError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name: authData.user.user_metadata?.name || 'Usuario',
          role: 'user',
          subscription: 'basic',
          is_active: true
        })
        .select()
        .single()

      if (createProfileError) {
        console.log('Error creating profile:', createProfileError)
        return NextResponse.json({
          success: false,
          error: 'profile_creation_error',
          message: 'Error al crear perfil de usuario'
        }, { status: 500 })
      }

      console.log('Profile created successfully')
      return NextResponse.json({
        success: true,
        message: 'Login exitoso',
        user: {
          id: newProfile.id,
          email: newProfile.email,
          name: newProfile.name,
          role: newProfile.role,
          isActive: newProfile.is_active,
          subscription: newProfile.subscription
        }
      })
    }

    // Verificar si el usuario está activo
    if (!profile.is_active) {
      return NextResponse.json({
        success: false,
        error: 'user_inactive',
        message: 'Tu cuenta está desactivada',
        friendlyMessage: 'Tu cuenta ha sido desactivada. Por favor, contacta al administrador para más información.'
      }, { status: 403 })
    }

    console.log('Login successful for user:', profile.id)

    return NextResponse.json({
      success: true,
      message: 'Login exitoso',
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        isActive: profile.is_active,
        subscription: profile.subscription
      }
    })

  } catch (error: any) {
    console.log('=== LOGIN API ERROR ===')
    console.log('Error:', error)
    console.log('Stack:', error.stack)
    
    return NextResponse.json({
      success: false,
      error: 'server_error',
      message: 'Error interno del servidor',
      friendlyMessage: 'Hubo un problema técnico. Por favor, intenta nuevamente en unos momentos.',
      debug: {
        message: error.message
      }
    }, { status: 500 })
  }
}

