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

interface Package {
  id: string
  tracking: string
  conductor_id: string
  tipo: 'Shein/Temu' | 'Dropi'
  estado: 0 | 1 | 2
  fecha_entrega: string
  valor?: number
  created_at: string
  conductor: Conductor
  dias_atraso?: number
}

interface ConductorStats {
  conductor: Conductor
  total_paquetes: number
  shein_total: number
  shein_entregados: number
  shein_no_entregados: number
  shein_devueltos: number
  dropi_total: number
  dropi_entregados: number
  dropi_no_entregados: number
  dropi_devueltos: number
  dropi_valor_total: number
  dropi_valor_entregado: number
  dropi_valor_no_entregado: number
  paquetes_atrasados: Package[]
}

export default function ConductorAnalysisPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [selectedConductor, setSelectedConductor] = useState('')
  const [packages, setPackages] = useState<Package[]>([])
  const [stats, setStats] = useState<ConductorStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [dateRange, setDateRange] = useState({
    fecha_inicio: '',
    fecha_fin: ''
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadConductors()
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
      const response = await fetch('/api/conductors')
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedConductor) {
      alert('Debe seleccionar un conductor')
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (dateRange.fecha_inicio) params.append('fecha_inicio', dateRange.fecha_inicio)
      if (dateRange.fecha_fin) params.append('fecha_fin', dateRange.fecha_fin)

      const response = await fetch(`/api/packages/by-conductor/${selectedConductor}?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
        setStats(data.stats || null)
        setHasSearched(true)
      } else {
        const error = await response.json()
        alert(error.error || 'Error al obtener datos del conductor')
      }
    } catch (error) {
      console.error('Error analyzing conductor:', error)
      alert('Error al analizar conductor')
    } finally {
      setLoading(false)
    }
  }

  const clearAnalysis = () => {
    setSelectedConductor('')
    setDateRange({ fecha_inicio: '', fecha_fin: '' })
    setPackages([])
    setStats(null)
    setHasSearched(false)
  }

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0: return 'No Entregado'
      case 1: return 'Entregado'
      case 2: return 'Devuelto'
      default: return 'Desconocido'
    }
  }

  const getEstadoClass = (estado: number) => {
    switch (estado) {
      case 0: return 'bg-yellow-100 text-yellow-800'
      case 1: return 'bg-green-100 text-green-800'
      case 2: return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTipoClass = (tipo: string) => {
    return tipo === 'Shein/Temu' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
  }

  const getAtrasoClass = (dias: number) => {
    if (dias > 7) return 'bg-red-100 text-red-800'
    if (dias > 3) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={40}
                height={40}
                className="mr-3"
              />
              <h1 className="text-xl font-bold text-gray-800 font-montserrat">BaruLogix - Análisis por Conductor</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/search')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Búsqueda General
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('user')
                  localStorage.removeItem('session')
                  router.push('/auth/login')
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Formulario de Análisis */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-montserrat">Análisis Detallado por Conductor</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conductor *
              </label>
              <select
                value={selectedConductor}
                onChange={(e) => setSelectedConductor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar conductor</option>
                {conductors.filter(c => c.activo).map(conductor => (
                  <option key={conductor.id} value={conductor.id}>
                    {conductor.nombre} - {conductor.zona}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio (Opcional)
              </label>
              <input
                type="date"
                value={dateRange.fecha_inicio}
                onChange={(e) => setDateRange({ ...dateRange, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin (Opcional)
              </label>
              <input
                type="date"
                value={dateRange.fecha_fin}
                onChange={(e) => setDateRange({ ...dateRange, fecha_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleAnalyze}
              disabled={loading || !selectedConductor}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Analizando...' : 'Analizar'}
            </button>
            <button
              onClick={clearAnalysis}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Estadísticas del Conductor */}
        {stats && hasSearched && (
          <>
            {/* Información del Conductor */}
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4 font-montserrat">
                Información del Conductor
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Nombre</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.conductor.nombre}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Zona</p>
                  <p className="text-lg font-semibold text-gray-900">{stats.conductor.zona}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Paquetes</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.total_paquetes}</p>
                </div>
              </div>
            </div>

            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Shein/Temu */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-bold text-purple-600 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Paquetes Shein/Temu
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.shein_total}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Entregados</p>
                    <p className="text-2xl font-bold text-green-600">{stats.shein_entregados}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">No Entregados</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.shein_no_entregados}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Devueltos</p>
                    <p className="text-2xl font-bold text-red-600">{stats.shein_devueltos}</p>
                  </div>
                </div>
              </div>

              {/* Dropi */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-bold text-blue-600 mb-4 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Paquetes Dropi
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.dropi_total}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Entregados</p>
                    <p className="text-2xl font-bold text-green-600">{stats.dropi_entregados}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">No Entregados</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.dropi_no_entregados}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Devueltos</p>
                    <p className="text-2xl font-bold text-red-600">{stats.dropi_devueltos}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Valores Dropi */}
            {stats.dropi_total > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Valor Total Dropi</h4>
                  <p className="text-3xl font-bold text-blue-600">${stats.dropi_valor_total.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Valor Entregado</h4>
                  <p className="text-3xl font-bold text-green-600">${stats.dropi_valor_entregado.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Valor No Entregado</h4>
                  <p className="text-3xl font-bold text-red-600">${stats.dropi_valor_no_entregado.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Paquetes Atrasados */}
            {stats.paquetes_atrasados.length > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">
                    Paquetes No Entregados con Atraso ({stats.paquetes_atrasados.length})
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tracking
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha Entrega
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Días de Atraso
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stats.paquetes_atrasados.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pkg.tracking}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoClass(pkg.tipo)}`}>
                              {pkg.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(pkg.fecha_entrega).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAtrasoClass(pkg.dias_atraso || 0)}`}>
                              {pkg.dias_atraso} días
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pkg.valor ? `$${pkg.valor.toLocaleString()}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Todos los Paquetes */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">
                  Todos los Paquetes ({packages.length})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Entrega
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pkg.tracking}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoClass(pkg.tipo)}`}>
                            {pkg.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoClass(pkg.estado)}`}>
                            {getEstadoText(pkg.estado)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(pkg.fecha_entrega).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pkg.valor ? `$${pkg.valor.toLocaleString()}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Mensaje inicial */}
        {!hasSearched && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Análisis por Conductor</h3>
            <p className="text-gray-500">
              Seleccione un conductor para ver estadísticas detalladas de sus paquetes y rendimiento.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

