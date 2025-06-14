import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener conductor por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conductorId = params.id

    console.log('=== DEBUG CONDUCTOR BY ID GET ===')
    console.log('Conductor ID solicitado:', conductorId)

    if (!conductorId) {
      return NextResponse.json({ 
        error: 'ID de conductor no proporcionado'
      }, { status: 400 })
    }

    // Buscar conductor por ID
    const { data: conductor, error } = await supabase
      .from('conductors')
      .select('*')
      .eq('id', conductorId)
      .eq('activo', true) // Solo conductores activos pueden acceder
      .single()

    if (error) {
      console.error('Error fetching conductor:', error)
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          error: 'Conductor no encontrado o inactivo'
        }, { status: 404 })
      }
      
      return NextResponse.json({ 
        error: 'Error al buscar conductor'
      }, { status: 500 })
    }

    console.log('Conductor encontrado:', {
      id: conductor.id,
      nombre: conductor.nombre,
      zona: conductor.zona
    })

    return NextResponse.json({ conductor })
  } catch (error) {
    console.error('Error in GET /api/conductor/[id]:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

