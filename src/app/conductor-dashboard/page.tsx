'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Calendar,
  Filter,
  LogOut,
  User,
  Truck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface ConductorInfo {
  id: string
  nombre: string
  zona: string
  email: string
}

interface Stats {
  shein_temu_entregados: number
  shein_temu_pendientes: number
  dropi_entregados: number
  dropi_pendientes: number
  valor_pendiente: number
  dias_atraso_promedio: number
  total_paquetes: number
  tasa_entrega: number
}

interface Package {
  tracking_number: string
  platform: 'Shein/Temu' | 'Dropi'
  status: string
  value: number
  assigned_date: string
  delivered_date?: string
  days_late: number
}

export default function ConductorDashboard() {
  const router = useRouter()
  const [conductorInfo, setConductorInfo] = useState<ConductorInfo | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedStat, setSelectedStat] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState('all')
  const [customDays, setCustomDays] = useState(30)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  useEffect(() => {
    if (conductorInfo) {
      loadStats()
      if (selectedStat) {
        loadPackages()
      }
    }
  }, [dateFilter, customDays, startDate, endDate, selectedMonth, conductorInfo])

  const checkAuth = () => {
    const token = localStorage.getItem('conductor_token')
    const info = localStorage.getItem('conductor_info')
    
    if (!token || !info) {
      router.push('/auth/conductor')
      return
    }

    try {
      const parsedInfo = JSON.parse(info)
      setConductorInfo(parsedInfo)
      
      // Establecer cookie para el middleware
      document.cookie = `conductor_token=${token}; path=/; max-age=86400`
    } catch (error) {
      console.error('Error parsing conductor info:', error)
      router.push('/auth/conductor')
    }
  }

  const loadData = async () => {
    await Promise.all([loadStats(), loadPackages()])
  }

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('conductor_token')
      if (!token) return

      const params = new URLSearchParams()
      
      if (dateFilter === 'range' && startDate && endDate) {
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      } else if (dateFilter === 'days') {
        params.append('days', customDays.toString())
      } else if (dateFilter === 'month' && selectedMonth) {
        params.append('month', selectedMonth)
      }

      const response = await fetch(`/api/conductor/stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else {
        setError('Error al cargar estadísticas')
      }
    } catch (error) {
      setError('Error de conexión al cargar estadísticas')
    }
  }

  const loadPackages = async () => {
    try {
      const token = localStorage.getItem('conductor_token')
      if (!token) return

      const params = new URLSearchParams()
      
      if (selectedStat) {
        params.append('filter', selectedStat)
      }
      
      if (dateFilter === 'range' && startDate && endDate) {
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      } else if (dateFilter === 'days') {
        params.append('days', customDays.toString())
      } else if (dateFilter === 'month' && selectedMonth) {
        params.append('month', selectedMonth)
      }

      const response = await fetch(`/api/conductor/packages?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages)
      } else {
        setError('Error al cargar paquetes')
      }
    } catch (error) {
      setError('Error de conexión al cargar paquetes')
    } finally {
      setLoading(false)
    }
  }

  const handleStatClick = (statType: string) => {
    setSelectedStat(statType)
    loadPackages()
  }

  const handleLogout = () => {
    localStorage.removeItem('conductor_token')
    localStorage.removeItem('conductor_info')
    document.cookie = 'conductor_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/auth/conductor')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO')
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'entregado':
        return 'text-green-600 bg-green-100'
      case 'pendiente':
        return 'text-yellow-600 bg-yellow-100'
      case 'en_transito':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getDaysLateColor = (days: number) => {
    if (days <= 0) return 'text-green-600'
    if (days <= 3) return 'text-yellow-600'
    if (days <= 7) return 'text-orange-600'
    return 'text-red-600'
  }

  if (loading && !conductorInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard de Conductor</h1>
                <p className="text-sm text-gray-600">
                  {conductorInfo?.nombre} - {conductorInfo?.zona}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros Temporales
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Filtro
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los tiempos</option>
                <option value="days">Últimos X días</option>
                <option value="month">Mes específico</option>
                <option value="range">Rango de fechas</option>
              </select>
            </div>

            {dateFilter === 'days' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Últimos días
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value) || 30)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {dateFilter === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mes
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {dateFilter === 'range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <button
              onClick={() => handleStatClick('shein_temu_entregados')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Shein/Temu Entregados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.shein_temu_entregados}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleStatClick('shein_temu_pendientes')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Shein/Temu Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.shein_temu_pendientes}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleStatClick('dropi_entregados')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dropi Entregados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dropi_entregados}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleStatClick('dropi_pendientes')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dropi Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dropi_pendientes}</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleStatClick('valor_pendiente')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Valor Pendiente</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.valor_pendiente)}</p>
                </div>
              </div>
            </button>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Días Atraso Promedio</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.dias_atraso_promedio.toFixed(1)}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStatClick('total_paquetes')}
              className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <Package className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Paquetes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_paquetes}</p>
                </div>
              </div>
            </button>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tasa de Entrega</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.tasa_entrega.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Paquetes */}
        {selectedStat && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Paquetes Detallados - {selectedStat.replace(/_/g, ' ').toUpperCase()}
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Asignación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Entrega
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días Atraso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {packages.map((pkg, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {pkg.tracking_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pkg.platform}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pkg.status)}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(pkg.value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(pkg.assigned_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {pkg.delivered_date ? formatDate(pkg.delivered_date) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={getDaysLateColor(pkg.days_late)}>
                          {pkg.days_late > 0 ? `+${pkg.days_late}` : pkg.days_late} días
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {packages.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No hay paquetes para mostrar</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

