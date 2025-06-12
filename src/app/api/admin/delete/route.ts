import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG DELETE OPERATIONS ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para realizar operaciones de eliminación'
      }, { status: 401 })
    }

    const body = await request.json()
    const { operation, conductor_id, state, date_from, date_to, tracking, bulk_trackings } = body

    console.log('Operación de eliminación solicitada:', { 
      operation, conductor_id, state, date_from, date_to, tracking, bulk_trackings 
    })

    if (!operation) {
      return NextResponse.json({ error: 'Tipo de operación requerido' }, { status: 400 })
    }

    let result = { message: '', details: '' }

    switch (operation) {
      case 'delete_conductor_packages':
        result = await deleteConductorPackages(userId, conductor_id)
        break
      
      case 'delete_by_date_range':
        result = await deleteByDateRange(userId, date_from, date_to)
        break
      
      case 'delete_by_state':
        result = await deleteByState(userId, state)
        break
      
      case 'delete_single_package':
        result = await deleteSinglePackage(userId, tracking)
        break
      
      case 'delete_bulk_packages':
        result = await deleteBulkPackages(userId, bulk_trackings)
        break
      
      case 'delete_all_conductors':
        result = await deleteAllConductors(userId)
        break
      
      case 'delete_all_packages':
        result = await deleteAllPackages(userId)
        break
      
      case 'nuclear_reset':
        result = await nuclearReset(userId)
        break
      
      default:
        return NextResponse.json({ error: 'Operación de eliminación no válida' }, { status: 400 })
    }

    console.log('Resultado de eliminación:', result)

    return NextResponse.json({
      success: true,
      message: result.message,
      details: result.details
    })

  } catch (error) {
    console.error('Error en operación de eliminación:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Eliminar todos los paquetes de un conductor específico
async function deleteConductorPackages(userId: string, conductorId: string) {
  if (!conductorId) {
    throw new Error('ID del conductor es requerido')
  }

  // Verificar que el conductor pertenece al usuario
  const { data: conductor, error: conductorError } = await supabase
    .from('conductors')
    .select('id, nombre')
    .eq('id', conductorId)
    .eq('user_id', userId)
    .single()

  if (conductorError || !conductor) {
    throw new Error('Conductor no encontrado o no pertenece a su cuenta')
  }

  // Eliminar todos los paquetes del conductor
  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .eq('conductor_id', conductorId)
    .select('id')

  if (deleteError) {
    throw new Error(`Error eliminando paquetes: ${deleteError.message}`)
  }

  return {
    message: `Paquetes del conductor eliminados exitosamente`,
    details: `${deletedPackages?.length || 0} paquetes eliminados del conductor "${conductor.nombre}"`
  }
}

// Eliminar paquetes por rango de fechas
async function deleteByDateRange(userId: string, dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) {
    throw new Error('Fechas de inicio y fin son requeridas')
  }

  // Obtener conductores del usuario para filtrar paquetes
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  const conductorIds = conductors.map(c => c.id)

  // Eliminar paquetes en el rango de fechas
  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .gte('created_at', dateFrom + 'T00:00:00.000Z')
    .lte('created_at', dateTo + 'T23:59:59.999Z')
    .select('id')

  if (deleteError) {
    throw new Error(`Error eliminando paquetes: ${deleteError.message}`)
  }

  return {
    message: `Paquetes eliminados por rango de fechas`,
    details: `${deletedPackages?.length || 0} paquetes eliminados entre ${new Date(dateFrom).toLocaleDateString('es-CO')} y ${new Date(dateTo).toLocaleDateString('es-CO')}`
  }
}

// Eliminar paquetes por estado específico
async function deleteByState(userId: string, state: number) {
  if (state === undefined || state === null) {
    throw new Error('Estado es requerido')
  }

  // Obtener conductores del usuario para filtrar paquetes
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  const conductorIds = conductors.map(c => c.id)

  // Eliminar paquetes con el estado específico
  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .eq('estado', state)
    .select('id')

  if (deleteError) {
    throw new Error(`Error eliminando paquetes: ${deleteError.message}`)
  }

  const stateNames = { 0: 'No Entregado', 1: 'Entregado', 2: 'Devuelto' }
  const stateName = stateNames[state as keyof typeof stateNames] || 'Desconocido'

  return {
    message: `Paquetes eliminados por estado`,
    details: `${deletedPackages?.length || 0} paquetes con estado "${stateName}" eliminados`
  }
}

// Eliminar un paquete individual por tracking
async function deleteSinglePackage(userId: string, tracking: string) {
  if (!tracking) {
    throw new Error('Tracking es requerido')
  }

  // Obtener conductores del usuario para filtrar paquetes
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  const conductorIds = conductors.map(c => c.id)

  // Eliminar el paquete específico
  const { data: deletedPackage, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .eq('tracking', tracking.trim())
    .select('id, tracking')

  if (deleteError) {
    throw new Error(`Error eliminando paquete: ${deleteError.message}`)
  }

  if (!deletedPackage || deletedPackage.length === 0) {
    throw new Error(`Paquete con tracking "${tracking}" no encontrado en su cuenta`)
  }

  return {
    message: `Paquete eliminado exitosamente`,
    details: `Paquete con tracking "${tracking}" eliminado`
  }
}

// Eliminar múltiples paquetes por lista de trackings
async function deleteBulkPackages(userId: string, bulkTrackings: string) {
  if (!bulkTrackings) {
    throw new Error('Lista de trackings es requerida')
  }

  // Procesar lista de trackings
  const trackings = bulkTrackings
    .split('\n')
    .map(t => t.trim())
    .filter(t => t.length > 0)

  if (trackings.length === 0) {
    throw new Error('No se encontraron trackings válidos en la lista')
  }

  // Obtener conductores del usuario para filtrar paquetes
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  const conductorIds = conductors.map(c => c.id)

  // Eliminar paquetes por lista de trackings
  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .in('tracking', trackings)
    .select('id, tracking')

  if (deleteError) {
    throw new Error(`Error eliminando paquetes: ${deleteError.message}`)
  }

  return {
    message: `Paquetes eliminados masivamente`,
    details: `${deletedPackages?.length || 0} de ${trackings.length} paquetes eliminados exitosamente`
  }
}

// Eliminar todos los conductores de la cuenta
async function deleteAllConductors(userId: string) {
  try {
    // Primero obtener los IDs de todos los conductores
    const { data: conductors, error: conductorsQueryError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)
    
    if (conductorsQueryError) {
      throw new Error(`Error obteniendo conductores: ${conductorsQueryError.message}`)
    }
    
    if (!conductors || conductors.length === 0) {
      return {
        message: `No hay conductores para eliminar`,
        details: `No se encontraron conductores asociados a su cuenta`
      }
    }
    
    const conductorIds = conductors.map(c => c.id)
    console.log(`Eliminando paquetes para ${conductorIds.length} conductores`)
    
    // Eliminar todos los paquetes asociados a estos conductores
    const { data: deletedPackages, error: packagesError } = await supabase
      .from('packages')
      .delete()
      .in('conductor_id', conductorIds)
      .select('id')

    if (packagesError) {
      console.warn("Error eliminando paquetes asociados:", packagesError.message)
      // Continuamos con la eliminación de conductores aunque falle la de paquetes
    }

    // Luego eliminar todos los conductores
    const { data: deletedConductors, error: conductorsError } = await supabase
      .from('conductors')
      .delete()
      .eq('user_id', userId)
      .select('id, nombre')

    if (conductorsError) {
      throw new Error(`Error eliminando conductores: ${conductorsError.message}`)
    }

    return {
      message: `Todos los conductores eliminados exitosamente`,
      details: `${deletedConductors?.length || 0} conductores y ${deletedPackages?.length || 0} paquetes asociados eliminados`
    }
  } catch (error) {
    console.error("Error en deleteAllConductors:", error)
    throw error
  }
}

// Eliminar todos los paquetes de la cuenta
async function deleteAllPackages(userId: string) {
  // Obtener conductores del usuario para filtrar paquetes
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  const conductorIds = conductors.map(c => c.id)

  // Eliminar todos los paquetes
  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .select('id')

  if (deleteError) {
    throw new Error(`Error eliminando paquetes: ${deleteError.message}`)
  }

  return {
    message: `Todos los paquetes eliminados exitosamente`,
    details: `${deletedPackages?.length || 0} paquetes eliminados de su cuenta`
  }
}

// Reset nuclear: eliminar TODO
async function nuclearReset(userId: string) {
  let deletedPackagesCount = 0
  let deletedConductorsCount = 0

  try {
    // Primero obtener los IDs de todos los conductores
    const { data: conductors, error: conductorsQueryError } = await supabase
      .from('conductors')
      .select('id')
      .eq('user_id', userId)
    
    if (conductorsQueryError) {
      throw new Error(`Error obteniendo conductores: ${conductorsQueryError.message}`)
    }
    
    if (conductors && conductors.length > 0) {
      const conductorIds = conductors.map(c => c.id)
      console.log(`Reset nuclear: Eliminando paquetes para ${conductorIds.length} conductores`)
      
      // Eliminar todos los paquetes asociados a estos conductores
      const { data: deletedPackages, error: packagesError } = await supabase
        .from('packages')
        .delete()
        .in('conductor_id', conductorIds)
        .select('id')

      if (packagesError) {
        console.warn('Error eliminando paquetes en reset nuclear:', packagesError.message)
      } else {
        deletedPackagesCount = deletedPackages?.length || 0
      }
    }

    // Luego eliminar todos los conductores
    const { data: deletedConductors, error: conductorsError } = await supabase
      .from('conductors')
      .delete()
      .eq('user_id', userId)
      .select('id')

    if (conductorsError) {
      throw new Error(`Error eliminando conductores en reset nuclear: ${conductorsError.message}`)
    }

    deletedConductorsCount = deletedConductors?.length || 0

    return {
      message: `☢️ RESET NUCLEAR COMPLETADO ☢️`,
      details: `TODOS los datos eliminados: ${deletedConductorsCount} conductores y ${deletedPackagesCount} paquetes. Su cuenta ha sido completamente reseteada.`
    }

  } catch (error) {
    console.error("Error en nuclearReset:", error)
    throw new Error(`Error en reset nuclear: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

