
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

interface StatsData {
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
  dropi_valor_pendiente: number
  dropi_valor_devuelto: number
  reset_automatico: boolean
  paquetes_atrasados: Array<{
    id: string
    tracking: string
    tipo: string
    estado: number
    fecha_entrega: string
    valor?: number
    dias_atraso: number
  }>
}

interface PackageData {
  id: string
  tracking: string
  tipo: 'Shein/Temu' | 'Dropi'
  estado: number
  fecha_entrega: string
  valor?: number
  dias_atraso?: number
  fecha_entrega_cliente?: string
}

interface ConductorAnalysisData {
  conductor: Conductor
  stats: StatsData
  packages: PackageData[]
  paquetes_shein: PackageData[]
  paquetes_dropi: PackageData[]
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
  const [analysis, setAnalysis] = useState<ConductorAnalysisData | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [filteredPackages, setFilteredPackages] = useState<PackageData[]>([])
  
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
        // Cargar análisis inicial
        loadAnalysis(data.conductor.id)
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

  const loadAnalysis = async (conductorId: string, customFilter?: FilterState) => {
    setAnalysisLoading(true)
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

      // Usar la API de análisis por conductor que ya devuelve todo
      const response = await fetch(`/api/packages/by-conductor/${conductorId}?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
        // Si hay una categoría seleccionada, filtrar los paquetes inmediatamente
        if (selectedCategory) {
          filterPackagesByCategory(data.packages, selectedCategory)
        }
      } else {
        console.error('Error loading analysis')
        setAnalysis(null)
      }
    } catch (error) {
      console.error('Error loading analysis:', error)
      setAnalysis(null)
    } finally {
      setAnalysisLoading(false)
    }
  }

  const filterPackagesByCategory = (packages: PackageData[], category: string) => {
    let filtered: PackageData[] = []
    switch (category) {
      case 'shein_temu_entregados':
        filtered = packages.filter(pkg => pkg.tipo === 'Shein/Temu' && pkg.estado === 1)
        break
      case 'shein_temu_pendientes':
        filtered = packages.filter(pkg => pkg.tipo === 'Shein/Temu' && pkg.estado !== 1)
        break
      case 'dropi_entregados':
        filtered = packages.filter(pkg => pkg.tipo === 'Dropi' && pkg.estado === 1)
        break
      case 'dropi_pendientes':
        filtered = packages.filter(pkg => pkg.tipo === 'Dropi' && pkg.estado !== 1)
        break
      case 'valor_pendiente':
        filtered = packages.filter(pkg => pkg.tipo === 'Dropi' && pkg.estado !== 1 && pkg.valor && pkg.valor > 0)
        break
      default:
        filtered = []
    }
    setFilteredPackages(filtered)
  }

  const handleFilterChange = (newFilter: FilterState) => {
    setFilter(newFilter)
    if (conductor) {
      loadAnalysis(conductor.id, newFilter)
    }
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category)
    if (analysis) {
      filterPackagesByCategory(analysis.packages, category)
    }
  }

  const handleLogout = () => {
    setConductor(null)
    setIsLoggedIn(false)
    setConductorId('')
    setError('')
    setAnalysis(null)
    setSelectedCategory(null)
    setFilteredPackages([])
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

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0: return 'No Entregado'
      case 1: return 'Entregado'
      case 2: return 'Devuelto'
      default: return 'Desconocido'
    }
  }

  const getDiasAtrasoColor = (dias: number) => {
    if (dias > 12) return 'text-red-600 bg-red-100'
    if (dias > 7) return 'text-orange-600 bg-orange-100'
    if (dias > 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
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

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="w-full px-4 max-w-md mx-auto">
            <div className="card-barulogix-lg">
              <div className="mb-8">
                <Image
                  src="/emblema-barulogix.png"
                  alt="Emblema BaruLogix"
                  width={64}
                  height={64}
                  className="mx-auto mb-4"
                />
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
                    placeholder="Ingresa tu ID único"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  className="btn-barulogix-primary w-full"
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Acceder'}
                </button>
              </form>
            </div>

            {/* Footer */}
            <footer className="bg-transparent mt-8">
              <div className="py-8">
                <div className="flex flex-col items-center space-y-4">
                  <div className="text-center">
                    <p className="text-secondary-700 font-segoe text-sm whitespace-nowrap">
                      © 2025 BaruLogix. Plataforma de gestión logística profesional.
                    </p>
                    <p className="text-secondary-600 font-segoe text-sm">
                      BaruLogix By BaruCourier S.A.S
                    </p>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <span className="text-secondary-600 font-segoe text-sm">
                        Programa desarrollado por: ScibaruAI
                      </span>
                      <Image
                        src="/logo-scibaru.png"
                        alt="ScibaruAI"
                        width={24}
                        height={24}
                        className="opacity-75 hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    )
  } else {
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
                <p className="text-secondary-800 font-montserrat font-semibold">{conductor?.nombre}</p>
                <p className="text-sm text-secondary-600 font-segoe">ID: {conductor?.id}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-barulogix-primary"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <div className="container mx-auto py-8 px-4">
          {/* Mensaje de Bienvenida */}
          {conductor && (
            <div className="card-barulogix-lg mb-8 animate-fade-in">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xl">
                    {conductor.nombre.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-secondary-900 font-montserrat">¡Bienvenido, {conductor.nombre}!</h3>
                  <p className="text-secondary-700 font-segoe text-sm">Zona de trabajo: {conductor.zona}</p>
                  <p className="text-secondary-600 font-segoe text-xs">Conductor desde: {new Date(conductor.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="card-barulogix-lg mb-8 animate-fade-in">
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">Filtros Temporales</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="filterType"
                    value="all"
                    checked={filter.type === 'all'}
                    onChange={() => handleFilterChange({ ...filter, type: 'all' })}
                    className="form-radio text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-secondary-700 font-segoe">Todos los datos</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="filterType"
                    value="range"
                    checked={filter.type === 'range'}
                    onChange={() => handleFilterChange({ ...filter, type: 'range' })}
                    className="form-radio text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-secondary-700 font-segoe">Rango de fechas</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="filterType"
                    value="lastDays"
                    checked={filter.type === 'lastDays'}
                    onChange={() => handleFilterChange({ ...filter, type: 'lastDays' })}
                    className="form-radio text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-secondary-700 font-segoe">Últimos días</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="filterType"
                    value="month"
                    checked={filter.type === 'month'}
                    onChange={() => handleFilterChange({ ...filter, type: 'month' })}
                    className="form-radio text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-secondary-700 font-segoe">Por mes</span>
                </label>
              </div>

              {filter.type === 'range' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                      Fecha Inicio
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      value={filter.startDate}
                      onChange={(e) => handleFilterChange({ ...filter, startDate: e.target.value })}
                      className="input-barulogix-modern"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      value={filter.endDate}
                      onChange={(e) => handleFilterChange({ ...filter, endDate: e.target.value })}
                      className="input-barulogix-modern"
                    />
                  </div>
                </div>
              )}

              {filter.type === 'lastDays' && (
                <div>
                  <label htmlFor="lastDays" className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Número de días
                  </label>
                  <input
                    type="number"
                    id="lastDays"
                    value={filter.lastDays}
                    onChange={(e) => handleFilterChange({ ...filter, lastDays: e.target.value })}
                    className="input-barulogix-modern"
                    min="1"
                    max="365"
                  />
                </div>
              )}

              {filter.type === 'month' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                      Mes
                    </label>
                    <select
                      value={filter.month}
                      onChange={(e) => handleFilterChange({ ...filter, month: e.target.value })}
                      className="input-barulogix-modern"
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
                    <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                      Año
                    </label>
                    <input
                      type="number"
                      id="year"
                      value={filter.year}
                      onChange={(e) => handleFilterChange({ ...filter, year: e.target.value })}
                      className="input-barulogix-modern"
                      min="2020"
                      max={new Date().getFullYear()}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* Shein/Temu Entregados */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-green-400"
              onClick={() => handleCategoryClick("shein_temu_entregados")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-green-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Shein/Temu Entregados</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.shein_entregados || 0}</p>
              <p className="text-green-500 font-bold text-sm">$0 COP</p>
            </button>

            {/* Shein/Temu Pendientes */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-yellow-400"
              onClick={() => handleCategoryClick("shein_temu_pendientes")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-yellow-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Shein/Temu Pendientes</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.shein_total - analysis?.stats.shein_entregados || 0}</p>
              <p className="text-red-500 font-bold text-sm">$0 COP</p>
            </button>

            {/* Dropi Entregados */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-blue-400"
              onClick={() => handleCategoryClick("dropi_entregados")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-blue-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Dropi Entregados</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.dropi_entregados || 0}</p>
              <p className="text-green-500 font-bold text-sm">{analysis?.stats.dropi_valor_entregado?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || '$0 COP'}</p>
            </button>

            {/* Dropi Pendientes */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-orange-400"
              onClick={() => handleCategoryClick("dropi_pendientes")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-orange-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Dropi Pendientes</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.dropi_total - analysis?.stats.dropi_entregados || 0}</p>
              <p className="text-red-500 font-bold text-sm">{analysis?.stats.dropi_valor_pendiente?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || '$0 COP'}</p>
            </button>

            {/* Valor Pendiente */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-pink-400"
              onClick={() => handleCategoryClick("valor_pendiente")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-pink-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Valor Pendiente</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.dropi_valor_pendiente?.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) || '$0 COP'}</p>
            </button>

            {/* Días Atraso Promedio */}
            <button
              className="card-barulogix-stat animate-fade-in hover:shadow-lg transition-all duration-200 border-l-4 border-purple-400 flex flex-col items-center justify-center"
              onClick={() => handleCategoryClick("dias_atraso_promedio")}
            >
              <div className="flex items-center mb-3">
                <div className="bg-purple-100 p-2 rounded-full mr-3">
                  <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Días Atraso Promedio</h4>
              </div>
              <p className="text-3xl font-bold text-secondary-900 font-montserrat mb-1">{analysis?.stats.paquetes_atrasados.length ? (analysis.stats.paquetes_atrasados.reduce((sum, pkg) => sum + pkg.dias_atraso, 0) / analysis.stats.paquetes_atrasados.length).toFixed(1) : '0.0'}</p>
              <p className="text-purple-500 font-bold text-sm">días</p>
            </button>
          </div>

          {/* Tablas de Paquetes */}
          {selectedCategory && filteredPackages.length > 0 && (
            <div className="card-barulogix-lg mb-8 animate-fade-in">
              <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
                {getCategoryTitle(selectedCategory)}
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="ml-4 px-3 py-1 bg-secondary-200 text-secondary-800 rounded-full text-sm hover:bg-secondary-300 transition-colors"
                >
                  Cerrar
                </button>
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tracking</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tipo</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha Entrega</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha Entrega Cliente</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Valor</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Días Atraso</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{pkg.tracking}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">{pkg.tipo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoText(pkg.estado) === 'Entregado' ? 'bg-green-100 text-green-800' : getEstadoText(pkg.estado) === 'No Entregado' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {getEstadoText(pkg.estado)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">{pkg.fecha_entrega}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">{pkg.fecha_entrega_cliente || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">{pkg.valor ? pkg.valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDiasAtrasoColor(pkg.dias_atraso || 0)}`}>
                            {pkg.dias_atraso || 0}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Información Personal y Estado del Conductor */}
          {conductor && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              {/* Información Personal */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-6">Información Personal</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-secondary-700 font-segoe">{conductor.nombre}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-secondary-700 font-segoe">{conductor.zona}</span>
                  </div>
                  {conductor.telefono && (
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <span className="text-secondary-700 font-segoe">{conductor.telefono}</span>
                    </div>
                  )}
                  {conductor.email && (
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-secondary-700 font-segoe">{conductor.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estado del Conductor */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-6">Estado del Conductor</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-700 font-segoe">Estado:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${conductor.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {conductor.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-700 font-segoe">ID Único:</span>
                    <span className="text-secondary-600 font-mono text-sm">{conductor.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    )
  }
}

