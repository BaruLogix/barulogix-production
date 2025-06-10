'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { 
  Package, 
  Plus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft
} from 'lucide-react'

interface Delivery {
  id: string
  trackingNumber: string
  platform: 'shein' | 'temu' | 'dropi' | 'other'
  recipient: string
  address: string
  phone: string
  conductorId?: string
  conductorName?: string
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'returned'
  createdAt: string
  deliveredAt?: string
  notes?: string
}

interface User {
  id: string
  role: 'admin' | 'user'
}

export default function DeliveriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const router = useRouter()

  useEffect(() => {
    initializeDeliveries()
  }, [])

  const initializeDeliveries = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      
      // Verificar autenticación
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        router.push('/auth/login')
        return
      }

      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        router.push('/auth/login')
        return
      }

      setUser({
        id: profile.id,
        role: profile.role
      })

      // Cargar entregas
      await loadDeliveries(authUser.id, profile.role, supabase)

    } catch (error) {
      console.error('Error initializing deliveries:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const loadDeliveries = async (userId: string, userRole: string, supabase: any) => {
    try {
      let query = supabase
        .from('deliveries')
        .select(`
          *,
          conductors(name)
        `)

      // Si no es admin, solo mostrar sus entregas
      if (userRole !== 'admin') {
        query = query.eq('user_id', userId)
      }

      const { data: deliveriesData, error: deliveriesError } = await query
        .order('created_at', { ascending: false })

      if (deliveriesError) {
        console.error('Error loading deliveries:', deliveriesError)
        return
      }

      const formattedDeliveries = deliveriesData?.map((delivery: any) => ({
        id: delivery.id,
        trackingNumber: delivery.tracking_number,
        platform: delivery.platform,
        recipient: delivery.recipient,
        address: delivery.address,
        phone: delivery.phone,
        conductorId: delivery.conductor_id,
        conductorName: delivery.conductors?.name || 'Sin asignar',
        status: delivery.status,
        createdAt: delivery.created_at,
        deliveredAt: delivery.delivered_at,
        notes: delivery.notes
      })) || []

      setDeliveries(formattedDeliveries)

    } catch (error) {
      console.error('Error loading deliveries:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'assigned':
        return <Package className="h-4 w-4 text-blue-500" />
      case 'in_transit':
        return <Package className="h-4 w-4 text-purple-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'returned':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'assigned':
        return 'Asignada'
      case 'in_transit':
        return 'En tránsito'
      case 'delivered':
        return 'Entregada'
      case 'returned':
        return 'Devuelta'
      default:
        return status
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'shein':
        return 'bg-pink-100 text-pink-800'
      case 'temu':
        return 'bg-orange-100 text-orange-800'
      case 'dropi':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Filtrar entregas
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesSearch = 
      delivery.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.recipient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.address.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || delivery.status === filterStatus
    const matchesPlatform = filterPlatform === 'all' || delivery.platform === filterPlatform

    return matchesSearch && matchesStatus && matchesPlatform
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Cargando entregas...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📦 Gestión de Entregas</h1>
                <p className="text-sm text-gray-600">Administra y hace seguimiento a las entregas</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva Entrega
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar por número de seguimiento, destinatario o dirección..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="assigned">Asignada</option>
                <option value="in_transit">En tránsito</option>
                <option value="delivered">Entregada</option>
                <option value="returned">Devuelta</option>
              </select>

              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas las plataformas</option>
                <option value="shein">Shein</option>
                <option value="temu">Temu</option>
                <option value="dropi">Dropi</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Entregas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {deliveries.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pendientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {deliveries.filter(d => d.status === 'pending').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Entregadas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {deliveries.filter(d => d.status === 'delivered').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Devueltas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {deliveries.filter(d => d.status === 'returned').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Lista de Entregas ({filteredDeliveries.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Seguimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Destinatario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plataforma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conductor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        {deliveries.length === 0 ? 'No hay entregas registradas' : 'No se encontraron entregas con los filtros aplicados'}
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {delivery.trackingNumber}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {delivery.recipient}
                            </div>
                            <div className="text-sm text-gray-500">
                              {delivery.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlatformColor(delivery.platform)}`}>
                            {delivery.platform.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(delivery.status)}
                            <span className="ml-2 text-sm text-gray-900">
                              {getStatusText(delivery.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {delivery.conductorName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(delivery.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-900">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button className="text-green-600 hover:text-green-900">
                              <Edit className="h-4 w-4" />
                            </button>
                            <button className="text-red-600 hover:text-red-900">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Modal Placeholder */}
          {showAddModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
              <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                  <h3 className="text-lg font-medium text-gray-900">Nueva Entrega</h3>
                  <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                      Funcionalidad de agregar entrega en desarrollo...
                    </p>
                  </div>
                  <div className="items-center px-4 py-3">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-gray-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-600"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

