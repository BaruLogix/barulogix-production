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

interface SearchStats {
  total: number
  no_entregados: number
  entregados: number
  devueltos: number
  shein_temu: number
  dropi: number
  valor_total_dropi: number
  valor_no_entregado_dropi: number
}

export default function SearchPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const router = useRouter()

  // Criterios de búsqueda
  const [searchCriteria, setSearchCriteria] = useState({
    tracking: '',
    conductor_id: '',
    tipo: '',
    estado: '',
    fecha_inicio: '',
    fecha_fin: '',
    zona: ''
  })

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

  const handleSearch = async () => {
    // Verificar que al menos un criterio esté lleno
    const hasAnyCriteria = Object.values(searchCriteria).some(value => value.trim() !== '')
    
    if (!hasAnyCriteria) {
      alert('Debe proporcionar al menos un criterio de búsqueda')
      return
    }

    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      Object.entries(searchCriteria).forEach(([key, value]) => {
        if (value.trim() !== '') {
          params.append(key, value)
        }
      })

      const response = await fetch(`/api/packages/search?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
        setStats(data.stats || null)
        setHasSearched(true)
      } else {
        const error = await response.json()
        alert(error.error || 'Error al realizar la búsqueda')
      }
    } catch (error) {
      console.error('Error searching packages:', error)
      alert('Error al realizar la búsqueda')
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchCriteria({
      tracking: '',
      conductor_id: '',
      tipo: '',
      estado: '',
      fecha_inicio: '',
      fecha_fin: '',
      zona: ''
    })
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
              <h1 className="text-xl font-bold text-gray-800 font-montserrat">BaruLogix - Búsqueda de Paquetes</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/packages')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Gestión de Paquetes
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
        {/* Formulario de Búsqueda */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 font-montserrat">Búsqueda Avanzada de Paquetes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking
              </label>
              <input
                type="text"
                value={searchCriteria.tracking}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, tracking: e.target.value })}
                placeholder="Buscar por tracking..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conductor
              </label>
              <select
                value={searchCriteria.conductor_id}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, conductor_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los conductores</option>
                {conductors.map(conductor => (
                  <option key={conductor.id} value={conductor.id}>
                    {conductor.nombre} - {conductor.zona}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Zona
              </label>
              <input
                type="text"
                value={searchCriteria.zona}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, zona: e.target.value })}
                placeholder="Buscar por zona..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={searchCriteria.tipo}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="Shein/Temu">Shein/Temu</option>
                <option value="Dropi">Dropi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={searchCriteria.estado}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, estado: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los estados</option>
                <option value="0">No Entregado</option>
                <option value="1">Entregado</option>
                <option value="2">Devuelto</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={searchCriteria.fecha_inicio}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, fecha_inicio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={searchCriteria.fecha_fin}
                onChange={(e) => setSearchCriteria({ ...searchCriteria, fecha_fin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              onClick={clearSearch}
              className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Estadísticas de Búsqueda */}
        {stats && hasSearched && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Encontrados</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Entregados</h3>
              <p className="text-3xl font-bold text-yellow-600">{stats.no_entregados}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Entregados</h3>
              <p className="text-3xl font-bold text-green-600">{stats.entregados}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Devueltos</h3>
              <p className="text-3xl font-bold text-red-600">{stats.devueltos}</p>
            </div>
          </div>
        )}

        {/* Estadísticas Adicionales */}
        {stats && hasSearched && stats.dropi > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shein/Temu</h3>
              <p className="text-3xl font-bold text-purple-600">{stats.shein_temu}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dropi</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.dropi}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Valor Total Dropi</h3>
              <p className="text-2xl font-bold text-green-600">${stats.valor_total_dropi.toLocaleString()}</p>
              <p className="text-sm text-gray-500">No entregado: ${stats.valor_no_entregado_dropi.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Resultados */}
        {hasSearched && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Resultados de Búsqueda ({packages.length} paquetes encontrados)
              </h3>
            </div>
            
            {packages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conductor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Zona
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días Atraso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((pkg) => {
                      const diasAtraso = pkg.estado === 0 ? 
                        Math.floor((new Date().getTime() - new Date(pkg.fecha_entrega).getTime()) / (1000 * 60 * 60 * 24)) : 0
                      
                      return (
                        <tr key={pkg.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {pkg.tracking}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pkg.conductor.nombre}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pkg.conductor.zona}
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {pkg.estado === 0 && diasAtraso > 0 ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                diasAtraso > 7 ? 'bg-red-100 text-red-800' : 
                                diasAtraso > 3 ? 'bg-yellow-100 text-yellow-800' : 
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {diasAtraso} días
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No se encontraron paquetes con los criterios especificados</p>
              </div>
            )}
          </div>
        )}

        {/* Mensaje inicial */}
        {!hasSearched && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Búsqueda Avanzada de Paquetes</h3>
            <p className="text-gray-500">
              Complete al menos un criterio de búsqueda y haga clic en "Buscar" para encontrar paquetes específicos.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

