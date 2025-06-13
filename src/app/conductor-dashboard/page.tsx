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
  AlertCircle,
  BarChart3
} from 'lucide-react'

interface ConductorStats {
  shein_temu_delivered: number
  shein_temu_pending: number
  dropi_delivered: number
  dropi_pending: number
  total_pending_value: number
  average_delay_days: number
  total_packages: number
  delivery_rate: number
}

interface ConductorInfo {
  id: string
  email: string
}

interface Package {
  id: string
  tracking_number: string
  platform: string
  status: string
  value: string
  created_at: string
  delivery_date: string | null
  customer_delivery_date: string | null
  recipient_name: string
  recipient_address: string
  delay_days: number
  formatted_value: string
  formatted_created_at: string
  formatted_delivery_date: string | null
  formatted_customer_delivery_date: string | null
}

export default function ConductorDashboard() {
  const [conductorInfo, setConductorInfo] = useState<ConductorInfo | null>(null)
  const [stats, setStats] = useState<ConductorStats | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPackageType, setSelectedPackageType] = useState<string | null>(null)
  
  // Filtros de fecha
  const [dateFilter, setDateFilter] = useState<'all' | 'range' | 'last_days' | 'month'>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lastDays, setLastDays] = useState(7)
  const [selectedMonth, setSelectedMonth] = useState('')

  const router = useRouter()

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('conductor_token')
    const info = localStorage.getItem('conductor_info')
    
    if (!token || !info) {
      router.push('/auth/conductor')
      return
    }

    setConductorInfo(JSON.parse(info))
    loadStats()
  }, [router])

  useEffect(() => {
    if (conductorInfo) {
      loadStats()
    }
  }, [dateFilter, startDate, endDate, lastDays, selectedMonth])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('conductor_token')
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const buildDateParams = () => {
    const params = new URLSearchParams()
    
    switch (dateFilter) {
      case 'range':
        if (startDate && endDate) {
          params.append('start_date', startDate)
          params.append('end_date', endDate)
        }
        break
      case 'last_days':
        params.append('last_days', lastDays.toString())
        break
      case 'month':
        if (selectedMonth) {
          params.append('month', selectedMonth)
        }
        break
    }
    
    return params.toString()
  }

  const loadStats = async () => {
    try {
      const params = buildDateParams()
      const response = await fetch(`/api/conductor/stats?${params}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      } else if (response.status === 401) {
        localStorage.removeItem('conductor_token')
        localStorage.removeItem('conductor_info')
        router.push('/auth/conductor')
      } else {
        setError('Error al cargar estadísticas')
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const loadPackages = async (packageType: string) => {
    setPackagesLoading(true)
    setSelectedPackageType(packageType)
    
    try {
      const params = new URLSearchParams()
      params.append('type', packageType)
      
      // Añadir filtros de fecha
      const dateParams = buildDateParams()
      if (dateParams) {
        const urlParams = new URLSearchParams(dateParams)
        urlParams.forEach((value, key) => params.append(key, value))
      }

      const response = await fetch(`/api/conductor/packages?${params.toString()}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages)
      } else {
        setError('Error al cargar paquetes')
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setPackagesLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('conductor_token')
    localStorage.removeItem('conductor_info')
    router.push('/auth/conductor')
  }

  const getPackageTypeTitle = (type: string) => {
    switch (type) {
      case 'shein_temu_delivered': return 'Paquetes Shein/Temu Entregados'
      case 'shein_temu_pending': return 'Paquetes Shein/Temu Pendientes'
      case 'dropi_delivered': return 'Paquetes Dropi Entregados'
      case 'dropi_pending': return 'Paquetes Dropi Pendientes'
      default: return 'Paquetes'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
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
                <h1 className="text-xl font-semibold text-gray-900">Dashboard de Conductor</h1>
                <p className="text-sm text-gray-500">BaruLogix</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-2" />
                {conductorInfo?.email}
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Filtros de Fecha */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Filtros de Fecha</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Filtro
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Todos los tiempos</option>
                <option value="range">Rango de fechas</option>
                <option value="last_days">Últimos X días</option>
                <option value="month">Mes específico</option>
              </select>
            </div>

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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {dateFilter === 'last_days' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Últimos días (1-30)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={lastDays}
                  onChange={(e) => setLastDays(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Shein/Temu Entregados */}
            <button
              onClick={() => loadPackages('shein_temu_delivered')}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Shein/Temu Entregados</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.shein_temu_delivered}</p>
                </div>
              </div>
            </button>

            {/* Shein/Temu Pendientes */}
            <button
              onClick={() => loadPackages('shein_temu_pending')}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Shein/Temu Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.shein_temu_pending}</p>
                </div>
              </div>
            </button>

            {/* Dropi Entregados */}
            <button
              onClick={() => loadPackages('dropi_delivered')}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dropi Entregados</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.dropi_delivered}</p>
                </div>
              </div>
            </button>

            {/* Dropi Pendientes */}
            <button
              onClick={() => loadPackages('dropi_pending')}
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left"
            >
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Dropi Pendientes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.dropi_pending}</p>
                </div>
              </div>
            </button>

            {/* Valor Pendiente */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Valor Pendiente</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {new Intl.NumberFormat('es-CO', {
                      style: 'currency',
                      currency: 'COP'
                    }).format(stats.total_pending_value)}
                  </p>
                </div>
              </div>
            </div>

            {/* Días de Atraso Promedio */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Atraso Promedio</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.average_delay_days} días</p>
                </div>
              </div>
            </div>

            {/* Total de Paquetes */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Paquetes</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.total_packages}</p>
                </div>
              </div>
            </div>

            {/* Tasa de Entrega */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center">
                <div className="p-2 bg-teal-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-teal-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Tasa de Entrega</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.delivery_rate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Paquetes */}
        {selectedPackageType && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {getPackageTypeTitle(selectedPackageType)}
              </h3>
            </div>
            
            {packagesLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Cargando paquetes...</p>
              </div>
            ) : packages.length > 0 ? (
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
                        Fecha Entrega Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Días Atraso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {packages.map((pkg) => (
                      <tr key={pkg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {pkg.tracking_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pkg.platform === 'dropi' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {pkg.platform.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            pkg.status === 'entregado' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pkg.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pkg.formatted_value}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pkg.formatted_created_at}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {pkg.formatted_customer_delivery_date || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`font-medium ${
                            pkg.delay_days > 7 ? 'text-red-600' : 
                            pkg.delay_days > 3 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {pkg.delay_days} días
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                No hay paquetes para mostrar en esta categoría.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

