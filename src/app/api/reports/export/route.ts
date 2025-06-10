import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { formato, fecha_inicio, fecha_fin, conductor_id, incluir_conductores, incluir_paquetes } = body

    if (!formato || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: formato, fecha_inicio, fecha_fin' 
      }, { status: 400 })
    }

    let query = supabase
      .from('packages')
      .select(`
        *,
        conductor:conductors(id, nombre, zona, activo)
      `)
      .gte('fecha_entrega', fecha_inicio)
      .lte('fecha_entrega', fecha_fin)
      .order('fecha_entrega', { ascending: false })

    // Filtro por conductor específico
    if (conductor_id) {
      query = query.eq('conductor_id', conductor_id)
    }

    const { data: packages, error } = await query

    if (error) {
      console.error('Error fetching packages for export:', error)
      return NextResponse.json({ error: 'Error al obtener datos para exportación' }, { status: 500 })
    }

    // Obtener conductores si se requiere
    let conductors = []
    if (incluir_conductores) {
      const { data: conductorsData, error: conductorsError } = await supabase
        .from('conductors')
        .select('*')
        .order('nombre', { ascending: true })

      if (conductorsError) {
        console.error('Error fetching conductors for export:', conductorsError)
        return NextResponse.json({ error: 'Error al obtener conductores para exportación' }, { status: 500 })
      }

      conductors = conductorsData || []
    }

    if (formato === 'json') {
      const exportData = {
        fecha_exportacion: new Date().toISOString(),
        rango_fechas: {
          inicio: fecha_inicio,
          fin: fecha_fin
        },
        total_paquetes: packages.length,
        ...(incluir_conductores && { conductores: conductors }),
        ...(incluir_paquetes && { paquetes: packages })
      }

      return NextResponse.json(exportData)
    }

    if (formato === 'csv') {
      let csvContent = ''
      
      if (incluir_paquetes) {
        // CSV de paquetes
        csvContent += 'Tracking,Conductor,Zona,Tipo,Estado,Fecha_Entrega,Valor,Fecha_Creacion\n'
        
        packages.forEach(pkg => {
          const estado = pkg.estado === 0 ? 'No Entregado' : pkg.estado === 1 ? 'Entregado' : 'Devuelto'
          const valor = pkg.valor ? pkg.valor.toString() : ''
          const fechaEntrega = new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')
          const fechaCreacion = new Date(pkg.created_at).toLocaleDateString('es-CO')
          
          csvContent += `"${pkg.tracking}","${pkg.conductor.nombre}","${pkg.conductor.zona}","${pkg.tipo}","${estado}","${fechaEntrega}","${valor}","${fechaCreacion}"\n`
        })
      }

      if (incluir_conductores) {
        if (csvContent) csvContent += '\n\n'
        csvContent += 'Nombre,Zona,Activo,Fecha_Creacion\n'
        
        conductors.forEach(conductor => {
          const activo = conductor.activo ? 'Sí' : 'No'
          const fechaCreacion = new Date(conductor.created_at).toLocaleDateString('es-CO')
          
          csvContent += `"${conductor.nombre}","${conductor.zona}","${activo}","${fechaCreacion}"\n`
        })
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="barulogix_export_${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
  } catch (error) {
    console.error('Error in export:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

