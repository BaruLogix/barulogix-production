'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface SearchResult {
  id: string
  tracking: string
  conductor: {
    id: string
    nombre: string
    zona: string
  }
  tipo: 'Paquetes Pagos' | 'Paquetes Pago Contra Entrega (COD)'
  estado: number
  fecha_entrega: string
  valor?: number
  created_at: string
}

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

interface SearchStats {
  total_results: number
  entregados: number
  no_entregados: number
  devueltos: number
  valor_total_dropi: number
}

export default function SearchPage() {
  const [results, setResults] = useState<SearchResult[]>([])
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<SearchStats>({
    total_results: 0,
    entregados: 0,
    no_entregados: 0,
    devueltos: 0,
    valor_total_dropi: 0
  })
  const [searchParams, setSearchParams] = useState({
    tracking: '',
    conductor_id: '',
    zona: '',
    tipo: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: ''
  })
  
  // Estados para filtros temporales
  const [filterType, setFilterType] = useState('all')
  const [lastDays, setLastDays] = useState('7')
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [year, setYear] = useState(new Date().getFullYear().toString())
  
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
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar conductores')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      const response = await fetch('/api/conductors', { headers })
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setLoading(false)
        return
      }

      const queryParams = new URLSearchParams()
      
      // Parámetros de búsqueda existentes
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      // Añadir filtros temporales
      queryParams.append('filterType', filterType)
      
      if (filterType === 'lastDays') {
        queryParams.append('lastDays', lastDays)
      } else if (filterType === 'month') {
        queryParams.append('month', month)
        queryParams.append('year', year)
      }
      // Para 'range' ya se usan fecha_desde y fecha_hasta del searchParams

      console.log('Búsqueda con filtros temporales:', queryParams.toString())

      const headers = {
        'x-user-id': userId
      }

      const response = await fetch(`/api/packages/search?${queryParams}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setResults(data.packages || [])
        setStats(data.stats || {})
      } else {
        console.error('Error searching packages')
        setResults([])
        setStats({
          total_results: 0,
          entregados: 0,
          no_entregados: 0,
          devueltos: 0,
          valor_total_dropi: 0
        })
      }
    } catch (error) {
      console.error('Error searching packages:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchParams({
      tracking: '',
      conductor_id: '',
      zona: '',
      tipo: '',
      estado: '',
      fecha_desde: '',
      fecha_hasta: ''
    })
    setFilterType('all')
    setLastDays('7')
    setMonth((new Date().getMonth() + 1).toString())
    setYear(new Date().getFullYear().toString())
    setResults([])
    setStats({
      total_results: 0,
      entregados: 0,
      no_entregados: 0,
      devueltos: 0,
      valor_total_dropi: 0
    })
  }

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0: return 'No Entregado'
      case 1: return 'Entregado'
      case 2: return 'Devuelto'
      default: return 'Desconocido'
    }
  }

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return 'badge-warning'
      case 1: return 'badge-success'
      case 2: return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  const zones = [...new Set(conductors.map(c => c.zona))].sort()

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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Búsqueda Avanzada</h1>
              <p className="text-sm text-secondary-600 font-segoe">Encuentra paquetes con filtros avanzados</p>
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
        {/* Formulario de Búsqueda */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            <svg className="w-8 h-8 inline-block mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Filtros de Búsqueda
          </h2>

          <form onSubmit={handleSearch} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="label-barulogix">Número de Tracking</label>
                <input
                  type="text"
                  value={searchParams.tracking}
                  onChange={(e) => setSearchParams({ ...searchParams, tracking: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                  placeholder="Buscar por tracking..."
                />
              </div>

              <div>
                <label className="label-barulogix">Conductor</label>
                <select
                  value={searchParams.conductor_id}
                  onChange={(e) => setSearchParams({ ...searchParams, conductor_id: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todos los conductores</option>
                  {conductors.filter(c => c.activo).map(conductor => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-barulogix">Zona</label>
                <select
                  value={searchParams.zona}
                  onChange={(e) => setSearchParams({ ...searchParams, zona: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todas las zonas</option>
                  {zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label-barulogix">Tipo de Paquete</label>
                <select
                  value={searchParams.tipo}
                  onChange={(e) => setSearchParams({ ...searchParams, tipo: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todos los tipos</option>
                  <option value="Paquetes Pagos">Paquetes Pagos</option>
                  <option value="Paquetes Pago Contra Entrega (COD)">Paquetes Pago Contra Entrega (COD)</option>
                </select>
              </div>

              <div>
                <label className="label-barulogix">Estado</label>
                <select
                  value={searchParams.estado}
                  onChange={(e) => setSearchParams({ ...searchParams, estado: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todos los estados</option>
                  <option value="0">No Entregado</option>
                  <option value="1">Entregado</option>
                  <option value="2">Devuelto</option>
                </select>
              </div>
            </div>

            {/* Filtros Temporales */}
            <div className="border-t border-secondary-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4 font-montserrat">
                <svg className="w-5 h-5 inline-block mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Filtros Temporales
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label-barulogix">Período de Tiempo</label>
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      // Limpiar fechas manuales cuando se cambia el tipo de filtro
                      if (e.target.value !== 'range') {
                        setSearchParams({ ...searchParams, fecha_desde: '', fecha_hasta: '' })
                      }
                    }}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="all">Todos los paquetes</option>
                    <option value="lastDays">Últimos días</option>
                    <option value="range">Rango de fechas</option>
                    <option value="month">Mes específico</option>
                  </select>
                </div>

                {filterType === 'lastDays' && (
                  <div>
                    <label className="label-barulogix">Últimos Días</label>
                    <select
                      value={lastDays}
                      onChange={(e) => setLastDays(e.target.value)}
                      className="input-barulogix-modern focus-ring"
                    >
                      <option value="7">Últimos 7 días</option>
                      <option value="15">Últimos 15 días</option>
                      <option value="30">Últimos 30 días</option>
                    </select>
                  </div>
                )}

                {filterType === 'range' && (
                  <>
                    <div>
                      <label className="label-barulogix">Fecha Desde</label>
                      <input
                        type="date"
                        value={searchParams.fecha_desde}
                        onChange={(e) => setSearchParams({ ...searchParams, fecha_desde: e.target.value })}
                        className="input-barulogix-modern focus-ring"
                      />
                    </div>
                    <div>
                      <label className="label-barulogix">Fecha Hasta</label>
                      <input
                        type="date"
                        value={searchParams.fecha_hasta}
                        onChange={(e) => setSearchParams({ ...searchParams, fecha_hasta: e.target.value })}
                        className="input-barulogix-modern focus-ring"
                      />
                    </div>
                  </>
                )}

                {filterType === 'month' && (
                  <>
                    <div>
                      <label className="label-barulogix">Mes</label>
                      <select
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="input-barulogix-modern focus-ring"
                      >
                        <option value="1">Enero</option>
                        <option value="2">Febrero</option>
                        <option value="3">Marzo</option>
                        <option value="4">Abril</option>
                        <option value="5">Mayo</option>
                        <option value="6">Junio</option>
                        <option value="7">Julio</option>
                        <option value="8">Agosto</option>
                        <option value="9">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                      </select>
                    </div>
                    <div>
                      <label className="label-barulogix">Año</label>
                      <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="input-barulogix-modern focus-ring"
                      >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary hover-glow disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Buscando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar Paquetes
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={clearSearch}
                className="btn-secondary"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Limpiar Filtros
              </button>
            </div>
          </form>
        </div>

        {/* Estadísticas de Resultados */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <div className="card-barulogix hover-lift animate-slide-up">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-secondary-600 font-segoe">Resultados</p>
                  <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.total_results}</p>
                </div>
              </div>
            </div>

            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-secondary-600 font-segoe">Entregados</p>
                  <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.entregados}</p>
                </div>
              </div>
            </div>

            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-secondary-600 font-segoe">Pendientes</p>
                  <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.no_entregados}</p>
                </div>
              </div>
            </div>

            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-secondary-600 font-segoe">Devueltos</p>
                  <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.devueltos}</p>
                </div>
              </div>
            </div>

            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.4s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-xs font-medium text-secondary-600 font-segoe">Valor COD</p>
                  <p className="text-lg font-bold text-secondary-900 font-montserrat">
                    ${stats.valor_no_entregado_cod?.toLocaleString('es-CO') || '0'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados */}
        <div className="card-barulogix-lg animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            Resultados de Búsqueda
            {results.length > 0 && (
              <span className="text-lg font-normal text-secondary-600 ml-2">
                ({results.length} paquetes encontrados)
              </span>
            )}
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-secondary-600 text-lg font-segoe">
                {loading ? 'Buscando paquetes...' : 'Usa los filtros para buscar paquetes'}
              </p>
              <p className="text-secondary-500 text-sm font-segoe mt-1">
                {loading ? 'Por favor espera...' : 'Los resultados aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-barulogix">
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Conductor</th>
                    <th>Zona</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Fecha Entrega</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={result.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                      <td>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            result.tipo === 'Paquetes Pago Contra Entrega (COD)' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}></div>
                          <span className="font-medium text-secondary-900 font-mono text-sm">{result.tracking}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-medium text-secondary-900 font-segoe">{result.conductor.nombre}</span>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {result.conductor.zona}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          result.tipo === 'Paquetes Pago Contra Entrega (COD)' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {result.tipo}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(result.estado)}`}>
                          {getEstadoText(result.estado)}
                        </span>
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {new Date(result.fecha_entrega).toLocaleDateString('es-CO')}
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {result.valor ? `$${result.valor.toLocaleString('es-CO')}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

