import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json({ error: 'Usuario no autenticado' }, { status: 401 })
    }

    // Obtener la última operación que se puede deshacer
    const { data: lastOperation, error: historyError } = await supabase
      .from('admin_operations_history')
      .select('*')
      .eq('user_id', userId)
      .eq('can_undo', true)
      .order('created_at', { ascending: false })
      .limit(1)

    if (historyError) {
      console.error('Error fetching last operation:', historyError)
      return NextResponse.json({ error: 'Error al obtener última operación' }, { status: 500 })
    }

    if (!lastOperation || lastOperation.length === 0) {
      return NextResponse.json({ error: 'No hay operaciones para deshacer' }, { status: 400 })
    }

    const operation = lastOperation[0]
    let undoResult = { success: false, message: '', details: '' }

    // Ejecutar la operación de deshacer según el tipo
    switch (operation.operation_type) {
      case 'transfer_packages':
        undoResult = await undoTransferPackages(operation)
        break
      case 'change_states':
        undoResult = await undoChangeStates(operation)
        break
      case 'update_dates':
        undoResult = await undoUpdateDates(operation)
        break
      case 'change_types':
        undoResult = await undoChangeTypes(operation)
        break
      case 'create_package':
        undoResult = await undoCreatePackage(operation)
        break
      case 'create_bulk_packages':
        undoResult = await undoCreateBulkPackages(operation)
        break
      case 'delete_package':
        undoResult = await undoDeletePackage(operation)
        break
      default:
        return NextResponse.json({ error: 'Tipo de operación no soportada para deshacer' }, { status: 400 })
    }

    if (undoResult.success) {
      // Marcar la operación como deshecha
      await supabase
        .from('admin_operations_history')
        .update({ 
          can_undo: false,
          undone_at: new Date().toISOString()
        })
        .eq('id', operation.id)

      // Registrar la operación de deshacer en el historial
      await supabase
        .from('admin_operations_history')
        .insert([
          {
            user_id: userId,
            operation_type: 'undo_' + operation.operation_type,
            description: `Deshacer: ${operation.description}`,
            details: { original_operation_id: operation.id, undo_details: undoResult.details },
            affected_records: operation.affected_records,
            can_undo: false,
            created_at: new Date().toISOString()
          }
        ])

      return NextResponse.json({ 
        success: true, 
        message: undoResult.message,
        details: undoResult.details
      })
    } else {
      return NextResponse.json({ 
        error: undoResult.message,
        details: undoResult.details
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error in undo API:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

async function undoTransferPackages(operation: any) {
  try {
    const details = operation.details
    const { transfer_type, conductor_id, conductor_id_2, single_tracking, bulk_trackings } = details

    if (transfer_type === 'individual' && single_tracking) {
      // Revertir transferencia individual
      const { error } = await supabase
        .from('packages')
        .update({ conductor_id: conductor_id })
        .eq('tracking', single_tracking)
        .eq('conductor_id', conductor_id_2)

      if (error) throw error

      return {
        success: true,
        message: `Transferencia individual revertida exitosamente`,
        details: `Paquete ${single_tracking} devuelto al conductor original`
      }
    } else if (transfer_type === 'bulk' && bulk_trackings) {
      // Revertir transferencia masiva
      const trackingList = bulk_trackings.split('\n').filter((t: string) => t.trim().length > 0)
      
      const { error } = await supabase
        .from('packages')
        .update({ conductor_id: conductor_id })
        .in('tracking', trackingList)
        .eq('conductor_id', conductor_id_2)

      if (error) throw error

      return {
        success: true,
        message: `Transferencia masiva revertida exitosamente`,
        details: `${trackingList.length} paquetes devueltos al conductor original`
      }
    } else if (transfer_type === 'all') {
      // Para transferencias de todos los paquetes, necesitamos más información
      // Por seguridad, no permitimos deshacer transferencias masivas de todos los paquetes
      return {
        success: false,
        message: 'No se puede deshacer transferencia masiva de todos los paquetes por seguridad',
        details: 'Contacte al administrador del sistema para revertir esta operación'
      }
    }

    return {
      success: false,
      message: 'Tipo de transferencia no reconocido',
      details: 'No se pudo determinar cómo revertir la operación'
    }
  } catch (error) {
    console.error('Error undoing transfer:', error)
    return {
      success: false,
      message: 'Error al revertir transferencia',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

async function undoChangeStates(operation: any) {
  try {
    const details = operation.details
    const { conductor_id, old_states, new_state } = details

    if (!old_states || old_states.length === 0) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay información de estados anteriores',
        details: 'La operación original no guardó los estados previos'
      }
    }

    // Revertir estados uno por uno
    for (const stateInfo of old_states) {
      await supabase
        .from('packages')
        .update({ estado: stateInfo.old_state })
        .eq('id', stateInfo.package_id)
    }

    return {
      success: true,
      message: 'Estados revertidos exitosamente',
      details: `${old_states.length} paquetes restaurados a sus estados anteriores`
    }
  } catch (error) {
    console.error('Error undoing state changes:', error)
    return {
      success: false,
      message: 'Error al revertir cambios de estado',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

async function undoUpdateDates(operation: any) {
  try {
    const details = operation.details
    const { conductor_id, old_dates, new_date } = details

    if (!old_dates || old_dates.length === 0) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay información de fechas anteriores',
        details: 'La operación original no guardó las fechas previas'
      }
    }

    // Revertir fechas una por una
    for (const dateInfo of old_dates) {
      await supabase
        .from('packages')
        .update({ fecha_entrega: dateInfo.old_date })
        .eq('id', dateInfo.package_id)
    }

    return {
      success: true,
      message: 'Fechas revertidas exitosamente',
      details: `${old_dates.length} paquetes restaurados a sus fechas anteriores`
    }
  } catch (error) {
    console.error('Error undoing date updates:', error)
    return {
      success: false,
      message: 'Error al revertir cambios de fecha',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

async function undoChangeTypes(operation: any) {
  try {
    const details = operation.details
    const { conductor_id, old_types, new_type } = details

    if (!old_types || old_types.length === 0) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay información de tipos anteriores',
        details: 'La operación original no guardó los tipos previos'
      }
    }

    // Revertir tipos uno por uno
    for (const typeInfo of old_types) {
      await supabase
        .from('packages')
        .update({ tipo: typeInfo.old_type })
        .eq('id', typeInfo.package_id)
    }

    return {
      success: true,
      message: 'Tipos revertidos exitosamente',
      details: `${old_types.length} paquetes restaurados a sus tipos anteriores`
    }
  } catch (error) {
    console.error('Error undoing type changes:', error)
    return {
      success: false,
      message: 'Error al revertir cambios de tipo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}


async function undoCreatePackage(operation: any) {
  try {
    const details = operation.details;
    const packageId = details.package?.id;

    if (!packageId) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay ID de paquete',
        details: 'La operación original no guardó el ID del paquete'
      };
    }

    // Eliminar el paquete creado
    const { error } = await supabase
      .from('packages')
      .delete()
      .eq('id', packageId);

    if (error) throw error;

    return {
      success: true,
      message: 'Paquete individual eliminado exitosamente',
      details: `Paquete ${details.package?.tracking} ha sido eliminado`
    };
  } catch (error) {
    console.error('Error undoing create package:', error);
    return {
      success: false,
      message: 'Error al deshacer creación de paquete',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function undoCreateBulkPackages(operation: any) {
  try {
    const details = operation.details;
    const insertedPackages = details.inserted_packages || [];

    if (insertedPackages.length === 0) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay paquetes para eliminar',
        details: 'La operación original no guardó información de paquetes'
      };
    }

    // Eliminar todos los paquetes creados usando sus trackings
    const trackings = insertedPackages.map((p: any) => p.tracking);
    
    const { error } = await supabase
      .from('packages')
      .delete()
      .in('tracking', trackings);

    if (error) throw error;

    return {
      success: true,
      message: 'Paquetes masivos eliminados exitosamente',
      details: `${insertedPackages.length} paquetes han sido eliminados`
    };
  } catch (error) {
    console.error('Error undoing create bulk packages:', error);
    return {
      success: false,
      message: 'Error al deshacer creación de paquetes masivos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

async function undoDeletePackage(operation: any) {
  try {
    const details = operation.details;
    const packageData = details.package;

    if (!packageData) {
      return {
        success: false,
        message: 'No se puede deshacer: no hay datos del paquete',
        details: 'La operación original no guardó los datos del paquete'
      };
    }

    // Recrear el paquete eliminado
    const { error } = await supabase
      .from('packages')
      .insert([{
        id: packageData.id,
        tracking: packageData.tracking,
        conductor_id: packageData.conductor_id,
        tipo: packageData.tipo,
        estado: packageData.estado,
        fecha_entrega: packageData.fecha_entrega,
        valor: packageData.valor,
        created_at: packageData.created_at,
        updated_at: packageData.updated_at
      }]);

    if (error) throw error;

    return {
      success: true,
      message: 'Paquete restaurado exitosamente',
      details: `Paquete ${packageData.tracking} ha sido restaurado`
    };
  } catch (error) {
    console.error('Error undoing delete package:', error);
    return {
      success: false,
      message: 'Error al deshacer eliminación de paquete',
      details: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}
