'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Conductor {
  id: string
  nombre: string
  zona: string
  telefono?: string
  email?: string
  activo: boolean
  created_at: string
}

interface Stats {
  shein_temu_entregados: { count: number; value: number }
  shein_temu_pendientes: { count: number; value: number }
  dropi_entregados: { count: number; value: number }
  dropi_pendientes: { count: number; value: number }
  valor_pendiente: number
  dias_atraso_promedio: number
}

interface Delivery {
  id: string
  numero_tracking: string
  plataforma: string
  estado: string
  valor: number
  fecha_entrega_conductor_formateada: string
  fecha_entrega_cliente_formateada: string
  dias_atraso: number
  valor_formateado: string
  direccion_entrega: string
}

interface FilterState {
  type: 'all' | 'range' | 'lastDays' | 'month'
  startDate: string
  endDate: string
  lastDays: string
  month: string
  year: string
}

export default function ConductorDashboard() {
  const router = useRouter()
  const [conductorId, setConductorId] = useState('')
  const [conductor, setConductor] = useState<Conductor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  
  // Estados para estadísticas y datos
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [deliveriesLoading, setDeliveriesLoading] = useState(false)
  
  // Estados para filtros
  const [filter, setFilter] = useState<FilterState>({
    type: 'all',
    startDate: '',
    endDate: '',
    lastDays: '7',
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString()
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!conductorId.trim()) {
      setError('Por favor, ingresa tu ID de conductor')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/conductor/${conductorId}`)
      
      if (response.ok) {
        const data = await response.json()
        setConductor(data.conductor)
        setIsLoggedIn(true)
        // Cargar estadísticas iniciales
        loadStats(data.conductor.id)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'ID de conductor no encontrado')
      }
    } catch (error) {
      console.error('Error al buscar conductor:', error)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (conductorId: string, customFilter?: FilterState) => {
    setStatsLoading(true)
    try {
      const currentFilter = customFilter || filter
      const params = new URLSearchParams({
        filterType: currentFilter.type,
        ...(currentFilter.type === 'range' && { 
          startDate: currentFilter.startDate, 
          endDate: currentFilter.endDate 
        }),
        ...(currentFilter.type === 'lastDays' && { 
          lastDays: currentFilter.lastDays 
        }),
        ...(currentFilter.type === 'month' && { 
          month: currentFilter.month, 
          year: currentFilter.year 
        })
      })

      const response = await fetch(`/api/conductor/${conductorId}/stats?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        console.error('Error loading stats')
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const loadDeliveries = async (category: string) => {
    if (!conductor) return
    
    setDeliveriesLoading(true)
    setSelectedCategory(category)
    
    try {
      const params = new URLSearchParams({
        filterType: filter.type,
        ...(filter.type === 'range' && { 
          startDate: filter.startDate, 
          endDate: filter.endDate 
        }),
        ...(filter.type === 'lastDays' && { 
          lastDays: filter.lastDays 
        }),
        ...(filter.type === 'month' && { 
          month: filter.month, 
          year: filter.year 
        })
      })

      const response = await fetch(`/api/conductor/${conductor.id}/tracking/${category}?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setDeliveries(data.deliveries)
      } else {
        console.error('Error loading deliveries')
        setDeliveries([])
      }
    } catch (error) {
      console.error('Error loading deliveries:', error)
      setDeliveries([])
    } finally {
      setDeliveriesLoading(false)
    }
  }

  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter)
    if (conductor) {
      loadStats(conductor.id, newFilter)
      if (selectedCategory) {
        // Recargar datos de la categoría seleccionada con el nuevo filtro
        setTimeout(() => loadDeliveries(selectedCategory), 100)
      }
    }
  }

  const handleLogout = () => {
    setConductor(null)
    setIsLoggedIn(false)
    setConductorId('')
    setError('')
    setStats(null)
    setSelectedCategory(null)
    setDeliveries([])
  }

  const getCategoryTitle = (category: string) => {
    const titles: { [key: string]: string } = {
      'shein_temu_entregados': 'Paquetes Shein/Temu Entregados',
      'shein_temu_pendientes': 'Paquetes Shein/Temu Pendientes',
      'dropi_entregados': 'Paquetes Dropi Entregados',
      'dropi_pendientes': 'Paquetes Dropi Pendientes',
      'valor_pendiente': 'Entregas con Valor Pendiente'
    }
    return titles[category] || category
  }

  if (!isLoggedIn) {
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
                <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
                <p className="text-sm text-secondary-600 font-segoe">Dashboard de Conductor</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="max-w-md w-full">
            <div className="card-barulogix-lg text-center">
              <div className="mb-8">
                <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-secondary-900 font-montserrat mb-2">
                  Bienvenido a BaruLogix
                </h2>
                <p className="text-secondary-600 font-segoe">
                  Ingresa tu ID de conductor para acceder a tu dashboard
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="conductorId" className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    ID de Conductor
                  </label>
                  <input
                    type="text"
                    id="conductorId"
                    value={conductorId}
                    onChange={(e) => setConductorId(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Ingresa tu ID único de conductor"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm text-red-800 font-segoe">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verificando...
                    </div>
                  ) : (
                    'Acceder al Dashboard'
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-secondary-500 font-segoe">
              <p>© 2025 BaruLogix</p>
              <p className="mt-1">BaruLogix By BaruCourier S.A.S</p>
              <div className="flex items-center justify-center mt-2">
                <span>Plataforma creada por:</span>
                <div className="flex items-center ml-2">
                  <Image
                    src="/logo-scibaru.png"
                    alt="ScibaruAI"
                    width={20}
                    height={20}
                    className="mr-1"
                  />
                  <span className="font-medium">ScibaruAI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
              <p className="text-sm text-secondary-600 font-segoe">Dashboard de Conductor</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-800 font-segoe">{conductor?.nombre}</p>
              <p className="text-xs text-secondary-600 font-segoe">ID: {conductor?.id}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary btn-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-16 w-16">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary-600 font-montserrat">
                    {conductor?.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="ml-6">
                <h2 className="text-2xl font-bold text-secondary-900 font-montserrat">
                  ¡Bienvenido, {conductor?.nombre}!
                </h2>
                <p className="text-secondary-600 font-segoe">
                  Zona de trabajo: <span className="font-medium">{conductor?.zona}</span>
                </p>
                <p className="text-sm text-secondary-500 font-segoe">
                  Conductor desde: {conductor?.created_at ? new Date(conductor.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros Temporales */}
        <div className="card-barulogix-lg mb-8">
          <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
            Filtros Temporales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                Tipo de Filtro
              </label>
              <select
                value={filter.type}
                onChange={(e) => handleFilterChange({ ...filter, type: e.target.value as FilterState['type'] })}
                className="input-barulogix-modern"
              >
                <option value="all">Todos los registros</option>
                <option value="range">Rango de fechas</option>
                <option value="lastDays">Últimos X días</option>
                <option value="month">Mes específico</option>
              </select>
            </div>

            {filter.type === 'range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={filter.startDate}
                    onChange={(e) => handleFilterChange({ ...filter, startDate: e.target.value })}
                    className="input-barulogix-modern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={filter.endDate}
                    onChange={(e) => handleFilterChange({ ...filter, endDate: e.target.value })}
                    className="input-barulogix-modern"
                  />
                </div>
              </>
            )}

            {filter.type === 'lastDays' && (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                  Últimos días (1-30)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={filter.lastDays}
                  onChange={(e) => handleFilterChange({ ...filter, lastDays: e.target.value })}
                  className="input-barulogix-modern"
                />
              </div>
            )}

            {filter.type === 'month' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Mes
                  </label>
                  <select
                    value={filter.month}
                    onChange={(e) => handleFilterChange({ ...filter, month: e.target.value })}
                    className="input-barulogix-modern"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Año
                  </label>
                  <select
                    value={filter.year}
                    onChange={(e) => handleFilterChange({ ...filter, year: e.target.value })}
                    className="input-barulogix-modern"
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - i
                      return (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        {statsLoading ? (
          <div className="card-barulogix-lg mb-8 text-center py-12">
            <div className="loading-spinner w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary-600 font-segoe">Cargando estadísticas...</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Shein/Temu Entregados */}
            <button
              onClick={() => loadDeliveries('shein_temu_entregados')}
              className="card-barulogix hover-lift animate-slide-up text-left transition-all duration-200 hover:shadow-lg"
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Shein/Temu Entregados</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.shein_temu_entregados.count}</p>
                  <p className="text-sm text-green-600 font-segoe">${stats.shein_temu_entregados.value.toLocaleString()}</p>
                </div>
              </div>
            </button>

            {/* Shein/Temu Pendientes */}
            <button
              onClick={() => loadDeliveries('shein_temu_pendientes')}
              className="card-barulogix hover-lift animate-slide-up text-left transition-all duration-200 hover:shadow-lg"
              style={{animationDelay: '0.1s'}}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Shein/Temu Pendientes</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.shein_temu_pendientes.count}</p>
                  <p className="text-sm text-yellow-600 font-segoe">${stats.shein_temu_pendientes.value.toLocaleString()}</p>
                </div>
              </div>
            </button>

            {/* Dropi Entregados */}
            <button
              onClick={() => loadDeliveries('dropi_entregados')}
              className="card-barulogix hover-lift animate-slide-up text-left transition-all duration-200 hover:shadow-lg"
              style={{animationDelay: '0.2s'}}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Dropi Entregados</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.dropi_entregados.count}</p>
                  <p className="text-sm text-blue-600 font-segoe">${stats.dropi_entregados.value.toLocaleString()}</p>
                </div>
              </div>
            </button>

            {/* Dropi Pendientes */}
            <button
              onClick={() => loadDeliveries('dropi_pendientes')}
              className="card-barulogix hover-lift animate-slide-up text-left transition-all duration-200 hover:shadow-lg"
              style={{animationDelay: '0.3s'}}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-orange-100 text-orange-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Dropi Pendientes</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.dropi_pendientes.count}</p>
                  <p className="text-sm text-orange-600 font-segoe">${stats.dropi_pendientes.value.toLocaleString()}</p>
                </div>
              </div>
            </button>

            {/* Valor Pendiente */}
            <button
              onClick={() => loadDeliveries('valor_pendiente')}
              className="card-barulogix hover-lift animate-slide-up text-left transition-all duration-200 hover:shadow-lg"
              style={{animationDelay: '0.4s'}}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-red-100 text-red-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Valor Pendiente</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">${stats.valor_pendiente.toLocaleString()}</p>
                </div>
              </div>
            </button>

            {/* Días de Atraso Promedio */}
            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.5s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Días Atraso Promedio</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.dias_atraso_promedio.toFixed(1)}</p>
                  <p className="text-sm text-purple-600 font-segoe">días</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tabla de Detalles */}
        {selectedCategory && (
          <div className="card-barulogix-lg mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-secondary-900 font-montserrat">
                {getCategoryTitle(selectedCategory)}
              </h3>
              <button
                onClick={() => setSelectedCategory(null)}
                className="btn-secondary btn-sm"
              >
                Cerrar
              </button>
            </div>

            {deliveriesLoading ? (
              <div className="text-center py-12">
                <div className="loading-spinner w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-secondary-600 font-segoe">Cargando detalles...</p>
              </div>
            ) : deliveries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Número de Tracking
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Plataforma
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Fecha Entrega Conductor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Fecha Entrega Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Días de Atraso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {deliveries.map((delivery) => (
                      <tr key={delivery.id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 font-segoe">
                          {delivery.numero_tracking}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-segoe">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            delivery.plataforma === 'Shein' || delivery.plataforma === 'Temu' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {delivery.plataforma}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-segoe">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            delivery.estado === 'entregado' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {delivery.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-900 font-segoe">
                          {delivery.valor_formateado}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-segoe">
                          {delivery.fecha_entrega_conductor_formateada}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-segoe">
                          {delivery.fecha_entrega_cliente_formateada}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-segoe">
                          <span className={`${
                            delivery.dias_atraso > 0 
                              ? 'text-red-600 font-medium' 
                              : 'text-secondary-500'
                          }`}>
                            {delivery.dias_atraso > 0 ? `${delivery.dias_atraso} días` : '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-secondary-900 font-segoe">No hay datos</h3>
                <p className="mt-1 text-sm text-secondary-500 font-segoe">
                  No se encontraron entregas para esta categoría con los filtros aplicados.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Información del conductor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Información Personal
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-secondary-700 font-segoe">{conductor?.nombre}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-secondary-700 font-segoe">{conductor?.zona}</span>
              </div>
              {conductor?.telefono && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-secondary-700 font-segoe">{conductor.telefono}</span>
                </div>
              )}
              {conductor?.email && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-secondary-700 font-segoe">{conductor.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Estado del Conductor
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">Estado:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  conductor?.activo 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {conductor?.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">ID Único:</span>
                <code className="text-xs bg-secondary-100 px-2 py-1 rounded font-mono">
                  {conductor?.id}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-secondary-500 font-segoe">
            <p>© 2025 BaruLogix</p>
            <p className="mt-1">BaruLogix By BaruCourier S.A.S</p>
            <div className="flex items-center justify-center mt-2">
              <span>Plataforma creada por:</span>
              <div className="flex items-center ml-2">
                <Image
                  src="/logo-scibaru.png"
                  alt="ScibaruAI"
                  width={20}
                  height={20}
                  className="mr-1"
                />
                <span className="font-medium">ScibaruAI</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

