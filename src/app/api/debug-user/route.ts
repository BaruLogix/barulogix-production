import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Debug: mostrar qué email está llegando
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG USER EMAIL ===')
    console.log('Email recibido en header:', userEmail)
    
    // Obtener todos los usuarios para debug
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
    
    console.log('Usuarios en BD:', allUsers)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'No se recibió email del usuario',
        debug: {
          headerReceived: userEmail,
          allUsers: allUsers
        }
      }, { status: 400 })
    }
    
    // Buscar el usuario específico
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', userEmail)
      .single()
    
    console.log('Usuario encontrado:', currentUser)
    console.log('Error de búsqueda:', userError)
    
    return NextResponse.json({
      success: true,
      debug: {
        emailReceived: userEmail,
        userFound: currentUser,
        userError: userError,
        allUsers: allUsers
      }
    })
    
  } catch (error) {
    console.error('Error en debug:', error)
    return NextResponse.json({ 
      error: 'Error en debug',
      details: error.message
    }, { status: 500 })
  }
}

