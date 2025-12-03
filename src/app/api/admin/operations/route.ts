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
          can_undo: true,
          created_at: new Date().toISOString()
        }
      ])
  } catch (error) {
    console.error("Error logging operation to history:", error)
    console.log("--- DETALLES DEL ERROR DE LOGGING ---")
    console.log("User ID:", userId)
    console.log("Operation Type:", operationType)
    console.log("Description:", description)
    console.log("Details:", JSON.stringify(details, null, 2))
    console.log("Affected Records:", affectedRecords)
    console.log("--- FIN DETALLES DEL ERROR DE LOGGING ---")
    // No fallar la operación principal si falla el log
  }
}

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
    const { operation, conductor_id, conductor_id_2, new_state, new_type, new_date, transfer_type, single_tracking, bulk_trackings, confirmation } = body

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
        result = await transferPackages(userId, conductor_id, conductor_id_2, transfer_type, single_tracking, bulk_trackings, confirmation)
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

  // Obtener los estados anteriores de los paquetes que se van a actualizar
  const { data: oldPackages, error: oldPackagesError } = await supabase
    .from('packages')
    .select('id, estado')
    .eq('conductor_id', conductorId)

  if (oldPackagesError) {
    throw new Error(`Error obteniendo estados anteriores: ${oldPackagesError.message}`)
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

  // Registrar en el historial
  await logOperation(
    userId,
    'change_states',
    `Cambiar estado a "${stateName}" para todos los paquetes de "${conductor.nombre}"`,
    {
      conductor_id: conductorId,
      new_state: newState,
      old_states: oldPackages?.map(p => ({ package_id: p.id, old_state: p.estado }))
    },
    updatedPackages?.length || 0
  )

  return {
    message: `Estados actualizados exitosamente`,
    details: `${updatedPackages?.length || 0} paquetes del conductor "${conductor.nombre}" cambiados a "${stateName}"`
  }
}

// Transferir paquetes entre conductores
async function transferPackages(userId: string, fromConductorId: string, toConductorId: string, transferType: string = 'all', singleTracking?: string, bulkTrackings?: string, confirmation?: boolean) {
  if (!fromConductorId || !toConductorId) {
    throw new Error('Ambos conductores son requeridos')
  }

  if (fromConductorId === toConductorId) {
    throw new Error('Los conductores origen y destino deben ser diferentes')
  }

  // Medida anti-dummy: requerir confirmación explícita para transferir todos los paquetes
  if (transferType === 'all' && confirmation !== true) {
    throw new Error('Se requiere confirmación explícita para transferir todos los paquetes. Esta es una medida de seguridad para prevenir operaciones masivas accidentales.')
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

  // Registrar en el historial
  await logOperation(
    userId,
    'transfer_packages',
    `Transferir ${transferTypeText} de "${fromConductor?.nombre}" a "${toConductor?.nombre}"`,
    {
      transfer_type: transferType,
      conductor_id: fromConductorId,
      conductor_id_2: toConductorId,
      single_tracking: singleTracking,
      bulk_trackings: bulkTrackings,
      from_conductor_name: fromConductor?.nombre,
      to_conductor_name: toConductor?.nombre
    },
    transferredPackages?.length || 0
  )

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

  // Obtener las fechas anteriores de los paquetes que se van a actualizar
  const { data: oldPackages, error: oldPackagesError } = await supabase
    .from('packages')
    .select('id, fecha_entrega')
    .eq('conductor_id', conductorId)

  if (oldPackagesError) {
    throw new Error(`Error obteniendo fechas anteriores: ${oldPackagesError.message}`)
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

  // Registrar en el historial
  await logOperation(
    userId,
    'update_dates',
    `Actualizar fecha a "${new Date(newDate).toLocaleDateString('es-CO')}" para todos los paquetes de "${conductor.nombre}"`,
    {
      conductor_id: conductorId,
      new_date: newDate,
      old_dates: oldPackages?.map(p => ({ package_id: p.id, old_date: p.fecha_entrega }))
    },
    updatedPackages?.length || 0
  )

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

  // Obtener los tipos anteriores de los paquetes que se van a actualizar
  const { data: oldPackages, error: oldPackagesError } = await supabase
    .from("packages")
    .select("id, tipo")
    .eq("conductor_id", conductorId);

  if (oldPackagesError) {
    throw new Error(`Error obteniendo tipos anteriores: ${oldPackagesError.message}`);
  }

  // Actualizar tipos de paquetes
  const { data: updatedPackages, error: updateError } = await supabase
    .from("packages")
    .update({ tipo: newType })
    .eq("conductor_id", conductorId)
    .select("id");

  if (updateError) {
    throw new Error(`Error actualizando tipos: ${updateError.message}`)
  }

  // Registrar en el historial
  await logOperation(
    userId,
    'change_types',
    `Cambiar tipo a "${newType}" para todos los paquetes de "${conductor.nombre}"`,
    {
      conductor_id: conductorId,
      new_type: newType,
      old_types: oldPackages?.map(p => ({ package_id: p.id, old_type: p.tipo }))
    },
    updatedPackages?.length || 0
  )

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

  // Registrar en el historial
  await logOperation(
    userId,
    'toggle_conductors',
    `Se han ${action} todos los conductores`,
    {
      new_state: newActiveState,
      old_states: conductors.map(c => ({ conductor_id: c.id, old_state: c.activo }))
    },
    updatedConductors?.length || 0
  )

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

