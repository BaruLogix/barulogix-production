import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('=== DIAGNÓSTICO COMPLETO DE LOGIN ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Email recibido:', email)
    console.log('Password length:', password?.length)

    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Anon Key (primeros 20 chars):', supabaseAnonKey?.substring(0, 20))

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        success: false,
        error: 'Variables de entorno de Supabase no configuradas',
        debug: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseAnonKey
        }
      }, { status: 500 })
    }

    // Crear cliente de Supabase
    const supabase = createClient()

    // Verificar si el usuario existe en auth.users
    console.log('Verificando si usuario existe en auth.users...')
    
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()
      
      if (listError) {
        console.log('Error listando usuarios:', listError)
      } else {
        const userExists = users.users.find(u => u.email === email.trim().toLowerCase())
        console.log('Usuario encontrado en auth.users:', !!userExists)
        
        if (userExists) {
          console.log('Usuario ID:', userExists.id)
          console.log('Usuario email:', userExists.email)
          console.log('Usuario confirmado:', userExists.email_confirmed_at ? 'Sí' : 'No')
          console.log('Usuario creado:', userExists.created_at)
          console.log('Usuario metadata:', userExists.user_metadata)
        }
      }
    } catch (adminError) {
      console.log('Error accediendo a admin API:', adminError)
    }

    // Verificar si el usuario existe en user_profiles
    console.log('Verificando si usuario existe en user_profiles...')
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (profileError) {
      console.log('Error obteniendo perfil:', profileError)
    } else {
      console.log('Perfil encontrado:', !!profile)
      if (profile) {
        console.log('Perfil ID:', profile.id)
        console.log('Perfil activo:', profile.is_active)
        console.log('Perfil rol:', profile.role)
      }
    }

    // Intentar autenticación directa
    console.log('Intentando autenticación con Supabase...')
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    })

    console.log('Resultado de autenticación:')
    console.log('Auth data:', !!authData.user)
    console.log('Auth error:', authError)

    if (authError) {
      console.log('=== ERROR DE AUTENTICACIÓN ===')
      console.log('Error message:', authError.message)
      console.log('Error status:', authError.status)
      console.log('Error code:', authError.code)
      
      return NextResponse.json({
        success: false,
        error: 'Error de autenticación detectado',
        debug: {
          authError: authError.message,
          authStatus: authError.status,
          authCode: authError.code,
          userExistsInAuth: 'Verificar logs',
          userExistsInProfiles: !!profile,
          supabaseConfigured: true
        }
      }, { status: 401 })
    }

    if (!authData.user) {
      return NextResponse.json({
        success: false,
        error: 'No se retornó usuario de autenticación',
        debug: {
          authDataExists: !!authData,
          userExists: false
        }
      }, { status: 401 })
    }

    console.log('=== AUTENTICACIÓN EXITOSA ===')
    console.log('Usuario autenticado ID:', authData.user.id)

    return NextResponse.json({
      success: true,
      message: 'Diagnóstico completado - Autenticación exitosa',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        confirmed: !!authData.user.email_confirmed_at
      },
      debug: {
        authSuccessful: true,
        userProfile: !!profile,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.log('=== ERROR GENERAL ===')
    console.log('Error:', error)
    console.log('Stack:', error.stack)
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor',
      debug: {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      }
    }, { status: 500 })
  }
}

