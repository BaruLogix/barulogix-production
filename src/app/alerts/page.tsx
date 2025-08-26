'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DelayedPackage {
  id: string
  tracking: string
  tipo: string
  fecha_entrega: string
  valor: number | null
  dias_atraso: number
  conductor: {
    id: string
    nombre: string
    zona: string
  }
}

interface ConductorStats {
  conductor: {
    id: string
    nombre: string
    zona: string
  }
  total_atrasados: number
  valor_total_cod: number
  paquetes: DelayedPackage[]
}

interface DelayedPackagesResponse {
  total_delayed: number
  fecha_limite: string
  packages: DelayedPackage[]
  conductor_stats: ConductorStats[]
  generated_at: string
}

export default function AlertsPage() {
  const [loading, setLoading] = useState(false)
  const [delayedData, setDelayedData] = useState<DelayedPackagesResponse | null>(null)
  const [sendingAlert, setSendingAlert] = useState<string | null>(null)
  const [sendingBulk, setSendingBulk] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [selectedConductors, setSelectedConductors] = useState<string[]>([])
  const [sendToAll, setSendToAll] = useState(false)
  const [sendingCustom, setSendingCustom] = useState(false)
  const [conductors, setConductors] = useState<any[]>([])
  const router = useRouter()

  // Obtener paquetes atrasados
  const fetchDelayedPackages = async () => {
    setLoading(true)
    try {
      const userId = localStorage.getItem('user_id') || (localStorage.getItem('session') ? JSON.parse(localStorage.getItem('session') || '{}').user.id : null)
      if (!userId) {
        router.push('/')
        return
      }

      const response = await fetch('/api/notifications/delayed-packages', {
        headers: {
          'x-user-id': userId
        }
      })

      if (!response.ok) {
        throw new Error('Error al obtener paquetes atrasados')
      }

      const data = await response.json()
      setDelayedData(data)
      console.log('Paquetes atrasados obtenidos:', data)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al obtener paquetes atrasados')
    } finally {
      setLoading(false)
    }
  }

  // Obtener conductores para mensajes personalizados
  const fetchConductors = async () => {
    try {
      const userId = localStorage.getItem('user_id') || (localStorage.getItem('session') ? JSON.parse(localStorage.getItem('session') || '{}').user.id : null)
      if (!userId) return

      const response = await fetch('/api/conductors', {
        headers: {
          'x-user-id': userId
        }
      })

      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
        console.log('Conductores obtenidos:', data.conductors)
      } else {
        console.error('Error al obtener conductores:', response.status)
      }
    } catch (error) {
      console.error('Error obteniendo conductores:', error)
    }
  }

  // Enviar alerta individual
  const sendIndividualAlert = async (packageData: DelayedPackage) => {
    setSendingAlert(packageData.id)
    try {
      const userId = localStorage.getItem('user_id') || (localStorage.getItem('session') ? JSON.parse(localStorage.getItem('session') || '{}').user.id : null)
      if (!userId) return

      const response = await fetch('/api/notifications/send-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          package_id: packageData.id,
          conductor_id: packageData.conductor.id,
          dias_atraso: packageData.dias_atraso
        })
      })

      if (!response.ok) {
        throw new Error('Error al enviar alerta')
      }

      const result = await response.json()
      alert(`✅ Alerta enviada a ${result.conductor_nombre} por el paquete ${result.package_tracking}`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar la alerta')
    } finally {
      setSendingAlert(null)
    }
  }

  // Enviar alertas masivas
  const sendBulkAlerts = async () => {
    if (!delayedData || delayedData.packages.length === 0) return

    setSendingBulk(true)
    try {
      const userId = localStorage.getItem('user_id') || (localStorage.getItem('session') ? JSON.parse(localStorage.getItem('session') || '{}').user.id : null)
      if (!userId) return

      const packageIds = delayedData.packages.map(pkg => pkg.id)

      const response = await fetch('/api/notifications/send-bulk-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          package_ids: packageIds
        })
      })

      if (!response.ok) {
        throw new Error('Error al enviar alertas masivas')
      }

      const result = await response.json()
      alert(`✅ Alertas enviadas: ${result.total_notifications} notificaciones a ${result.total_conductors} conductores`)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar las alertas masivas')
    } finally {
      setSendingBulk(false)
    }
  }

  // Enviar mensaje personalizado
  const sendCustomMessage = async () => {
    if (!customMessage.trim()) {
      alert('Por favor, escribe un mensaje')
      return
    }

    if (!sendToAll && selectedConductors.length === 0) {
      alert('Por favor, selecciona al menos un conductor o marca "Enviar a todos"')
      return
    }

    setSendingCustom(true)
    try {
      const userId = localStorage.getItem('user_id') || (localStorage.getItem('session') ? JSON.parse(localStorage.getItem('session') || '{}').user.id : null)
      if (!userId) return

      const response = await fetch('/api/notifications/send-custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          mensaje: customMessage.trim(),
          conductor_ids: sendToAll ? [] : selectedConductors,
          send_to_all: sendToAll
        })
      })

      if (!response.ok) {
        throw new Error('Error al enviar mensaje personalizado')
      }

      const result = await response.json()
      alert(`✅ Mensaje enviado a ${result.total_conductors} conductores`)
      
      // Limpiar formulario
      setCustomMessage('')
      setSelectedConductors([])
      setSendToAll(false)
      setShowCustomModal(false)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al enviar el mensaje personalizado')
    } finally {
      setSendingCustom(false)
    }
  }

  useEffect(() => {
    fetchConductors()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 font-montserrat">Generar Alertas</h1>
                  <p className="text-sm text-gray-600 font-segoe">Gestiona notificaciones para conductores</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboard"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Buttons */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 font-montserrat">Acciones Disponibles</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={fetchDelayedPackages}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generar Informe y Enviar Notificaciones
                  </>
                )}
              </button>

              <button
                onClick={() => setShowCustomModal(true)}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Enviar Mensaje Personalizado
              </button>
            </div>
          </div>
        </div>

        {/* Delayed Packages Results */}
        {delayedData && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 font-montserrat">
                  Resumen de Paquetes Atrasados
                </h2>
                <span className="text-sm text-gray-500">
                  Generado: {new Date(delayedData.generated_at).toLocaleString('es-CO')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Total Atrasados</p>
                      <p className="text-2xl font-bold text-red-900">{delayedData.total_delayed}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-orange-600">Conductores Afectados</p>
                      <p className="text-2xl font-bold text-orange-900">{delayedData.conductor_stats.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-600">Valor COD Atrasado</p>
                      <p className="text-2xl font-bold text-blue-900">
                        ${delayedData.conductor_stats.reduce((sum, stat) => sum + stat.valor_total_cod, 0).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {delayedData.packages.length > 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={sendBulkAlerts}
                    disabled={sendingBulk}
                    className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingBulk ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h5v12z" />
                        </svg>
                        Notificar a Todos ({delayedData.total_delayed})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Detailed List */}
            {delayedData.packages.length > 0 ? (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 font-montserrat">
                    Paquetes Atrasados - Detalle
                  </h3>
                  <p className="text-sm text-gray-600">
                    Paquetes con más de 3 días de atraso desde su fecha de entrega programada
                  </p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tracking
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conductor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Entrega
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Días Atraso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {delayedData.packages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 font-mono">
                              {pkg.tracking}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{pkg.conductor.nombre}</div>
                            <div className="text-sm text-gray-500">{pkg.conductor.zona}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' ? 'COD' : 'Pagos'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              pkg.dias_atraso >= 7 
                                ? 'bg-red-100 text-red-800' 
                                : pkg.dias_atraso >= 5 
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {pkg.dias_atraso} días
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pkg.valor ? `$${pkg.valor.toLocaleString('es-CO')}` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => sendIndividualAlert(pkg)}
                              disabled={sendingAlert === pkg.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingAlert === pkg.id ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h5v12z" />
                                  </svg>
                                  Notificar a Conductor
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">¡Excelente!</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No hay paquetes con más de 3 días de atraso en este momento.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Custom Message Modal */}
        {showCustomModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 font-montserrat">
                    Enviar Mensaje Personalizado
                  </h3>
                  <button
                    onClick={() => setShowCustomModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Message Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mensaje
                    </label>
                    <textarea
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Escribe tu mensaje aquí..."
                    />
                  </div>

                  {/* Send to All Toggle */}
                  <div className="flex items-center">
                    <input
                      id="send-to-all"
                      type="checkbox"
                      checked={sendToAll}
                      onChange={(e) => setSendToAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="send-to-all" className="ml-2 block text-sm text-gray-900">
                      Enviar a todos los conductores
                    </label>
                  </div>

                  {/* Conductor Selection */}
                  {!sendToAll && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleccionar Conductores
                      </label>
                      <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                        {conductors.map((conductor) => (
                          <div key={conductor.id} className="flex items-center py-1">
                            <input
                              id={`conductor-${conductor.id}`}
                              type="checkbox"
                              checked={selectedConductors.includes(conductor.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedConductors([...selectedConductors, conductor.id])
                                } else {
                                  setSelectedConductors(selectedConductors.filter(id => id !== conductor.id))
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`conductor-${conductor.id}`} className="ml-2 block text-sm text-gray-900">
                              {conductor.nombre} - {conductor.zona}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setShowCustomModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={sendCustomMessage}
                      disabled={sendingCustom}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingCustom ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </>
                      ) : (
                        'Enviar Mensaje'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

