import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES SEARCH ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para buscar paquetes'
      }, { status: 401 })
    }

    console.log('Buscando paquetes para user ID:', userId)

    const { searchParams } = new URL(request.url)
    const tracking = searchParams.get('tracking')
    const conductor_id = searchParams.get('conductor_id')
    const tipo = searchParams.get('tipo')
    const estado = searchParams.get('estado')
    const fecha_desde = searchParams.get('fecha_desde')
    const fecha_hasta = searchParams.get('fecha_hasta')
    const zona = searchParams.get('zona')
    
    // Nuevos filtros temporales
    const filterType = searchParams.get('filterType') || 'all'
    const lastDays = searchParams.get('lastDays') || '7'
    const month = searchParams.get('month') || (new Date().getMonth() + 1).toString()
    const year = searchParams.get('year') || new Date().getFullYear().toString()

    console.log('=== DEBUG SEARCH PARAMS ===')
    console.log('filterType:', filterType)
    console.log('lastDays:', lastDays)
    console.log('month:', month)
    console.log('year:', year)
    console.log('fecha_desde:', fecha_desde)
    console.log('fecha_hasta:', fecha_hasta)

    if (!tracking && !conductor_id && !tipo && !estado && !fecha_desde && !fecha_hasta && !zona && filterType === 'all') {
      return NextResponse.json({ error: 'Debe proporcionar al menos un criterio de búsqueda' }, { status: 400 })
    }

    // Función para obtener TODOS los paquetes con paginación automática
    const getAllPackages = async (userId: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await supabase
          .from('packages')
          .select(`
            *,
            conductor:conductors!inner(id, nombre, zona, user_id)
          `)
          .eq('conductor.user_id', userId)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
          // Si obtuvimos menos de pageSize, ya no hay más páginas
          if (packages.length < pageSize) {
            hasMore = false
          } else {
            from += pageSize
          }
        } else {
          hasMore = false
        }
      }

      console.log(`TOTAL FINAL de paquetes obtenidos: ${allPackages.length}`)
      return allPackages
    }

    // Obtener TODOS los paquetes usando paginación
    let packages = await getAllPackages(userId)

    // Aplicar filtros de búsqueda en memoria
    if (tracking) {
      packages = packages.filter(p => p.tracking.toLowerCase().includes(tracking.toLowerCase()))
    }
    
    if (conductor_id) {
      packages = packages.filter(p => p.conductor_id === conductor_id)
    }
    
    if (tipo) {
      packages = packages.filter(p => p.tipo === tipo)
    }
    
    if (estado !== null && estado !== undefined && estado !== '') {
      packages = packages.filter(p => p.estado === parseInt(estado))
    }

    // Filtro por zona del conductor
    if (zona) {
      packages = packages.filter(p => p.conductor.zona.toLowerCase().includes(zona.toLowerCase()))
    }

    // Aplicar filtros temporales
    if (filterType !== 'all') {
      let startDate: Date | null = null
      let endDate: Date | null = null

      if (filterType === 'lastDays') {
        const days = parseInt(lastDays)
        const today = new Date()
        today.setHours(today.getHours() - 5) // UTC-5 Bogotá
        endDate = new Date(today)
        startDate = new Date(today)
        startDate.setDate(startDate.getDate() - days)
        console.log(`[SEARCH] Filtro últimos ${days} días: ${startDate.toISOString()} - ${endDate.toISOString()}`)
      } else if (filterType === 'month') {
        const monthNum = parseInt(month)
        const yearNum = parseInt(year)
        startDate = new Date(yearNum, monthNum - 1, 1)
        startDate.setHours(startDate.getHours() - 5) // UTC-5 Bogotá
        endDate = new Date(yearNum, monthNum, 0, 23, 59, 59)
        endDate.setHours(endDate.getHours() - 5) // UTC-5 Bogotá
        console.log(`[SEARCH] Filtro mes ${monthNum}/${yearNum}: ${startDate.toISOString()} - ${endDate.toISOString()}`)
      } else if (filterType === 'range' && fecha_desde && fecha_hasta) {
        startDate = new Date(`${fecha_desde}T00:00:00-05:00`)
        endDate = new Date(`${fecha_hasta}T23:59:59-05:00`)
        console.log(`[SEARCH] Filtro rango: ${startDate.toISOString()} - ${endDate.toISOString()}`)
      }

      if (startDate && endDate) {
        packages = packages.filter(p => {
          const packageDate = new Date(p.fecha_entrega)
          return packageDate >= startDate! && packageDate <= endDate!
        })
        console.log(`[SEARCH] Paquetes después de filtro temporal: ${packages.length}`)
      }
    }
    
    // Aplicar filtros de fecha manual (solo si filterType es 'range' o si se especifican fechas directamente)
    if (filterType === 'all' || filterType === 'range') {
      if (fecha_desde && !endDate) {
        const fechaDesdeISO = `${fecha_desde}T00:00:00-05:00`
        console.log('Filtro fecha_desde ISO:', fechaDesdeISO)
        packages = packages.filter(p => p.fecha_entrega >= fechaDesdeISO)
      }
      
      if (fecha_hasta && !startDate) {
        const fechaHastaISO = `${fecha_hasta}T23:59:59-05:00`
        console.log('Filtro fecha_hasta ISO:', fechaHastaISO)
        packages = packages.filter(p => p.fecha_entrega <= fechaHastaISO)
      }
    }

    console.log('Paquetes encontrados después de filtros de búsqueda:', packages?.length || 0)

    // Calcular estadísticas de la búsqueda
    const stats = {
      total: packages.length,
      no_entregados: packages.filter(p => p.estado === 0).length,
      entregados: packages.filter(p => p.estado === 1).length,
      devueltos: packages.filter(p => p.estado === 2).length,
      shein_temu: packages.filter(p => p.tipo === 'Shein/Temu').length,
      dropi: packages.filter(p => p.tipo === 'Dropi').length,
      valor_total_dropi: packages
        .filter(p => p.tipo === 'Dropi' && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      valor_no_entregado_dropi: packages
        .filter(p => p.tipo === 'Dropi' && p.estado === 0 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0)
    }

    return NextResponse.json({ packages, stats })
  } catch (error) {
    console.error('Error in package search:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

