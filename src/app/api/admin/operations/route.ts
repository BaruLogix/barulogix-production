import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG ADMIN OPERATIONS ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para realizar operaciones administrativas'
      }, { status: 401 })
    }

    const body = await request.json()
    const { operation, conductor_id, conductor_id_2, new_state, new_type, new_date, transfer_type, single_tracking, bulk_trackings } = body

    console.log('Operación solicitada:', { operation, conductor_id, conductor_id_2, new_state, new_type, new_date, transfer_type, single_tracking, bulk_trackings })

    if (!operation) {
      return NextResponse.json({ error: 'Tipo de operación requerido' }, { status: 400 })
    }

    let result = { message: '', details: '' }

    switch (operation) {
      case 'change_states':
        result = await changePackageStates(userId, conductor_id, new_state)
        break
      
      case 'transfer_packages':
        result = await transferPackages(userId, conductor_id, conductor_id_2, transfer_type, single_tracking, bulk_trackings)
        break
      
      case 'update_dates':
        result = await updatePackageDates(userId, conductor_id, new_date)
        break
      
      case 'change_types':
        result = await changePackageTypes(userId, conductor_id, new_type)
        break
      
      case 'toggle_conductors':
        result = await toggleAllConductors(userId)
        break
      
      case 'recalculate_stats':
        result = await recalculateStats(userId)
        break
      
      default:
        return NextResponse.json({ error: 'Operación no válida' }, { status: 400 })
    }

    console.log('Resultado de operación:', result)

    return NextResponse.json({
      success: true,
      message: result.message,
      details: result.details
    })

  } catch (error) {
    console.error('Error en operación administrativa:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Cambiar estados de todos los paquetes de un conductor
async function changePackageStates(userId: string, conductorId: string, newState: number) {
  if (!conductorId || newState === undefined) {
    throw new Error('Conductor ID y nuevo estado son requeridos')
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

  // Actualizar estados de paquetes
  const { data: updatedPackages, error: updateError } = await supabase
    .from('packages')
    .update({ estado: newState })
    .eq('conductor_id', conductorId)
    .select('id')

  if (updateError) {
    throw new Error(`Error actualizando estados: ${updateError.message}`)
  }

  const stateNames = { 0: 'No Entregado', 1: 'Entregado', 2: 'Devuelto' }
  const stateName = stateNames[newState as keyof typeof stateNames] || 'Desconocido'

  return {
    message: `Estados actualizados exitosamente`,
    details: `${updatedPackages?.length || 0} paquetes del conductor "${conductor.nombre}" cambiados a "${stateName}"`
  }
}

// Transferir paquetes entre conductores
async function transferPackages(userId: string, fromConductorId: string, toConductorId: string, transferType: string = 'all', singleTracking?: string, bulkTrackings?: string) {
  if (!fromConductorId || !toConductorId) {
    throw new Error('Ambos conductores son requeridos')
  }

  if (fromConductorId === toConductorId) {
    throw new Error('Los conductores origen y destino deben ser diferentes')
  }

  // Verificar que ambos conductores pertenecen al usuario
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id, nombre')
    .eq('user_id', userId)
    .in('id', [fromConductorId, toConductorId])

  if (conductorsError || !conductors || conductors.length !== 2) {
    throw new Error('Uno o ambos conductores no encontrados o no pertenecen a su cuenta')
  }

  const fromConductor = conductors.find(c => c.id === fromConductorId)
  const toConductor = conductors.find(c => c.id === toConductorId)

  let transferQuery = supabase
    .from('packages')
    .update({ conductor_id: toConductorId })
    .eq('conductor_id', fromConductorId)

  // Aplicar filtros según el tipo de transferencia
  if (transferType === 'individual' && singleTracking) {
    transferQuery = transferQuery.eq('tracking', singleTracking.trim())
  } else if (transferType === 'bulk' && bulkTrackings) {
    const trackingList = bulkTrackings
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    
    if (trackingList.length === 0) {
      throw new Error('Lista de trackings vacía')
    }
    
    transferQuery = transferQuery.in('tracking', trackingList)
  }
  // Si es 'all', no se aplican filtros adicionales

  const { data: transferredPackages, error: transferError } = await transferQuery.select('id, tracking')

  if (transferError) {
    throw new Error(`Error transfiriendo paquetes: ${transferError.message}`)
  }

  const transferTypeText = transferType === 'all' ? 'todos los paquetes' : 
                          transferType === 'individual' ? `paquete "${singleTracking}"` :
                          `${bulkTrackings?.split('\n').filter(t => t.trim()).length || 0} paquetes específicos`

  return {
    message: `Paquetes transferidos exitosamente`,
    details: `${transferredPackages?.length || 0} paquetes transferidos (${transferTypeText}) de "${fromConductor?.nombre}" a "${toConductor?.nombre}"`
  }
}

// Actualizar fechas de entrega masivamente
async function updatePackageDates(userId: string, conductorId: string, newDate: string) {
  if (!conductorId || !newDate) {
    throw new Error('Conductor ID y nueva fecha son requeridos')
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

  // Actualizar fechas de paquetes
  const { data: updatedPackages, error: updateError } = await supabase
    .from('packages')
    .update({ fecha_entrega: newDate })
    .eq('conductor_id', conductorId)
    .select('id')

  if (updateError) {
    throw new Error(`Error actualizando fechas: ${updateError.message}`)
  }

  return {
    message: `Fechas actualizadas exitosamente`,
    details: `${updatedPackages?.length || 0} paquetes del conductor "${conductor.nombre}" actualizados a la fecha ${new Date(newDate).toLocaleDateString('es-CO')}`
  }
}

// Cambiar tipos de paquetes
async function changePackageTypes(userId: string, conductorId: string, newType: string) {
  if (!conductorId || !newType) {
    throw new Error('Conductor ID y nuevo tipo son requeridos')
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

  // Actualizar tipos de paquetes
  const { data: updatedPackages, error: updateError } = await supabase
    .from('packages')
    .update({ tipo: newType })
    .eq('conductor_id', conductorId)
    .select('id')

  if (updateError) {
    throw new Error(`Error actualizando tipos: ${updateError.message}`)
  }

  return {
    message: `Tipos actualizados exitosamente`,
    details: `${updatedPackages?.length || 0} paquetes del conductor "${conductor.nombre}" cambiados a tipo "${newType}"`
  }
}

// Activar/Desactivar todos los conductores
async function toggleAllConductors(userId: string) {
  // Obtener estado actual de conductores
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id, activo')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  if (!conductors || conductors.length === 0) {
    throw new Error('No se encontraron conductores en su cuenta')
  }

  // Determinar nueva acción (si todos están activos, desactivar; si no, activar todos)
  const allActive = conductors.every(c => c.activo)
  const newActiveState = !allActive

  // Actualizar todos los conductores
  const { data: updatedConductors, error: updateError } = await supabase
    .from('conductors')
    .update({ activo: newActiveState })
    .eq('user_id', userId)
    .select('id')

  if (updateError) {
    throw new Error(`Error actualizando conductores: ${updateError.message}`)
  }

  const action = newActiveState ? 'activados' : 'desactivados'

  return {
    message: `Conductores ${action} exitosamente`,
    details: `${updatedConductors?.length || 0} conductores han sido ${action}`
  }
}

// Recalcular estadísticas del sistema
async function recalculateStats(userId: string) {
  // Obtener conteos actuales
  const { data: conductors, error: conductorsError } = await supabase
    .from('conductors')
    .select('id, activo')
    .eq('user_id', userId)

  if (conductorsError) {
    throw new Error(`Error obteniendo conductores: ${conductorsError.message}`)
  }

  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select('id, estado, tipo, valor, conductor_id')
    .in('conductor_id', (conductors || []).map(c => c.id))

  if (packagesError) {
    throw new Error(`Error obteniendo paquetes: ${packagesError.message}`)
  }

  // Calcular estadísticas
  const totalConductors = conductors?.length || 0
  const activeConductors = conductors?.filter(c => c.activo).length || 0
  const totalPackages = packages?.length || 0
  const entregados = packages?.filter(p => p.estado === 1).length || 0
  const noEntregados = packages?.filter(p => p.estado === 0).length || 0
  const devueltos = packages?.filter(p => p.estado === 2).length || 0
  const valorTotalDropi = packages?.filter(p => p.tipo === 'Dropi' && p.valor)
    .reduce((sum, p) => sum + (p.valor || 0), 0) || 0

  return {
    message: `Estadísticas recalculadas exitosamente`,
    details: `Conductores: ${totalConductors} (${activeConductors} activos) | Paquetes: ${totalPackages} | Entregados: ${entregados} | Pendientes: ${noEntregados} | Devueltos: ${devueltos} | Valor Dropi: $${valorTotalDropi.toLocaleString('es-CO')}`
  }
}

