import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Obtener el user_id del admin o crear uno si no existe
    let { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'barulogix.platform@gmail.com')
      .single()

    if (adminError || !adminUser) {
      // Crear usuario admin si no existe
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'barulogix.platform@gmail.com',
          name: 'Admin BaruLogix',
          role: 'admin'
        })
        .select('id')
        .single()

      if (createError) {
        return NextResponse.json({ 
          error: 'Error creando usuario admin',
          details: createError.message 
        }, { status: 500 })
      }
      
      adminUser = newUser
    }

    return NextResponse.json({ 
      success: true,
      adminUserId: adminUser.id,
      message: 'Usuario admin verificado/creado'
    })

  } catch (error) {
    console.error('Error en setup:', error)
    return NextResponse.json({ 
      error: 'Error en setup',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, zona, telefono } = body

    if (!nombre || !zona) {
      return NextResponse.json({ error: 'Nombre y zona son obligatorios' }, { status: 400 })
    }

    // Obtener el user_id del admin
    let { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', 'barulogix.platform@gmail.com')
      .single()

    if (adminError || !adminUser) {
      // Crear usuario admin si no existe
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'barulogix.platform@gmail.com',
          name: 'Admin BaruLogix',
          role: 'admin'
        })
        .select('id')
        .single()

      if (createError) {
        return NextResponse.json({ 
          error: 'Error creando usuario admin',
          details: createError.message 
        }, { status: 500 })
      }
      
      adminUser = newUser
    }

    // Verificar si ya existe un conductor con el mismo nombre
    const { data: existing, error: existingError } = await supabase
      .from('conductors')
      .select('id')
      .eq('nombre', nombre)
      .maybeSingle()

    if (existingError) {
      console.error('Error verificando existente:', existingError)
      return NextResponse.json({ error: 'Error al verificar conductor existente' }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json({ error: 'Ya existe un conductor con ese nombre' }, { status: 400 })
    }

    // Crear el conductor con el user_id válido
    const insertData = {
      user_id: adminUser.id,
      nombre: nombre.trim(),
      zona: zona.trim(),
      telefono: telefono ? telefono.trim() : null,
      activo: true
    }

    const { data: conductor, error } = await supabase
      .from('conductors')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error creando conductor:', error)
      return NextResponse.json({ 
        error: 'Error al crear conductor', 
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    return NextResponse.json({ conductor }, { status: 201 })

  } catch (error) {
    console.error('Error general:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message
    }, { status: 500 })
  }
}

