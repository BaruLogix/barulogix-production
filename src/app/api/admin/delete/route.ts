
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para registrar operaciones en el historial
async function logOperation(userId: string, operationType: string, description: string, details: any, affectedRecords: number) {
  try {
    await supabase
      .from('admin_operations_history')
      .insert([
        {
          user_id: userId,
          operation_type: operationType,
          description,
          details,
          affected_records: affectedRecords,
          can_undo: false, // Las eliminaciones no se pueden deshacer
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error('Error logging operation to history:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para realizar operaciones de eliminación'
      }, { status: 401 })
    }

    const body = await request.json()
    const { operation, conductor_id, state, date_from, date_to, tracking, bulk_trackings } = body

    if (!operation) {
      return NextResponse.json({ error: 'Tipo de operación requerido' }, { status: 400 })
    }

    let result = { message: '', details: '', affected_records: 0 }

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

    // Registrar la operación en el historial
    await logOperation(
      userId,
      operation,
      result.message,
      { details: result.details },
      result.affected_records
    )

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

// --- Funciones de eliminación ---

async function deleteConductorPackages(userId: string, conductorId: string) {
  if (!conductorId) throw new Error('ID del conductor es requerido')

  const { data: conductor, error: conductorError } = await supabase
    .from('conductors')
    .select('id, nombre')
    .eq('id', conductorId)
    .eq('user_id', userId)
    .single()

  if (conductorError || !conductor) throw new Error('Conductor no encontrado o no pertenece a su cuenta')

  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .eq('conductor_id', conductorId)
    .select('id')

  if (deleteError) throw new Error(`Error eliminando paquetes: ${deleteError.message}`)

  return {
    message: `Eliminar paquetes del conductor "${conductor.nombre}"`,
    details: `${deletedPackages?.length || 0} paquetes eliminados`,
    affected_records: deletedPackages?.length || 0
  }
}

async function deleteByDateRange(userId: string, dateFrom: string, dateTo: string) {
  if (!dateFrom || !dateTo) throw new Error('Fechas de inicio y fin son requeridas')

  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (!conductors || conductors.length === 0) throw new Error('No se encontraron conductores en su cuenta')
  const conductorIds = conductors.map(c => c.id)

  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .gte('created_at', dateFrom + 'T00:00:00.000Z')
    .lte('created_at', dateTo + 'T23:59:59.999Z')
    .select('id')

  if (deleteError) throw new Error(`Error eliminando paquetes: ${deleteError.message}`)

  return {
    message: `Eliminar paquetes por rango de fechas`,
    details: `${deletedPackages?.length || 0} paquetes eliminados entre ${new Date(dateFrom).toLocaleDateString('es-CO')} y ${new Date(dateTo).toLocaleDateString('es-CO')}`,
    affected_records: deletedPackages?.length || 0
  }
}

async function deleteByState(userId: string, state: number) {
  if (state === undefined || state === null) throw new Error('Estado es requerido')

  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (!conductors || conductors.length === 0) throw new Error('No se encontraron conductores en su cuenta')
  const conductorIds = conductors.map(c => c.id)

  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .eq('estado', state)
    .select('id')

  if (deleteError) throw new Error(`Error eliminando paquetes: ${deleteError.message}`)

  const stateNames = { 0: 'No Entregado', 1: 'Entregado', 2: 'Devuelto' }
  const stateName = stateNames[state as keyof typeof stateNames] || 'Desconocido'

  return {
    message: `Eliminar paquetes por estado "${stateName}"`,
    details: `${deletedPackages?.length || 0} paquetes eliminados`,
    affected_records: deletedPackages?.length || 0
  }
}

async function deleteSinglePackage(userId: string, tracking: string) {
  if (!tracking) throw new Error('Tracking es requerido')

  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (!conductors || conductors.length === 0) throw new Error('No se encontraron conductores en su cuenta')
  const conductorIds = conductors.map(c => c.id)

  const { data: deletedPackage, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .eq('tracking', tracking.trim())
    .select('id, tracking')

  if (deleteError) throw new Error(`Error eliminando paquete: ${deleteError.message}`)
  if (!deletedPackage || deletedPackage.length === 0) throw new Error(`Paquete con tracking "${tracking}" no encontrado en su cuenta`)

  return {
    message: `Eliminar paquete por tracking "${tracking}"`,
    details: `1 paquete eliminado`,
    affected_records: 1
  }
}

async function deleteBulkPackages(userId: string, bulkTrackings: string) {
  if (!bulkTrackings) throw new Error('Lista de trackings es requerida')

  const trackings = bulkTrackings.split('\n').map(t => t.trim()).filter(t => t.length > 0)
  if (trackings.length === 0) throw new Error('No se encontraron trackings válidos en la lista')

  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (!conductors || conductors.length === 0) throw new Error('No se encontraron conductores en su cuenta')
  const conductorIds = conductors.map(c => c.id)

  const { data: deletedPackages, error: deleteError } = await supabase
    .from('packages')
    .delete()
    .in('conductor_id', conductorIds)
    .in('tracking', trackings)
    .select('id, tracking')

  if (deleteError) throw new Error(`Error eliminando paquetes: ${deleteError.message}`)

  return {
    message: `Eliminar paquetes masivamente por trackings`,
    details: `${deletedPackages?.length || 0} de ${trackings.length} paquetes eliminados`,
    affected_records: deletedPackages?.length || 0
  }
}

async function deleteAllConductors(userId: string) {
  const { data: conductors, error: conductorsQueryError } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (conductorsQueryError) throw new Error(`Error obteniendo conductores: ${conductorsQueryError.message}`)
  if (!conductors || conductors.length === 0) return { message: 'No hay conductores para eliminar', details: 'No se encontraron conductores', affected_records: 0 }
  
  const conductorIds = conductors.map(c => c.id)
  const { data: deletedPackages, error: packagesError } = await supabase.from('packages').delete().in('conductor_id', conductorIds).select('id')
  if (packagesError) console.warn("Error eliminando paquetes asociados:", packagesError.message)

  const { data: deletedConductors, error: conductorsError } = await supabase.from('conductors').delete().eq('user_id', userId).select('id, nombre')
  if (conductorsError) throw new Error(`Error eliminando conductores: ${conductorsError.message}`)

  return {
    message: `Eliminar todos los conductores`,
    details: `${deletedConductors?.length || 0} conductores y ${deletedPackages?.length || 0} paquetes asociados eliminados`,
    affected_records: deletedConductors?.length || 0
  }
}

async function deleteAllPackages(userId: string) {
  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (!conductors || conductors.length === 0) throw new Error('No se encontraron conductores en su cuenta')
  const conductorIds = conductors.map(c => c.id)

  const { data: deletedPackages, error: deleteError } = await supabase.from('packages').delete().in('conductor_id', conductorIds).select('id')
  if (deleteError) throw new Error(`Error eliminando paquetes: ${deleteError.message}`)

  return {
    message: `Eliminar todos los paquetes`,
    details: `${deletedPackages?.length || 0} paquetes eliminados de su cuenta`,
    affected_records: deletedPackages?.length || 0
  }
}

async function nuclearReset(userId: string) {
  let deletedPackagesCount = 0
  let deletedConductorsCount = 0

  const { data: conductors } = await supabase.from('conductors').select('id').eq('user_id', userId)
  if (conductors && conductors.length > 0) {
    const conductorIds = conductors.map(c => c.id)
    const { data: deletedPackages } = await supabase.from('packages').delete().in('conductor_id', conductorIds).select('id')
    deletedPackagesCount = deletedPackages?.length || 0

    const { data: deletedConductors } = await supabase.from('conductors').delete().eq('user_id', userId).select('id')
    deletedConductorsCount = deletedConductors?.length || 0
  }

  return {
    message: `Reset nuclear de la cuenta`,
    details: `${deletedConductorsCount} conductores y ${deletedPackagesCount} paquetes eliminados`,
    affected_records: deletedConductorsCount + deletedPackagesCount
  }
}
