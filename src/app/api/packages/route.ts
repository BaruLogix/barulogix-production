import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES GET ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver paquetes'
      }, { status: 401 })
    }

    console.log('Buscando paquetes para user ID:', userId)

    const { searchParams } = new URL(request.url)
    const conductor_id = searchParams.get('conductor_id')
    const tipo = searchParams.get('tipo')
    const estado = searchParams.get('estado')
    const fecha_inicio = searchParams.get('fecha_inicio')
    const fecha_fin = searchParams.get('fecha_fin')
    const search = searchParams.get('search')

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

    // Aplicar filtros en memoria después de obtener todos los paquetes
    if (conductor_id) {
      packages = packages.filter(p => p.conductor_id === conductor_id)
    }
    
    if (tipo) {
      packages = packages.filter(p => p.tipo === tipo)
    }
    
    if (estado !== null && estado !== undefined) {
      packages = packages.filter(p => p.estado === parseInt(estado))
    }
    
    if (fecha_inicio) {
      packages = packages.filter(p => p.fecha_entrega >= fecha_inicio)
    }
    
    if (fecha_fin) {
      packages = packages.filter(p => p.fecha_entrega <= fecha_fin)
    }
    
    if (search) {
      packages = packages.filter(p => p.tracking.toLowerCase().includes(search.toLowerCase()))
    }

    console.log('Paquetes encontrados después de filtros:', packages?.length || 0)

    return NextResponse.json({ packages })
  } catch (error) {
    console.error('Error in packages GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES POST (INDIVIDUAL) ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para crear paquetes'
      }, { status: 401 })
    }

    console.log('Creando paquete individual para user ID:', userId)

    const body = await request.json()
    console.log('Body recibido:', body)
    
    const { tracking, conductor_id, tipo, fecha_entrega, valor } = body

    // Validaciones básicas
    if (!tracking || !conductor_id || !tipo || !fecha_entrega) {
      console.log('ERROR: Faltan campos requeridos')
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: tracking, conductor_id, tipo, fecha_entrega' 
      }, { status: 400 })
    }

    console.log('Validando conductor:', conductor_id, 'para usuario:', userId)

    // Verificar que el conductor existe Y pertenece al usuario actual (IGUAL QUE BULK)
    const { data: conductor, error: conductorError } = await supabase
      .from('conductors')
      .select('id, user_id')
      .eq('id', conductor_id)
      .eq('user_id', userId) // Solo conductores del usuario actual
      .single()

    console.log('Resultado validación conductor:', conductor, conductorError)

    if (conductorError || !conductor) {
      console.log('ERROR: Conductor no encontrado o no pertenece al usuario')
      return NextResponse.json({ error: 'Conductor no encontrado o no pertenece a su bodega' }, { status: 400 })
    }

    // Obtener todos los conductores del usuario para verificar duplicados (IGUAL QUE BULK)
    const { data: userConductors, error: userConductorsError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)

    if (userConductorsError) {
      console.error('Error obteniendo conductores del usuario:', userConductorsError)
      return NextResponse.json({ error: 'Error verificando conductores' }, { status: 500 })
    }

    const conductorIds = userConductors.map(c => c.id)
    console.log('IDs de conductores del usuario:', conductorIds)

    // Verificar duplicados solo en conductores del usuario (IGUAL QUE BULK)
    const { data: existingPackage, error: checkError } = await supabase
      .from('packages')
      .select('tracking')
      .eq('tracking', tracking)
      .in('conductor_id', conductorIds)
      .single()

    console.log('Verificación duplicados:', existingPackage, checkError)

    if (existingPackage) {
      console.log('ERROR: Tracking duplicado')
      return NextResponse.json({ error: 'Ya existe un paquete con este tracking en su bodega' }, { status: 400 })
    }

    console.log('Insertando paquete individual en la base de datos...')
    
    // Preparar datos para insertar (IGUAL QUE BULK)
    const packageData = {
      tracking: tracking,
      conductor_id: conductor_id,
      tipo: tipo,
      estado: 0, // No entregado por defecto
      fecha_entrega: fecha_entrega,
      valor: tipo === 'Dropi' ? valor : null
    }
    
    console.log('Datos a insertar:', packageData)

    // Crear el paquete usando la misma lógica que bulk
    const { data: newPackage, error } = await supabase
      .from('packages')
      .insert([packageData])
      .select(`
        *,
        conductor:conductors(id, nombre, zona)
      `)
      .single()

    console.log('Resultado inserción:', newPackage, error)

    if (error) {
      console.error('ERROR CRÍTICO al crear paquete:', error)
      console.error('Detalles del error:', JSON.stringify(error, null, 2))
      return NextResponse.json({ 
        error: 'Error al crear paquete', 
        details: error.message,
        code: error.code 
      }, { status: 500 })
    }

    console.log('Paquete creado exitosamente:', newPackage)
    return NextResponse.json({ 
      package: newPackage,
      message: 'Paquete creado exitosamente'
    }, { status: 201 })
  } catch (error) {
    console.error('ERROR CRÍTICO en packages POST:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

