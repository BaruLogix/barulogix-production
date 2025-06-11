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

interface AdminOperation {
  type: string
  description: string
  icon: string
  color: string
}

export default function AdminPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConductor, setSelectedConductor] = useState('')
  const [selectedConductor2, setSelectedConductor2] = useState('')
  const [newState, setNewState] = useState('1')
  const [newType, setNewType] = useState('Shein/Temu')
  const [newDate, setNewDate] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [currentOperation, setCurrentOperation] = useState<AdminOperation | null>(null)
  const [operationResult, setOperationResult] = useState('')
  const router = useRouter()

  const adminOperations: AdminOperation[] = [
    {
      type: 'change_states',
      description: 'Cambiar estados de todos los paquetes de un conductor',
      icon: '🔄',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      type: 'transfer_packages',
      description: 'Transferir paquetes entre conductores',
      icon: '📦',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      type: 'update_dates',
      description: 'Actualizar fechas de entrega masivamente',
      icon: '📅',
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    {
      type: 'change_types',
      description: 'Cambiar tipos de paquetes de un conductor',
      icon: '🏷️',
      color: 'bg-orange-500 hover:bg-orange-600'
    },
    {
      type: 'toggle_conductors',
      description: 'Activar/Desactivar todos los conductores',
      icon: '👥',
      color: 'bg-indigo-500 hover:bg-indigo-600'
    },
    {
      type: 'recalculate_stats',
      description: 'Recalcular estadísticas del sistema',
      icon: '📊',
      color: 'bg-teal-500 hover:bg-teal-600'
    }
  ]

  useEffect(() => {
    checkAuth()
    loadConductors()
    
    // Establecer fecha por defecto (hoy)
    const today = new Date().toISOString().split('T')[0]
    setNewDate(today)
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

  const openOperationModal = (operation: AdminOperation) => {
    setCurrentOperation(operation)
    setOperationResult('')
    setShowModal(true)
  }

  const executeOperation = async () => {
    if (!currentOperation) return

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
        conductor_id_2: selectedConductor2,
        new_state: parseInt(newState),
        new_type: newType,
        new_date: newDate
      }

      const response = await fetch('/api/admin/operations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        setOperationResult(`✅ Operación completada exitosamente:\n\n${result.message}\n\nDetalles: ${result.details || 'N/A'}`)
        
        // Recargar conductores si es necesario
        if (currentOperation.type === 'toggle_conductors') {
          await loadConductors()
        }
      } else {
        const error = await response.json()
        setOperationResult(`❌ Error en la operación:\n\n${error.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error executing operation:', error)
      setOperationResult(`❌ Error de conexión:\n\n${error}`)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setCurrentOperation(null)
    setSelectedConductor('')
    setSelectedConductor2('')
    setNewState('1')
    setNewType('Shein/Temu')
    setOperationResult('')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-secondary-200">
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
                <h1 className="text-2xl font-bold text-secondary-900">BaruLogix - Administración</h1>
                <p className="text-secondary-600">Operaciones administrativas avanzadas</p>
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
        {/* Warning Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <h3 className="text-yellow-800 font-semibold">⚠️ Zona de Administración</h3>
              <p className="text-yellow-700 text-sm">Las operaciones aquí pueden afectar múltiples registros. Use con precaución.</p>
            </div>
          </div>
        </div>

        {/* Operations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminOperations.map((operation, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="text-3xl mr-3">{operation.icon}</div>
                  <h3 className="text-lg font-semibold text-secondary-900">{operation.description}</h3>
                </div>
                <button
                  onClick={() => openOperationModal(operation)}
                  className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-colors duration-200 ${operation.color}`}
                >
                  Ejecutar Operación
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operation Modal */}
      {showModal && currentOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-secondary-200">
              <h3 className="text-xl font-semibold text-secondary-900">
                {currentOperation.icon} {currentOperation.description}
              </h3>
              <button
                onClick={closeModal}
                className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Conductor Selection */}
              {(currentOperation.type === 'change_states' || 
                currentOperation.type === 'update_dates' || 
                currentOperation.type === 'change_types' ||
                currentOperation.type === 'transfer_packages') && (
                <div>
                  <label className="label-barulogix">
                    {currentOperation.type === 'transfer_packages' ? 'Conductor Origen' : 'Conductor'}
                  </label>
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

              {/* Second Conductor for Transfer */}
              {currentOperation.type === 'transfer_packages' && (
                <div>
                  <label className="label-barulogix">Conductor Destino</label>
                  <select
                    required
                    value={selectedConductor2}
                    onChange={(e) => setSelectedConductor2(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="">Seleccionar conductor destino</option>
                    {conductors.filter(c => c.id !== selectedConductor).map(conductor => (
                      <option key={conductor.id} value={conductor.id}>
                        {conductor.nombre} - {conductor.zona} {conductor.activo ? '(Activo)' : '(Inactivo)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* State Selection */}
              {currentOperation.type === 'change_states' && (
                <div>
                  <label className="label-barulogix">Nuevo Estado</label>
                  <select
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="0">No Entregado</option>
                    <option value="1">Entregado</option>
                    <option value="2">Devuelto</option>
                  </select>
                </div>
              )}

              {/* Type Selection */}
              {currentOperation.type === 'change_types' && (
                <div>
                  <label className="label-barulogix">Nuevo Tipo</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="Shein/Temu">Shein/Temu</option>
                    <option value="Dropi">Dropi</option>
                  </select>
                </div>
              )}

              {/* Date Selection */}
              {currentOperation.type === 'update_dates' && (
                <div>
                  <label className="label-barulogix">Nueva Fecha de Entrega</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                  />
                </div>
              )}

              {/* Operation Result */}
              {operationResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Resultado de la Operación:</h4>
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap">{operationResult}</pre>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-secondary-200">
                <button
                  onClick={closeModal}
                  className="btn-barulogix-secondary"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={executeOperation}
                  disabled={loading || (
                    (currentOperation.type === 'change_states' || 
                     currentOperation.type === 'update_dates' || 
                     currentOperation.type === 'change_types') && !selectedConductor
                  ) || (currentOperation.type === 'transfer_packages' && (!selectedConductor || !selectedConductor2))}
                  className={`${currentOperation.color} text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? 'Ejecutando...' : 'Confirmar Operación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

