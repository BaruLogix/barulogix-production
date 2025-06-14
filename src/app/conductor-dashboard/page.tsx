
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
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m.toString()}>
                        {new Date(0, m - 1).toLocaleString('es-ES', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Año
                  </label>
                  <input
                    type="number"
                    min="2023"
                    max={new Date().getFullYear()}
                    value={filter.year}
                    onChange={(e) => handleFilterChange({ ...filter, year: e.target.value })}
                    className="input-barulogix-modern"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        {analysisLoading ? (
          <div className="text-center py-12">
            <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary-600 text-lg font-medium font-segoe">Cargando estadísticas...</p>
          </div>
        ) : analysis ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {/* Shein/Temu Entregados */}
            <div 
              className="card-barulogix hover-lift cursor-pointer animate-slide-up"
              onClick={() => handleCategoryClick('shein_temu_entregados')}
            >
              <div className="text-center">
                <div className="p-4 rounded-full bg-green-100 text-green-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Shein/Temu Entregados</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats.shein_entregados}</p>
                {analysis.stats.shein_entregados > 0 && (
                  <p className="text-xs text-secondary-500 mt-1">Total: {analysis.stats.shein_total}</p>
                )}
              </div>
            </div>

            {/* Shein/Temu Pendientes */}
            <div 
              className="card-barulogix hover-lift cursor-pointer animate-slide-up"
              onClick={() => handleCategoryClick('shein_temu_pendientes')}
            >
              <div className="text-center">
                <div className="p-4 rounded-full bg-yellow-100 text-yellow-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Shein/Temu Pendientes</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats.shein_no_entregados + analysis.stats.shein_devueltos}</p>
                {analysis.stats.shein_no_entregados + analysis.stats.shein_devueltos > 0 && (
                  <p className="text-xs text-secondary-500 mt-1">Total: {analysis.stats.shein_total}</p>
                )}
              </div>
            </div>

            {/* Dropi Entregados */}
            <div 
              className="card-barulogix hover-lift cursor-pointer animate-slide-up"
              onClick={() => handleCategoryClick('dropi_entregados')}
            >
              <div className="text-center">
                <div className="p-4 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Dropi Entregados</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats.dropi_entregados}</p>
                {analysis.stats.dropi_entregados > 0 && (
                  <p className="text-xs text-secondary-500 mt-1">Valor: ${analysis.stats.dropi_valor_entregado.toLocaleString('es-CO')}</p>
                )}
              </div>
            </div>

            {/* Dropi Pendientes */}
            <div 
              className="card-barulogix hover-lift cursor-pointer animate-slide-up"
              onClick={() => handleCategoryClick('dropi_pendientes')}
            >
              <div className="text-center">
                <div className="p-4 rounded-full bg-red-100 text-red-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Dropi Pendientes</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats.dropi_no_entregados + analysis.stats.dropi_devueltos}</p>
                {analysis.stats.dropi_no_entregados + analysis.stats.dropi_devueltos > 0 && (
                  <p className="text-xs text-secondary-500 mt-1">Valor: ${analysis.stats.dropi_valor_pendiente.toLocaleString('es-CO')}</p>
                )}
              </div>
            </div>

            {/* Valor Pendiente Total */}
            <div 
              className="card-barulogix hover-lift cursor-pointer animate-slide-up"
              onClick={() => handleCategoryClick('valor_pendiente')}
            >
              <div className="text-center">
                <div className="p-4 rounded-full bg-purple-100 text-purple-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Valor Pendiente</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">${analysis.stats.dropi_valor_pendiente.toLocaleString('es-CO')}</p>
                <p className="text-xs text-secondary-500 mt-1">Solo paquetes Dropi</p>
              </div>
            </div>

            {/* Días de Atraso Promedio */}
            <div className="card-barulogix hover-lift animate-slide-up">
              <div className="text-center">
                <div className="p-4 rounded-full bg-orange-100 text-orange-600 mx-auto mb-4 w-fit">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-secondary-600 font-segoe">Días Atraso Promedio</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats.paquetes_atrasados.length > 0 ? (analysis.stats.paquetes_atrasados.reduce((sum, p) => sum + p.dias_atraso, 0) / analysis.stats.paquetes_atrasados.length).toFixed(1) : '0.0'}</p>
                <p className="text-xs text-secondary-500 mt-1">Para paquetes no entregados</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-barulogix-lg text-center py-8">
            <p className="text-secondary-600 font-segoe">No hay estadísticas disponibles para el filtro seleccionado.</p>
          </div>
        )}

        {/* Tabla de Entregas */}
        {selectedCategory && filteredPackages.length > 0 && (
          <div className="card-barulogix-lg mb-8 animate-fade-in">
            <h3 className="text-xl font-bold text-secondary-900 font-montserrat mb-4">
              Detalle: {getCategoryTitle(selectedCategory)}
            </h3>
            {analysisLoading ? (
              <div className="text-center py-8">
                <div className="loading-spinner w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-secondary-600 font-segoe">Cargando detalles...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Entrega Conductor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Entrega Cliente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Atraso</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{pkg.tracking}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.tipo}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getEstadoText(pkg.estado)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.valor ? `$${pkg.valor.toLocaleString('es-CO')}` : '$0'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.fecha_entrega ? new Date(pkg.fecha_entrega).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.fecha_entrega_cliente ? new Date(pkg.fecha_entrega_cliente).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{pkg.dias_atraso}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}


