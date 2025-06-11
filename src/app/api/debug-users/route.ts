import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG USERS API ===')
    console.log('Email recibido:', userEmail)
    
    // Obtener TODOS los usuarios para comparar
    const { data: allUsers, error: allError } = await supabase
      .from('users')
      .select('id, email, name')
      .order('email')
    
    if (allError) {
      console.error('Error obteniendo usuarios:', allError)
      return NextResponse.json({ 
        error: 'Error al obtener usuarios',
        details: allError.message
      }, { status: 500 })
    }
    
    // Buscar el usuario específico si se proporciona email
    let specificUser = null
    let searchError = null
    
    if (userEmail) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', userEmail)
        .single()
      
      specificUser = user
      searchError = error
    }
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      emailBuscado: userEmail,
      usuarioEncontrado: specificUser,
      errorBusqueda: searchError?.message || null,
      todosLosUsuarios: allUsers,
      totalUsuarios: allUsers?.length || 0,
      emailsExistentes: allUsers?.map(u => u.email) || []
    })
    
  } catch (error) {
    console.error('Error in debug users API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, testSearch } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }
    
    // Probar diferentes métodos de búsqueda
    const results = {}
    
    // Método 1: Búsqueda exacta
    const { data: exact, error: exactError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single()
    
    results.exact = { data: exact, error: exactError?.message }
    
    // Método 2: Búsqueda case-insensitive
    const { data: ilike, error: ilikeError } = await supabase
      .from('users')
      .select('id, email, name')
      .ilike('email', email)
      .single()
    
    results.ilike = { data: ilike, error: ilikeError?.message }
    
    // Método 3: Búsqueda con trim
    const { data: trim, error: trimError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email.trim())
      .single()
    
    results.trim = { data: trim, error: trimError?.message }
    
    return NextResponse.json({
      emailProbado: email,
      resultados: results,
      recomendacion: exact ? 'Usar búsqueda exacta' : ilike ? 'Usar búsqueda ilike' : trim ? 'Usar búsqueda con trim' : 'Usuario no encontrado'
    })
    
  } catch (error) {
    console.error('Error in debug users POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

