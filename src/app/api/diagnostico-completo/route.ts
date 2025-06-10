import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      tests: [] as any[]
    }

    // Test 1: Variables de entorno
    const envTest = {
      name: 'Variables de Entorno',
      status: 'checking',
      details: {} as any
    }

    envTest.details.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'CONFIGURADA' : 'FALTANTE'
    envTest.details.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'CONFIGURADA' : 'FALTANTE'
    envTest.details.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURADA' : 'FALTANTE'

    envTest.status = (envTest.details.NEXT_PUBLIC_SUPABASE_URL === 'CONFIGURADA' && 
                     envTest.details.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'CONFIGURADA' && 
                     envTest.details.SUPABASE_SERVICE_ROLE_KEY === 'CONFIGURADA') ? 'PASS' : 'FAIL'

    diagnostics.tests.push(envTest)

    // Test 2: Conexión a Supabase
    const connectionTest = {
      name: 'Conexión a Supabase',
      status: 'checking',
      details: {} as any
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('user_profiles').select('count').limit(1)
      
      if (error) {
        connectionTest.status = 'FAIL'
        connectionTest.details.error = error.message
      } else {
        connectionTest.status = 'PASS'
        connectionTest.details.message = 'Conexión exitosa'
      }
    } catch (error: any) {
      connectionTest.status = 'FAIL'
      connectionTest.details.error = error.message
    }

    diagnostics.tests.push(connectionTest)

    // Test 3: Verificar usuario administrador
    const adminTest = {
      name: 'Usuario Administrador',
      status: 'checking',
      details: {} as any
    }

    try {
      const supabase = createClient()
      
      // Verificar en auth.users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
      const adminAuthUser = authUsers?.users?.find(u => u.email === 'barulogix.platform@gmail.com')
      
      // Verificar en user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', 'barulogix.platform@gmail.com')
        .single()

      adminTest.details.authUser = adminAuthUser ? 'EXISTE' : 'NO EXISTE'
      adminTest.details.profile = profileData ? 'EXISTE' : 'NO EXISTE'
      adminTest.details.authError = authError?.message
      adminTest.details.profileError = profileError?.message

      if (adminAuthUser && profileData) {
        adminTest.status = 'PASS'
        adminTest.details.adminData = {
          authId: adminAuthUser.id,
          profileId: profileData.id,
          idsMatch: adminAuthUser.id === profileData.id,
          role: profileData.role,
          isActive: profileData.is_active
        }
      } else {
        adminTest.status = 'FAIL'
      }
    } catch (error: any) {
      adminTest.status = 'FAIL'
      adminTest.details.error = error.message
    }

    diagnostics.tests.push(adminTest)

    // Test 4: Probar autenticación
    const authTest = {
      name: 'Prueba de Autenticación',
      status: 'checking',
      details: {} as any
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'barulogix.platform@gmail.com',
        password: 'BaruAdmin2025!'
      })

      if (error) {
        authTest.status = 'FAIL'
        authTest.details.error = error.message
      } else {
        authTest.status = 'PASS'
        authTest.details.message = 'Autenticación exitosa'
        authTest.details.userId = data.user?.id
        
        // Cerrar sesión inmediatamente
        await supabase.auth.signOut()
      }
    } catch (error: any) {
      authTest.status = 'FAIL'
      authTest.details.error = error.message
    }

    diagnostics.tests.push(authTest)

    // Test 5: Verificar configuración de Supabase
    const configTest = {
      name: 'Configuración de Supabase',
      status: 'checking',
      details: {} as any
    }

    try {
      configTest.details.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      configTest.details.anonKeyLength = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
      configTest.details.serviceKeyLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      
      configTest.status = 'PASS'
    } catch (error: any) {
      configTest.status = 'FAIL'
      configTest.details.error = error.message
    }

    diagnostics.tests.push(configTest)

    // Resumen
    const passedTests = diagnostics.tests.filter(t => t.status === 'PASS').length
    const totalTests = diagnostics.tests.length
    
    return NextResponse.json({
      success: true,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: totalTests - passedTests,
        status: passedTests === totalTests ? 'ALL_PASS' : 'SOME_FAILED'
      },
      diagnostics
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}

