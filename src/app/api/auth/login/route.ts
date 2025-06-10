import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase con validación
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('=== LOGIN API DEBUG ===')
console.log('Supabase URL:', supabaseUrl ? 'Configurada' : 'NO CONFIGURADA')
console.log('Service Key:', supabaseServiceKey ? 'Configurada' : 'NO CONFIGURADA')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variables de entorno faltantes:', {
    url: !!supabaseUrl,
    key: !!supabaseServiceKey
  })
}

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export async function POST(request: NextRequest) {
  try {
    console.log('=== INICIO LOGIN REQUEST ===')
    
    // Validar variables de entorno
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Variables de entorno no configuradas')
      return NextResponse.json(
        { 
          error: 'Configuración del servidor incompleta',
          details: 'Variables de entorno faltantes'
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    console.log('Body recibido:', { email: body.email, hasPassword: !!body.password })

    const { email, password } = body

    if (!email || !password) {
      console.log('Email o password faltantes')
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim()
    console.log('Email normalizado:', normalizedEmail)

    // Intentar autenticación con Supabase
    console.log('Intentando autenticación con Supabase...')
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password,
    })

    console.log('Resultado de autenticación:', {
      success: !!authData.user,
      error: authError?.message,
      userId: authData.user?.id
    })

    if (authError) {
      console.error('Error de autenticación:', authError)
      
      // Manejar errores específicos
      if (authError.message.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Email o contraseña incorrectos' },
          { status: 401 }
        )
      }
      
      if (authError.message.includes('Email not confirmed')) {
        return NextResponse.json(
          { 
            error: 'email_not_verified',
            message: 'Para poder iniciar sesión, necesitas verificar tu email. Por favor, revisa tu bandeja de entrada (y la carpeta de spam) y haz clic en el enlace de verificación.'
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { 
          error: 'Error de autenticación',
          details: authError.message
        },
        { status: 401 }
      )
    }

    if (!authData.user) {
      console.error('No se obtuvo usuario después de autenticación exitosa')
      return NextResponse.json(
        { error: 'Error interno de autenticación' },
        { status: 500 }
      )
    }

    // Obtener perfil del usuario
    console.log('Obteniendo perfil del usuario...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    console.log('Resultado de perfil:', {
      found: !!profile,
      error: profileError?.message,
      role: profile?.role
    })

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error al obtener perfil:', profileError)
      return NextResponse.json(
        { 
          error: 'Error al obtener información del usuario',
          details: profileError.message
        },
        { status: 500 }
      )
    }

    // Si no existe perfil, crearlo automáticamente
    let userProfile = profile
    if (!profile) {
      console.log('Perfil no encontrado, creando automáticamente...')
      
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: authData.user.id,
          email: normalizedEmail,
          name: authData.user.user_metadata?.name || 'Usuario',
          role: 'user',
          subscription: 'basic',
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error al crear perfil:', createError)
        return NextResponse.json(
          { 
            error: 'Error al crear perfil de usuario',
            details: createError.message
          },
          { status: 500 }
        )
      }

      userProfile = newProfile
      console.log('Perfil creado exitosamente:', userProfile)
    }

    // Respuesta exitosa
    const response = {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name: userProfile.name,
        role: userProfile.role,
        subscription: userProfile.subscription,
        is_active: userProfile.is_active
      },
      session: authData.session
    }

    console.log('Login exitoso para:', normalizedEmail)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error inesperado en login:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}

