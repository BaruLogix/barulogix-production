import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los conductores del usuario
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario desde el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Obtener conductores del usuario
    const { data: conductors, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching conductors:', error)
      return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
    }

    return NextResponse.json({ conductors })
  } catch (error) {
    console.error('Error in GET /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Crear nuevo conductor
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener el usuario desde el token
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    const body = await request.json()
    const { name, zone, phone, email } = body

    if (!name || !zone) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Verificar si ya existe un conductor con el mismo nombre en la misma zona
    const { data: existing } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .eq('zone', zone)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre en esa zona' }, { status: 400 })
    }

    // Crear conductor
    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert({
        user_id: user.id,
        name: name.trim(),
        zone: zone.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating conductor:', error)
      return NextResponse.json({ error: 'Error al crear conductor' }, { status: 500 })
    }

    return NextResponse.json({ conductor }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/conductors:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

