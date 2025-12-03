
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HistoryItem {
  id: string
  operation_type: string
  description: string
  details: any
  affected_records: number
  can_undo: boolean
  created_at: string
  undone_at?: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [undoLoading, setUndoLoading] = useState(false)
  const [undoResult, setUndoResult] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadHistory()
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadHistory = async () => {
    try {
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/history', {
        headers: {
          'x-user-id': userId
        }
      })

      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      } else {
        console.error('Error loading history')
      }
    } catch (error) {
      console.error('Error loading history:', error)
    } finally {
      setLoading(false)
    }
  }

  const undoLastOperation = async () => {
    if (!confirm('¿Está seguro de que desea deshacer la última operación? Esta acción no se puede revertir.')) {
      return
    }

    setUndoLoading(true)
    setUndoResult('')

    try {
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/admin/undo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        }
      })

      const result = await response.json()

      if (response.ok) {
        setUndoResult(`✅ ${result.message}\n\nDetalles: ${result.details}`)
        await loadHistory() // Recargar historial
      } else {
        setUndoResult(`❌ Error: ${result.error}\n\nDetalles: ${result.details || 'N/A'}`)
      }
    } catch (error) {
      console.error('Error undoing operation:', error)
      setUndoResult(`❌ Error de conexión: ${error}`)
    } finally {
      setUndoLoading(false)
    }
  }

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'transfer_packages': return '📦'
      case 'change_states': return '🔄'
      case 'update_dates': return '📅'
      case 'change_types': return '🏷️'
      case 'toggle_conductors': return '👤'
      case 'create_package': return '➕'
      case 'create_bulk_packages': return '➕➕'
      case 'delete_package': return '❌'
      case 'undo_transfer_packages': return '↩️'
      case 'undo_change_states': return '↩️'
      case 'undo_update_dates': return '↩️'
      case 'undo_change_types': return '↩️'
      case 'undo_create_package': return '↩️'
      case 'undo_create_bulk_packages': return '↩️'
      case 'undo_delete_package': return '↩️'
      default: return '⚙️'
    }
  }

  const getOperationColor = (operationType: string) => {
    if (operationType.startsWith('undo_')) {
      return 'bg-orange-100 border-orange-300 text-orange-800'
    }
    
    switch (operationType) {
      case 'transfer_packages': return 'bg-green-100 border-green-300 text-green-800'
      case 'change_states': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'update_dates': return 'bg-purple-100 border-purple-300 text-purple-800'
      case 'change_types': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'toggle_conductors': return 'bg-gray-100 border-gray-300 text-gray-800'
      case 'create_package': return 'bg-cyan-100 border-cyan-300 text-cyan-800'
      case 'create_bulk_packages': return 'bg-teal-100 border-teal-300 text-teal-800'
      case 'delete_package': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const lastUndoableOperation = history.find(item => item.can_undo && !item.operation_type.startsWith('undo_'))

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="header-barulogix">
        <div className="header-content">
          <div className="flex items-center">
            <Image
              src="/logo-oficial-transparente.png"
              alt="BaruLogix"
              width={50}
              height={50}
              className="mr-4"
            />
            <div>
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Historial</h1>
              <p className="text-sm text-secondary-600 font-segoe">Registro completo de operaciones administrativas</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="btn-danger btn-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resultado de deshacer */}
        {undoResult && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-secondary-200 animate-fade-in">
            <h3 className="font-semibold text-secondary-900 mb-2">Resultado de Deshacer Operación:</h3>
            <pre className="text-sm text-secondary-700 whitespace-pre-wrap font-segoe">{undoResult}</pre>
          </div>
        )}

        {/* Información de última operación */}
        {lastUndoableOperation && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg animate-fade-in">
            <h3 className="font-semibold text-orange-900 mb-3 font-montserrat">🔄 Última Operación Disponible para Deshacer:</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getOperationIcon(lastUndoableOperation.operation_type)}</span>
                <div>
                  <p className="font-medium text-orange-800 font-montserrat">{lastUndoableOperation.description}</p>
                  <p className="text-sm text-orange-600 font-segoe">
                    {formatDate(lastUndoableOperation.created_at)} • {lastUndoableOperation.affected_records} registros afectados
                  </p>
                </div>
              </div>
              <button
                onClick={undoLastOperation}
                disabled={undoLoading}
                className="btn-warning disabled:opacity-50 whitespace-nowrap"
              >
                {undoLoading ? 'Deshaciendo...' : 'Deshacer Operación'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de historial */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 animate-fade-in">
          <div className="px-6 py-4 border-b border-secondary-200">
            <h2 className="text-lg font-semibold text-secondary-900 font-montserrat">Historial Completo</h2>
            <p className="text-sm text-secondary-600 font-segoe">Últimas 50 operaciones realizadas</p>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-secondary-600 font-segoe">Cargando historial...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary-600 font-segoe">No hay operaciones registradas</p>
            </div>
          ) : (
            <div className="divide-y divide-secondary-200">
              {history.map((item) => (
                <div key={item.id} className="p-6 hover:bg-secondary-50 transition-colors duration-200">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg border ${getOperationColor(item.operation_type)}`}>
                      <span className="text-xl">{getOperationIcon(item.operation_type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-secondary-900 truncate font-montserrat">
                          {item.description}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {item.can_undo && !item.operation_type.startsWith('undo_') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 font-segoe">
                              Puede deshacerse
                            </span>
                          )}
                          {item.undone_at && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 font-segoe">
                              Deshecha
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-secondary-500 font-segoe">
                        <span>{formatDate(item.created_at)}</span>
                        <span>•</span>
                        <span>{item.affected_records} registros afectados</span>
                      </div>
                      {item.details && Object.keys(item.details).length > 0 && (
                        <div className="mt-2 p-2 bg-secondary-50 rounded text-xs">
                          <details>
                            <summary className="cursor-pointer text-secondary-700 hover:text-secondary-900 font-segoe">
                              Ver detalles técnicos
                            </summary>
                            <pre className="mt-2 text-secondary-600 whitespace-pre-wrap font-mono text-xs">
                              {JSON.stringify(item.details, null, 2)}
                            </pre>
                          </details>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="footer-barulogix mt-12 w-full">
        <div className="footer-content">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-white font-montserrat">BaruLogix</h3>
              <p className="text-xs text-gray-400 font-segoe">By BaruCourier S.A.S</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 font-segoe">Panel de Control</p>
        </div>
        <div className="footer-divider"></div>
        <div className="footer-content">
          <p className="text-xs text-gray-400 font-segoe">© 2025 BaruLogix. Todos los derechos reservados.</p>
          <p className="text-xs text-gray-400 font-segoe">Programa desarrollado por: <span className="text-primary-300">SibaruAI</span></p>
        </div>
      </footer>
    </div>
  )
}
