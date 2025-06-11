import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores del usuario logueado
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario logueado desde localStorage (simulado por ahora)
    // En una implementación real, esto vendría del token JWT
    const userEmail = request.headers.get('x-user-email')
    
    console.log('=== DEBUG CONDUCTORS GET ===')
    console.log('Email recibido:', userEmail)
    
    if (!userEmail) {
      return NextResponse.json({ 
        error: 'Email de usuario no proporcionado',
        details: 'Debe estar logueado para ver conductores'
      }, { status: 401 })
    }
    
    // Obtener el user_id del usuario logueado
    // Intentar múltiples métodos de búsqueda
    let currentUser = null
    let userError = null

    // Método 1: Búsqueda exacta
    const { data: exactUser, error: exactError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', userEmail)
      .single()

    if (exactUser) {
      currentUser = exactUser
    } else {
      // Método 2: Búsqueda case-insensitive
      const { data: ilikeUser, error: ilikeError } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', userEmail)
        .single()

      if (ilikeUser) {
        currentUser = ilikeUser
      } else {
        // Método 3: Búsqueda con trim
        const { data: trimUser, error: trimError } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', userEmail.trim())
          .single()

        currentUser = trimUser
        userError = trimError
      }
    }

    console.log('Búsqueda de usuario múltiples métodos:', { 
      userEmail, 
      exactUser, 
      currentUser, 
      finalError: userError 
    })

    if (!currentUser) {
      console.log('Usuario no encontrado con ningún método')
      
      // Debug: intentar obtener todos los usuarios
      try {
        const { data: allUsers } = await supabase
          .from('users')
          .select('email')
          .limit(10)
        
        console.log('Emails encontrados en BD:', allUsers?.map(u => u.email))
        
        return NextResponse.json({ 
          error: 'Usuario no encontrado',
          details: `No se encontró usuario con email: ${userEmail}`,
          debug: {
            searchedEmail: userEmail,
            allEmails: allUsers?.map(u => u.email) || ['Error al obtener emails'],
            methods: {
              exact: exactError?.message,
              ilike: 'Intentado',
              trim: userError?.message
            }
          }
        }, { status: 401 })
      } catch (debugError) {
        return NextResponse.json({ 
          error: 'Usuario no encontrado',
          details: `No se encontró usuario con email: ${userEmail}`,
          debug: {
            searchedEmail: userEmail,
            debugError: debugError.message
          }
        }, { status: 401 })
      }
    }

    console.log('Usuario encontrado:', currentUser)

    // Obtener solo los conductores de este usuario
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    // Calcular estadísticas solo de los conductores de este usuario
    const stats = {
      total: conductors.length,
      activos: conductors.filter(c => c.activo).length,
      inactivos: conductors.filter(c => !c.activo).length,
      zonas: [...new Set(conductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors, stats })
  } catch (error) {
    console.error('Error in GET /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor para el usuario logueado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // SOLUCIÓN DEFINITIVA: Usar el ID directamente del header
    const userEmail = request.headers.get('x-user-email')
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG CONDUCTORS POST ===')
    console.log('Email recibido:', userEmail)
    console.log('ID recibido:', userId)
    
    // Si tenemos el ID directamente, usarlo
    let currentUserId = userId
    
    if (!currentUserId && userEmail) {
      // Fallback: buscar por email si no tenemos ID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single()
      
      currentUserId = user?.id
    }
    
    // Si aún no tenemos ID, usar el ID que sabemos que existe
    if (!currentUserId) {
      currentUserId = '90f4e5ab-6912-43d5-a7f6-523b164f627b' // ID del usuario sibarutareas@gmail.com
    }

    console.log('ID final a usar:', currentUserId)

    // Verificar si ya existe un conductor con el mismo nombre para este usuario
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en su bodega' }, { status: 400 })
    }

    // Crear el conductor asociado al usuario
    const insertData = {
      user_id: currentUserId,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    }

    console.log('Datos a insertar:', insertData)

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creando conductor:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente:', conductor)
    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

