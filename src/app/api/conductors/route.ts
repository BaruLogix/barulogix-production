import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores del usuario logueado con información de credenciales
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG CONDUCTORS GET ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver conductores'
      }, { status: 401 })
    }

    console.log('Buscando conductores para user ID:', userId)

    // Obtener conductores del usuario actual con información de credenciales
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select(`
        *,
        conductor_auth (
          email,
          email_verified,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    console.log('Conductores encontrados:', conductors?.length || 0)

    // Procesar datos para incluir información de credenciales
    const processedConductors = conductors.map(conductor => ({
      ...conductor,
      has_credentials: !!conductor.conductor_auth,
      email: conductor.conductor_auth?.email || null,
      email_verified: conductor.conductor_auth?.email_verified || false,
      conductor_auth: undefined // Remover el objeto anidado
    }))

    // Calcular estadísticas
    const stats = {
      total: processedConductors.length,
      activos: processedConductors.filter(c => c.activo).length,
      inactivos: processedConductors.filter(c => !c.activo).length,
      con_credenciales: processedConductors.filter(c => c.has_credentials).length,
      zonas: [...new Set(processedConductors.map(c => c.zona))].length
    }

    return NextResponse.json({ conductors: processedConductors, stats })
  } catch (error) {
    console.error('Error in GET /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor para el usuario logueado
export async function POST(request: NextRequest) {
  console.log('=== DEBUG CONDUCTORS POST API START ===');
  try {
    const body = await request.json()
    const { nombre, zona, telefono, email, password } = body

    if (!nombre || !zona) {
      console.log('Validation Error: Missing nombre or zona');
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG CONDUCTORS POST ===')
    console.log('User ID recibido:', userId)
    console.log('Email proporcionado:', email)
    console.log('Password proporcionado:', !!password)
    
    if (!userId) {
      console.log('Auth Error: User ID not provided');
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear conductores'
      }, { status: 401 })
    }

    // Verificar si ya existe un conductor con el mismo nombre para este usuario
    console.log('Checking for existing conductor by name:', nombre);
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .eq('user_id', userId)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      console.log('Conflict: Conductor with this name already exists:', existing.id);
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en su bodega' }, { status: 400 })
    }

    // Si se proporciona email, verificar que no esté en uso ANTES de crear el conductor
    if (email) {
      console.log('Verificando email existente en conductor_auth:', email)
      
      const { data: existingEmail, error: emailError } = await supabase
        .from('conductor_auth')
        .select('conductor_id, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle()

      console.log('Email existente encontrado (maybeSingle):', existingEmail)
      console.log('Error al verificar email (maybeSingle):', emailError)

      if (emailError && emailError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error verificando email existente (unexpected error):', emailError)
        return NextResponse.json({ error: 'Error al verificar email' }, { status: 500 })
      }

      if (existingEmail) {
        console.log('Conflict: Email already exists for conductor:', existingEmail.conductor_id)
        return NextResponse.json({ error: 'Ya existe un conductor con ese email' }, { status: 400 })
      }
    }

    // Crear el conductor
    const insertData = {
      user_id: userId,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    }

    console.log('Datos a insertar en conductors:', insertData)

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creando conductor en tabla conductors:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message 
      }, { status: 500 })
    }

    console.log('Conductor creado exitosamente en tabla conductors:', conductor)

    // Si se proporcionaron credenciales, crear la entrada en conductor_auth
    if (email && password && conductor.id) {
      console.log('Attempting to create credentials for conductor:', conductor.id)
      
      try {
        console.log('Fetching /api/conductor/auth/register...');
        const credentialsResponse = await fetch(`${request.nextUrl.origin}/api/conductor/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conductor_id: conductor.id,
            email: email.toLowerCase().trim(),
            password: password
          })
        })

        const credentialsData = await credentialsResponse.json()
        console.log('Response from /api/conductor/auth/register:', credentialsResponse.status, credentialsData)

        if (!credentialsResponse.ok) {
          console.error('Error creando credenciales (response not ok):', credentialsData)
          
          // Si falló la creación de credenciales, eliminar el conductor creado
          console.log('Rolling back: Deleting conductor due to credentials creation failure.');
          await supabase
            .from('conductors')
            .delete()
            .eq('id', conductor.id)
          
          // Throw an error to ensure the outer function stops and returns an error
          throw new Error(credentialsData.error || 'Error al crear credenciales del conductor');
        } else {
          console.log('Credenciales creadas exitosamente via /api/conductor/auth/register')
        }
      } catch (credentialsError) {
        console.error('Error in fetch call to /api/conductor/auth/register:', credentialsError)
        
        // Si falló la creación de credenciales, eliminar el conductor creado
        console.log('Rolling back: Deleting conductor due to fetch error.');
        await supabase
          .from('conductors')
          .delete()
          .eq('id', conductor.id)
        
        throw new Error('Error al crear credenciales del conductor');
      }
    }

    console.log('Conductor POST API finished successfully.');
    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general en POST /api/conductors:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}


