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
                    id="startDate"
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
                    id="endDate"
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
                  Últimos X días
                </label>
                <input
                  type="number"
                  id="lastDays"
                  value={filter.lastDays}
                  onChange={(e) => handleFilterChange({ ...filter, lastDays: e.target.value })}
                  className="input-barulogix-modern"
                  min="1"
                  max="30"
                />
              </div>
            )}

            {filter.type === 'month' && (
              <div className="grid grid-cols-2 gap-4">
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

        {/* Información Personal y Estado del Conductor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="card-barulogix-lg animate-fade-in">
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Información Personal
            </h3>
            <div className="space-y-2 text-secondary-700 font-segoe">
              <p><span className="font-medium">Nombre:</span> {conductor?.nombre}</p>
              <p><span className="font-medium">Zona:</span> {conductor?.zona}</p>
              <p><span className="font-medium">Teléfono:</span> {conductor?.telefono || 'N/A'}</p>
              <p><span className="font-medium">Email:</span> {conductor?.email || 'N/A'}</p>
            </div>
          </div>
          <div className="card-barulogix-lg animate-fade-in">
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Estado del Conductor
            </h3>
            <div className="space-y-2 text-secondary-700 font-segoe">
              <p><span className="font-medium">Estado:</span> <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${conductor?.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{conductor?.activo ? 'Activo' : 'Inactivo'}</span></p>
              <p><span className="font-medium">ID Único:</span> {conductor?.id}</p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Shein/Temu Entregados */}
          <button
            className="card-barulogix-stat animate-fade-in"
            onClick={() => handleCategoryClick('shein_temu_entregados')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Shein/Temu Entregados</h4>
              <div className="bg-green-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis?.stats.shein_entregados || 0}</p>
            <p className="text-secondary-600 font-segoe">$0</p>
          </button>

          {/* Shein/Temu Pendientes */}
          <button
            className="card-barulogix-stat animate-fade-in"
            onClick={() => handleCategoryClick('shein_temu_pendientes')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Shein/Temu Pendientes</h4>
              <div className="bg-yellow-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis?.stats.shein_no_entregados || 0}</p>
            <p className="text-secondary-600 font-segoe">$0</p>
          </button>

          {/* Dropi Entregados */}
          <button
            className="card-barulogix-stat animate-fade-in"
            onClick={() => handleCategoryClick('dropi_entregados')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Dropi Entregados</h4>
              <div className="bg-blue-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis?.stats.dropi_entregados || 0}</p>
            <p className="text-secondary-600 font-segoe">$0</p>
          </button>

          {/* Dropi Pendientes */}
          <button
            className="card-barulogix-stat animate-fade-in"
            onClick={() => handleCategoryClick('dropi_pendientes')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Dropi Pendientes</h4>
              <div className="bg-orange-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis?.stats.dropi_no_entregados || 0}</p>
            <p className="text-secondary-600 font-segoe">$0</p>
          </button>

          {/* Valor Pendiente */}
          <button
            className="card-barulogix-stat animate-fade-in"
            onClick={() => handleCategoryClick('valor_pendiente')}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Valor Pendiente</h4>
              <div className="bg-pink-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">${analysis?.stats.dropi_valor_pendiente || 0}</p>
          </button>

          {/* Días Atraso Promedio */}
          <div className="card-barulogix-stat animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-semibold text-secondary-800 font-montserrat">Días Atraso Promedio</h4>
              <div className="bg-purple-100 p-2 rounded-full">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis?.stats.paquetes_atrasados.length > 0 ? (analysis.stats.paquetes_atrasados.reduce((sum, pkg) => sum + pkg.dias_atraso, 0) / analysis.stats.paquetes_atrasados.length).toFixed(1) : '0.0'}</p>
            <p className="text-secondary-600 font-segoe">días</p>
          </div>
        </div>

        {/* Tabla de Entregas Detalladas */}
        {selectedCategory && ( 
          <div className="card-barulogix-lg mb-8 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
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
            {filteredPackages.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Tracking
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Tipo
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Fecha Entrega
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Fecha Entrega Cliente
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Valor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider font-segoe">
                        Días Atraso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-secondary-200">
                    {filteredPackages.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 font-segoe">
                          {pkg.tracking}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 font-segoe">
                          {pkg.tipo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-segoe">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pkg.estado === 1 ? 'bg-green-100 text-green-800' : pkg.estado === 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                            {getEstadoText(pkg.estado)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 font-segoe">
                          {pkg.fecha_entrega ? new Date(pkg.fecha_entrega).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 font-segoe">
                          {pkg.fecha_entrega_cliente ? new Date(pkg.fecha_entrega_cliente).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-700 font-segoe">
                          {pkg.valor ? `$${pkg.valor.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-segoe">
                          {pkg.dias_atraso !== undefined ? (
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getDiasAtrasoColor(pkg.dias_atraso)}`}>
                              {pkg.dias_atraso}
                            </span>
                          ) : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-secondary-600 font-segoe">No hay datos</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

