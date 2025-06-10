import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo_reporte, fecha_inicio, fecha_fin, conductor_id } = body

    if (!tipo_reporte || !fecha_inicio || !fecha_fin) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tipo_reporte, fecha_inicio, fecha_fin' 
      }, { status: 400 })
    }

    const fechaInicio = new Date(fecha_inicio)
    const fechaFin = new Date(fecha_fin)
    const fechaGeneracion = new Date()

    let reportData: string[] = []

    if (tipo_reporte === 'general') {
      reportData = await generateGeneralReport(fechaInicio, fechaFin, fechaGeneracion)
    } else if (tipo_reporte === 'especifico' && conductor_id) {
      reportData = await generateSpecificReport(conductor_id, fechaInicio, fechaFin, fechaGeneracion)
    } else {
      return NextResponse.json({ error: 'Tipo de reporte inválido o falta conductor_id para reporte específico' }, { status: 400 })
    }

    return NextResponse.json({ 
      report: reportData.join('\n'),
      reportLines: reportData
    })
  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function generateGeneralReport(fechaInicio: Date, fechaFin: Date, fechaGeneracion: Date): Promise<string[]> {
  const reportData: string[] = []

  // Obtener todos los paquetes en el rango de fechas
  const { data: packages, error } = await supabase
    .from('packages')
    .select(`
      *,
      conductor:conductors(id, nombre, zona)
    `)
    .gte('fecha_entrega', fechaInicio.toISOString().split('T')[0])
    .lte('fecha_entrega', fechaFin.toISOString().split('T')[0])
    .order('fecha_entrega', { ascending: true })

  if (error) {
    throw new Error('Error al obtener paquetes para el reporte')
  }

  // Obtener todos los conductores
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('*')
    .order('nombre', { ascending: true })

  if (conductorsError) {
    throw new Error('Error al obtener conductores para el reporte')
  }

  // Encabezado del reporte
  reportData.push(`Fecha de generación del informe: ${fechaGeneracion.toLocaleDateString('es-CO')}`)
  reportData.push(`Franja de fechas analizadas: ${fechaInicio.toLocaleDateString('es-CO')} - ${fechaFin.toLocaleDateString('es-CO')}`)
  reportData.push('')

  // Agrupar paquetes por día y tipo
  const paquetesPorDiaTipo: { [key: string]: { 'Shein/Temu': number, 'Dropi': number } } = {}
  const devueltosPorCiudadFecha: { [key: string]: { [key: string]: number } } = {}

  packages.forEach(pkg => {
    const dia = new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')
    
    if (!paquetesPorDiaTipo[dia]) {
      paquetesPorDiaTipo[dia] = { 'Shein/Temu': 0, 'Dropi': 0 }
    }
    
    if (pkg.tipo === 'Shein/Temu' || pkg.tipo === 'Dropi') {
      paquetesPorDiaTipo[dia][pkg.tipo]++
    }

    // Paquetes devueltos por ciudad y fecha
    if (pkg.estado === 2) {
      const ciudad = pkg.conductor.zona
      const fechaRegistro = new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')
      
      if (!devueltosPorCiudadFecha[ciudad]) {
        devueltosPorCiudadFecha[ciudad] = {}
      }
      
      devueltosPorCiudadFecha[ciudad][fechaRegistro] = (devueltosPorCiudadFecha[ciudad][fechaRegistro] || 0) + 1
    }
  })

  // Total de paquetes de cada tipo por día
  reportData.push('Total de paquetes de cada tipo por día:')
  const diasOrdenados = Object.keys(paquetesPorDiaTipo).sort((a, b) => 
    new Date(a.split('/').reverse().join('-')).getTime() - new Date(b.split('/').reverse().join('-')).getTime()
  )
  
  diasOrdenados.forEach(dia => {
    const shein = paquetesPorDiaTipo[dia]['Shein/Temu']
    const dropi = paquetesPorDiaTipo[dia]['Dropi']
    reportData.push(`  ${dia}: Shein/Temu: ${shein}, Dropi: ${dropi}`)
  })

  reportData.push('')

  // Paquetes devueltos por ciudad y fecha
  reportData.push('Número de paquetes devueltos por cada ciudad y fecha de registro:')
  Object.entries(devueltosPorCiudadFecha).forEach(([ciudad, fechas]) => {
    Object.entries(fechas).forEach(([fecha, cantidad]) => {
      reportData.push(`  ${ciudad} - ${fecha}: ${cantidad}`)
    })
  })

  reportData.push('')

  // Información por cada conductor
  reportData.push('Información por cada conductor:')
  
  for (const conductor of conductors) {
    const paquetesConductor = packages.filter(p => p.conductor_id === conductor.id)
    const paquetesShein = paquetesConductor.filter(p => p.tipo === 'Shein/Temu')
    const paquetesDropi = paquetesConductor.filter(p => p.tipo === 'Dropi')
    
    const total = paquetesConductor.length
    const entregadosShein = paquetesShein.filter(p => p.estado === 1).length
    const noEntregadosShein = paquetesShein.filter(p => p.estado === 0)
    const entregadosDropi = paquetesDropi.filter(p => p.estado === 1).length
    const noEntregadosDropi = paquetesDropi.filter(p => p.estado === 0)

    reportData.push('')
    reportData.push(`Conductor: ${conductor.nombre}`)
    reportData.push(`  Total paquetes: ${total}`)
    reportData.push(`  Shein/Temu: ${paquetesShein.length}`)
    reportData.push(`    Entregados: ${entregadosShein}`)
    reportData.push(`    No entregados:`)
    
    noEntregadosShein.forEach(p => {
      const diasAtraso = Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
      reportData.push(`      ${p.tracking} - ${diasAtraso} días de atraso`)
    })
    
    reportData.push(`  Dropi: ${paquetesDropi.length}`)
    reportData.push(`    Entregados: ${entregadosDropi}`)
    reportData.push(`    No entregados:`)
    
    noEntregadosDropi.forEach(p => {
      const diasAtraso = Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
      reportData.push(`      ${p.tracking} - ${diasAtraso} días de atraso`)
    })
  }

  reportData.push('')
  reportData.push('Fin de reporte')

  return reportData
}

async function generateSpecificReport(conductorId: string, fechaInicio: Date, fechaFin: Date, fechaGeneracion: Date): Promise<string[]> {
  const reportData: string[] = []

  // Obtener información del conductor
  const { data: conductor, error: conductorError } = await supabase
    .from('conductors')
    .select('*')
    .eq('id', conductorId)
    .single()

  if (conductorError || !conductor) {
    throw new Error('Conductor no encontrado')
  }

  // Obtener paquetes del conductor en el rango de fechas
  const { data: packages, error } = await supabase
    .from('packages')
    .select('*')
    .eq('conductor_id', conductorId)
    .gte('fecha_entrega', fechaInicio.toISOString().split('T')[0])
    .lte('fecha_entrega', fechaFin.toISOString().split('T')[0])
    .order('fecha_entrega', { ascending: true })

  if (error) {
    throw new Error('Error al obtener paquetes del conductor')
  }

  // Obtener todos los paquetes devueltos en el rango para estadísticas generales
  const { data: allPackages, error: allError } = await supabase
    .from('packages')
    .select(`
      *,
      conductor:conductors(zona)
    `)
    .gte('fecha_entrega', fechaInicio.toISOString().split('T')[0])
    .lte('fecha_entrega', fechaFin.toISOString().split('T')[0])
    .eq('estado', 2)

  if (allError) {
    throw new Error('Error al obtener paquetes devueltos')
  }

  // Encabezado del reporte
  reportData.push(`Fecha de generación del informe: ${fechaGeneracion.toLocaleDateString('es-CO')}`)
  reportData.push(`Rango de fechas: ${fechaInicio.toLocaleDateString('es-CO')} - ${fechaFin.toLocaleDateString('es-CO')}`)
  reportData.push(`Conductor: ${conductor.nombre}`)
  reportData.push('')

  // Paquetes devueltos por ciudad
  const devueltosPorCiudad: { [key: string]: number } = {}
  allPackages.forEach(p => {
    const ciudad = p.conductor.zona
    devueltosPorCiudad[ciudad] = (devueltosPorCiudad[ciudad] || 0) + 1
  })

  reportData.push('Paquetes devueltos por ciudad:')
  Object.entries(devueltosPorCiudad).forEach(([ciudad, cantidad]) => {
    reportData.push(`  ${ciudad}: ${cantidad}`)
  })

  reportData.push('')

  // Paquetes entregados y no entregados por día
  reportData.push('Paquetes entregados y no entregados por día:')
  
  const fechaActual = new Date(fechaInicio)
  while (fechaActual <= fechaFin) {
    const diaStr = fechaActual.toLocaleDateString('es-CO')
    const fechaStr = fechaActual.toISOString().split('T')[0]
    
    const paquetesDia = packages.filter(p => p.fecha_entrega === fechaStr)
    
    const sheinEntregados = paquetesDia.filter(p => p.estado === 1 && p.tipo === 'Shein/Temu').length
    const sheinNoEntregados = paquetesDia.filter(p => p.estado === 0 && p.tipo === 'Shein/Temu').length
    const dropiEntregados = paquetesDia.filter(p => p.estado === 1 && p.tipo === 'Dropi').length
    const dropiNoEntregados = paquetesDia.filter(p => p.estado === 0 && p.tipo === 'Dropi').length
    
    reportData.push(`  ${diaStr}: Shein/Temu Entregados: ${sheinEntregados}, No Entregados: ${sheinNoEntregados}; Dropi Entregados: ${dropiEntregados}, No Entregados: ${dropiNoEntregados}`)
    
    fechaActual.setDate(fechaActual.getDate() + 1)
  }

  // Totales
  const totalEntregados = packages.filter(p => p.estado === 1).length
  const totalNoEntregados = packages.filter(p => p.estado === 0).length
  
  reportData.push('')
  reportData.push('Totales:')
  reportData.push(`Total entregados: ${totalEntregados}`)
  reportData.push(`Total no entregados: ${totalNoEntregados}`)

  // Shein/Temu
  const entregadosShein = packages.filter(p => p.estado === 1 && p.tipo === 'Shein/Temu')
  const noEntregadosShein = packages.filter(p => p.estado === 0 && p.tipo === 'Shein/Temu')

  reportData.push('')
  reportData.push(`Shein/Temu entregados: ${entregadosShein.length}`)
  reportData.push(`Shein/Temu no entregados: ${noEntregadosShein.length}`)
  reportData.push('Shein/Temu no entregados tracking:')
  
  noEntregadosShein.forEach(p => {
    const diasAtraso = Math.floor((new Date().getTime() - new Date(p.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24))
    reportData.push(`  ${p.tracking} - ${diasAtraso} días de atraso`)
  })

  // Dropi
  const entregadosDropi = packages.filter(p => p.estado === 1 && p.tipo === 'Dropi')
  const noEntregadosDropi = packages.filter(p => p.estado === 0 && p.tipo === 'Dropi')

  reportData.push('')
  reportData.push(`Dropi entregados: ${entregadosDropi.length}`)
  reportData.push('Dropi entregados con valores:')
  
  entregadosDropi.forEach(p => {
    const valorFmt = p.valor ? `$${p.valor.toLocaleString('es-CO')}` : 'N/A'
    reportData.push(`  Tracking: ${p.tracking}, Valor: ${valorFmt}`)
  })

  reportData.push('')
  reportData.push(`Dropi no entregados: ${noEntregadosDropi.length}`)
  reportData.push('Dropi no entregados con valores:')
  
  let totalValorNoEntregados = 0
  noEntregadosDropi.forEach(p => {
    const valorFmt = p.valor ? `$${p.valor.toLocaleString('es-CO')}` : 'N/A'
    reportData.push(`  Tracking: ${p.tracking}, Valor: ${valorFmt}`)
    if (p.valor) {
      totalValorNoEntregados += p.valor
    }
  })
  
  reportData.push(`Total valor no entregados Dropi: $${totalValorNoEntregados.toLocaleString('es-CO')}`)

  reportData.push('')
  reportData.push('Fin de reporte')

  return reportData
}

