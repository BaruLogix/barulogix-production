import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG REPORTS EXPORT ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para exportar datos'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const dataType = searchParams.get('dataType') || 'both'
    const conductor_id = searchParams.get('conductor_id')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')

    console.log('Parámetros de exportación:', { format, dataType, conductor_id, fecha_desde, fecha_hasta })

    let exportData: any = {}

    // Exportar conductores
    if (dataType === 'conductors' || dataType === 'both') {
      const { data: conductors, error: conductorsError } = await supabase
        .from('conductors')
        .select('*')
        .eq('user_id', userId) // Solo conductores del usuario
        .order('nombre', { ascending: true })

      if (conductorsError) {
        console.error('Error fetching conductors:', conductorsError)
        return NextResponse.json({ error: 'Error al obtener conductores' }, { status: 500 })
      }

      exportData.conductors = conductors
    }

    // Exportar paquetes
    if (dataType === 'packages' || dataType === 'both') {
      let query = supabase
        .from('packages')
        .select(`
          *,
          conductor:conductors!inner(id, nombre, zona, user_id)
        `)
        .eq('conductor.user_id', userId) // Solo paquetes de conductores del usuario
        .order('fecha_entrega', { ascending: false })

      // Filtros opcionales
      if (conductor_id) {
        query = query.eq('conductor_id', conductor_id)
      }
      
      if (fecha_desde) {
        query = query.gte('fecha_entrega', fecha_desde)
      }
      
      if (fecha_hasta) {
        query = query.lte('fecha_entrega', fecha_hasta)
      }

      const { data: packages, error: packagesError } = await query

      if (packagesError) {
        console.error('Error fetching packages:', packagesError)
        return NextResponse.json({ error: 'Error al obtener paquetes' }, { status: 500 })
      }

      exportData.packages = packages
    }

    // Generar respuesta según formato
    if (format === 'csv') {
      let csvContent = ''
      
      if (dataType === 'conductors' || dataType === 'both') {
        csvContent += 'CONDUCTORES\n'
        csvContent += 'ID,Nombre,Zona,Teléfono,Activo,Fecha Creación\n'
        exportData.conductors?.forEach((conductor: any) => {
          csvContent += `${conductor.id},"${conductor.nombre}","${conductor.zona}","${conductor.telefono || ''}",${conductor.activo ? 'Sí' : 'No'},${conductor.created_at}\n`
        })
        csvContent += '\n'
      }
      
      if (dataType === 'packages' || dataType === 'both') {
        csvContent += 'PAQUETES\n'
        csvContent += 'ID,Tracking,Conductor,Zona,Tipo,Estado,Fecha Entrega,Valor\n'
        exportData.packages?.forEach((pkg: any) => {
          const estado = pkg.estado === 0 ? 'No Entregado' : pkg.estado === 1 ? 'Entregado' : 'Devuelto'
          csvContent += `${pkg.id},"${pkg.tracking}","${pkg.conductor?.nombre || 'N/A'}","${pkg.conductor?.zona || 'N/A'}","${pkg.tipo}","${estado}",${pkg.fecha_entrega},${pkg.valor || 0}\n`
        })
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="barulogix_export_${dataType}_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Formato JSON
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="barulogix_export_${dataType}_${new Date().toISOString().split('T')[0]}.json"`
        }
      })
    }

  } catch (error) {
    console.error('Error in export route:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

