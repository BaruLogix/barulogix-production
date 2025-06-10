import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: package_data, error } = await supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .eq('id', params.id)
      .single()

    if (error || !package_data) {
      return NextResponse.json({ error: 'Paquete no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ package: package_data })
  } catch (error) {
    console.error('Error in package GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { tracking, conductor_id, tipo, estado, fecha_entrega, valor } = body

    // Validaciones
    if (!tracking || !conductor_id || !tipo || fecha_entrega === undefined) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 })
    }

    // Verificar que el conductor existe
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id')
      .eq('id', conductor_id)
      .single()

    if (conductorError || !conductor) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 400 })
    }

    // Verificar que el tracking no existe en otro paquete
    const { data: existingPackage, error: checkError } = await supabase
      .from('packages')
      .select('id, tracking')
      .eq('tracking', tracking)
      .neq('id', params.id)
      .single()

    if (existingPackage) {
      return NextResponse.json({ error: 'Ya existe otro paquete con este tracking' }, { status: 400 })
    }

    // Actualizar el paquete
    const { data: updatedPackage, error } = await supabase
      .from('packages')
      .update({
        tracking,
        conductor_id,
        tipo,
        estado: estado !== undefined ? estado : 0,
        fecha_entrega,
        valor: tipo === 'Dropi' ? valor : null
      })
      .eq('id', params.id)
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return NextResponse.json({ error: 'Error al actualizar paquete' }, { status: 500 })
    }

    return NextResponse.json({ package: updatedPackage })
  } catch (error) {
    console.error('Error in package PUT:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting package:', error)
      return NextResponse.json({ error: 'Error al eliminar paquete' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Paquete eliminado exitosamente' })
  } catch (error) {
    console.error('Error in package DELETE:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

