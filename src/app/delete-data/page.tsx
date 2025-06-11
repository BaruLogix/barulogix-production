'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

interface DeleteOperation {
  type: string
  description: string
  icon: string
  color: string
  danger: 'low' | 'medium' | 'high' | 'extreme'
}

export default function DeleteDataPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConductor, setSelectedConductor] = useState('')
  const [selectedState, setSelectedState] = useState('0')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [trackingToDelete, setTrackingToDelete] = useState('')
  const [bulkTrackings, setBulkTrackings] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<DeleteOperation | null>(null)
  const [operationResult, setOperationResult] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const router = useRouter()

  const deleteOperations: DeleteOperation[] = [
    {
      type: 'delete_conductor_packages',
      description: 'Eliminar todos los paquetes de un conductor',
      icon: '📦🗑️',
      color: 'bg-orange-600 hover:bg-orange-700',
      danger: 'medium'
    },
    {
      type: 'delete_by_date_range',
      description: 'Eliminar paquetes por rango de fechas',
      icon: '📅🗑️',
      color: 'bg-red-500 hover:bg-red-600',
      danger: 'medium'
    },
    {
      type: 'delete_by_state',
      description: 'Eliminar paquetes por estado específico',
      icon: '🔄🗑️',
      color: 'bg-red-600 hover:bg-red-700',
      danger: 'medium'
    },
    {
      type: 'delete_single_package',
      description: 'Eliminar paquete individual por tracking',
      icon: '🎯🗑️',
      color: 'bg-yellow-600 hover:bg-yellow-700',
      danger: 'low'
    },
    {
      type: 'delete_bulk_packages',
      description: 'Eliminar múltiples paquetes por trackings',
      icon: '📋🗑️',
      color: 'bg-orange-700 hover:bg-orange-800',
      danger: 'medium'
    },
    {
      type: 'delete_all_conductors',
      description: 'Eliminar todos los conductores de la cuenta',
      icon: '👥💀',
      color: 'bg-red-800 hover:bg-red-900',
      danger: 'extreme'
    },
    {
      type: 'delete_all_packages',
      description: 'Eliminar TODOS los paquetes de la cuenta',
      icon: '💣🗑️',
      color: 'bg-red-900 hover:bg-red-950',
      danger: 'extreme'
    },
    {
      type: 'nuclear_reset',
      description: 'RESET NUCLEAR: Eliminar TODO (conductores + paquetes)',
      icon: '☢️💥',
      color: 'bg-black hover:bg-gray-900',
      danger: 'extreme'
    }
  ]

  useEffect(() => {
    checkAuth()
    loadConductors()
    
    // Establecer fechas por defecto (últimos 30 días)
    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    setDateFrom(thirtyDaysAgo)
    setDateTo(today)
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadConductors = async () => {
    try {
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario')
        return
      }
      
      const headers = { 'x-user-id': userId }
      const response = await fetch('/api/conductors', { headers })
      
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    }
  }

  const openDeleteModal = (operation: DeleteOperation) => {
    setCurrentOperation(operation)
    setOperationResult('')
    setConfirmationText('')
    setShowModal(true)
  }

  const getRequiredConfirmation = (operation: DeleteOperation) => {
    switch (operation.danger) {
      case 'extreme':
        return 'ELIMINAR TODO'
      case 'high':
        return 'CONFIRMAR'
      case 'medium':
        return 'ELIMINAR'
      case 'low':
        return 'OK'
      default:
        return 'CONFIRMAR'
    }
  }

  const executeDeleteOperation = async () => {
    if (!currentOperation) return

    const requiredText = getRequiredConfirmation(currentOperation)
    if (confirmationText !== requiredText) {
      alert(`Debe escribir exactamente: ${requiredText}`)
      return
    }

    setLoading(true)
    try {
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setLoading(false)
        return
      }

      const requestBody: any = {
        operation: currentOperation.type,
        conductor_id: selectedConductor,
        state: parseInt(selectedState),
        date_from: dateFrom,
        date_to: dateTo,
        tracking: trackingToDelete,
        bulk_trackings: bulkTrackings
      }

      const response = await fetch('/api/admin/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        setOperationResult(`✅ Operación de eliminación completada:\n\n${result.message}\n\nDetalles: ${result.details || 'N/A'}`)
        
        // Recargar conductores si es necesario
        if (currentOperation.type === 'delete_all_conductors' || currentOperation.type === 'nuclear_reset') {
          await loadConductors()
        }
      } else {
        const error = await response.json()
        setOperationResult(`❌ Error en la eliminación:\n\n${error.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error executing delete operation:', error)
      setOperationResult(`❌ Error de conexión:\n\n${error}`)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setCurrentOperation(null)
    setSelectedConductor('')
    setSelectedState('0')
    setTrackingToDelete('')
    setBulkTrackings('')
    setConfirmationText('')
    setOperationResult('')
  }

  const getDangerBadge = (danger: string) => {
    const badges = {
      low: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      medium: 'bg-orange-100 text-orange-800 border-orange-200',
      high: 'bg-red-100 text-red-800 border-red-200',
      extreme: 'bg-red-200 text-red-900 border-red-300 font-bold'
    }
    
    const labels = {
      low: 'Riesgo Bajo',
      medium: 'Riesgo Medio',
      high: 'Riesgo Alto',
      extreme: '⚠️ EXTREMO ⚠️'
    }

    return (
      <span className={`px-2 py-1 text-xs rounded border ${badges[danger as keyof typeof badges]}`}>
        {labels[danger as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-red-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo.png"
                alt="BaruLogix"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-red-900">BaruLogix - Eliminar Datos</h1>
                <p className="text-red-700">Operaciones de eliminación y formateo</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-barulogix-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('user')
                  localStorage.removeItem('session')
                  router.push('/auth/login')
                }}
                className="btn-barulogix-danger"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Danger Warning Banner */}
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <svg className="w-8 h-8 text-red-600 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-red-900 font-bold text-lg">⚠️ ZONA DE ELIMINACIÓN PELIGROSA ⚠️</h3>
              <p className="text-red-800 text-sm mt-1">
                Las operaciones aquí son <strong>IRREVERSIBLES</strong>. Los datos eliminados NO se pueden recuperar.
                <br />
                Lea cuidadosamente cada operación y confirme antes de proceder.
              </p>
            </div>
          </div>
        </div>

        {/* Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {deleteOperations.map((operation, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border-2 border-gray-200">
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-2xl">{operation.icon}</div>
                  {getDangerBadge(operation.danger)}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-4 min-h-[2.5rem]">
                  {operation.description}
                </h3>
                <button
                  onClick={() => openDeleteModal(operation)}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${operation.color}`}
                >
                  {operation.danger === 'extreme' ? '☢️ ELIMINAR' : 'Eliminar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delete Modal */}
      {showModal && currentOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border-4 border-red-500">
            <div className="flex justify-between items-center p-6 border-b border-red-200 bg-red-50">
              <h3 className="text-xl font-bold text-red-900">
                {currentOperation.icon} {currentOperation.description}
              </h3>
              <button
                onClick={closeModal}
                className="text-red-600 hover:text-red-800 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Danger Level Warning */}
              <div className={`p-4 rounded-lg border-2 ${
                currentOperation.danger === 'extreme' ? 'bg-red-100 border-red-400' :
                currentOperation.danger === 'high' ? 'bg-orange-100 border-orange-400' :
                currentOperation.danger === 'medium' ? 'bg-yellow-100 border-yellow-400' :
                'bg-blue-100 border-blue-400'
              }`}>
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {currentOperation.danger === 'extreme' ? '☢️' :
                     currentOperation.danger === 'high' ? '⚠️' :
                     currentOperation.danger === 'medium' ? '⚡' : 'ℹ️'}
                  </span>
                  <div>
                    <h4 className="font-bold">
                      {currentOperation.danger === 'extreme' ? 'OPERACIÓN EXTREMADAMENTE PELIGROSA' :
                       currentOperation.danger === 'high' ? 'Operación de Alto Riesgo' :
                       currentOperation.danger === 'medium' ? 'Operación de Riesgo Medio' :
                       'Operación de Bajo Riesgo'}
                    </h4>
                    <p className="text-sm">
                      {currentOperation.danger === 'extreme' ? 'Esta operación eliminará TODOS los datos de su cuenta de forma IRREVERSIBLE.' :
                       currentOperation.danger === 'high' ? 'Esta operación eliminará una gran cantidad de datos de forma irreversible.' :
                       currentOperation.danger === 'medium' ? 'Esta operación eliminará datos específicos de forma irreversible.' :
                       'Esta operación eliminará datos específicos de forma irreversible.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Operation-specific fields */}
              {(currentOperation.type === 'delete_conductor_packages') && (
                <div>
                  <label className="label-barulogix">Conductor</label>
                  <select
                    required
                    value={selectedConductor}
                    onChange={(e) => setSelectedConductor(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="">Seleccionar conductor</option>
                    {conductors.map(conductor => (
                      <option key={conductor.id} value={conductor.id}>
                        {conductor.nombre} - {conductor.zona} {conductor.activo ? '(Activo)' : '(Inactivo)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentOperation.type === 'delete_by_date_range' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-barulogix">Fecha Desde</label>
                    <input
                      type="date"
                      required
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="input-barulogix-modern focus-ring"
                    />
                  </div>
                  <div>
                    <label className="label-barulogix">Fecha Hasta</label>
                    <input
                      type="date"
                      required
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="input-barulogix-modern focus-ring"
                    />
                  </div>
                </div>
              )}

              {currentOperation.type === 'delete_by_state' && (
                <div>
                  <label className="label-barulogix">Estado a Eliminar</label>
                  <select
                    value={selectedState}
                    onChange={(e) => setSelectedState(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="0">No Entregado</option>
                    <option value="1">Entregado</option>
                    <option value="2">Devuelto</option>
                  </select>
                </div>
              )}

              {currentOperation.type === 'delete_single_package' && (
                <div>
                  <label className="label-barulogix">Tracking del Paquete</label>
                  <input
                    type="text"
                    required
                    value={trackingToDelete}
                    onChange={(e) => setTrackingToDelete(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Ej: SH123456789"
                  />
                </div>
              )}

              {currentOperation.type === 'delete_bulk_packages' && (
                <div>
                  <label className="label-barulogix">Trackings a Eliminar (uno por línea)</label>
                  <textarea
                    required
                    value={bulkTrackings}
                    onChange={(e) => setBulkTrackings(e.target.value)}
                    className="input-barulogix-modern focus-ring min-h-[120px] font-mono text-sm"
                    placeholder="SH123456789&#10;DR987654321&#10;TE555666777"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Pegue una lista de trackings, uno por línea
                  </p>
                </div>
              )}

              {/* Confirmation Text */}
              <div>
                <label className="label-barulogix">
                  Confirmación: Escriba exactamente "{getRequiredConfirmation(currentOperation)}"
                </label>
                <input
                  type="text"
                  required
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                  placeholder={`Escriba: ${getRequiredConfirmation(currentOperation)}`}
                />
              </div>

              {/* Operation Result */}
              {operationResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Resultado de la Eliminación:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{operationResult}</pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-red-200">
                <button
                  onClick={closeModal}
                  className="btn-barulogix-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={executeDeleteOperation}
                  disabled={loading || confirmationText !== getRequiredConfirmation(currentOperation)}
                  className={`${currentOperation.color} text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Eliminando...' : 
                   currentOperation.danger === 'extreme' ? '☢️ ELIMINAR TODO' : 
                   '🗑️ Confirmar Eliminación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

