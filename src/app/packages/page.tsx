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
  estado: 0 | 1 | 2 // 0=no entregado, 1=entregado, 2=devuelto
  fecha_entrega: string
  valor?: number
  created_at: string
  conductor: Conductor
}

interface PackageStats {
  total_packages: number
  no_entregados: number
  entregados: number
  devueltos: number
  shein_temu: number
  dropi: number
  valor_total_dropi: number
  valor_no_entregado_dropi: number
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [stats, setStats] = useState<PackageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterConductor, setFilterConductor] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const router = useRouter()

  // Formulario
  const [formData, setFormData] = useState({
    tracking: '',
    conductor_id: '',
    tipo: 'Shein/Temu' as 'Shein/Temu' | 'Dropi',
    fecha_entrega: '',
    valor: ''
  })

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Cargar conductores
      const conductorsRes = await fetch('/api/conductors')
      if (conductorsRes.ok) {
        const conductorsData = await conductorsRes.json()
        setConductors(conductorsData.conductors || [])
      }

      // Cargar paquetes
      await loadPackages()
      
      // Cargar estadísticas
      await loadStats()
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPackages = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterConductor) params.append('conductor_id', filterConductor)
      if (filterTipo) params.append('tipo', filterTipo)
      if (filterEstado !== '') params.append('estado', filterEstado)

      const response = await fetch(`/api/packages?${params}`)
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error loading packages:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/packages/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.tracking || !formData.conductor_id || !formData.fecha_entrega) {
      alert('Por favor complete todos los campos requeridos')
      return
    }

    try {
      const packageData = {
        ...formData,
        valor: formData.tipo === 'Dropi' && formData.valor ? parseFloat(formData.valor) : null
      }

      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages'
      const method = editingPackage ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packageData)
      })

      if (response.ok) {
        alert(editingPackage ? 'Paquete actualizado exitosamente' : 'Paquete registrado exitosamente')
        setShowForm(false)
        setEditingPackage(null)
        setFormData({
          tracking: '',
          conductor_id: '',
          tipo: 'Shein/Temu',
          fecha_entrega: '',
          valor: ''
        })
        loadData()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al procesar el paquete')
      }
    } catch (error) {
      console.error('Error submitting package:', error)
      alert('Error al procesar el paquete')
    }
  }

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      tracking: pkg.tracking,
      conductor_id: pkg.conductor_id,
      tipo: pkg.tipo,
      fecha_entrega: pkg.fecha_entrega,
      valor: pkg.valor?.toString() || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este paquete?')) return

    try {
      const response = await fetch(`/api/packages/${id}`, { method: 'DELETE' })
      if (response.ok) {
        alert('Paquete eliminado exitosamente')
        loadData()
      } else {
        alert('Error al eliminar paquete')
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      alert('Error al eliminar paquete')
    }
  }

  const updatePackageStatus = async (id: string, newStatus: 0 | 1 | 2) => {
    try {
      const pkg = packages.find(p => p.id === id)
      if (!pkg) return

      const response = await fetch(`/api/packages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pkg,
          estado: newStatus
        })
      })

      if (response.ok) {
        loadData()
      } else {
        alert('Error al actualizar estado del paquete')
      }
    } catch (error) {
      console.error('Error updating package status:', error)
      alert('Error al actualizar estado del paquete')
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando paquetes...</p>
        </div>
      </div>
    )
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
              <h1 className="text-xl font-bold text-gray-800 font-montserrat">BaruLogix - Gestión de Paquetes</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Dashboard
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
        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Paquetes</h3>
              <p className="text-3xl font-bold text-blue-600">{stats.total_packages}</p>
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

        {/* Controles */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold text-gray-900 font-montserrat">Gestión de Paquetes</h2>
            <button
              onClick={() => {
                setShowForm(true)
                setEditingPackage(null)
                setFormData({
                  tracking: '',
                  conductor_id: '',
                  tipo: 'Shein/Temu',
                  fecha_entrega: '',
                  valor: ''
                })
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Registrar Paquete
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <input
              type="text"
              placeholder="Buscar por tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterConductor}
              onChange={(e) => setFilterConductor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los conductores</option>
              {conductors.map(conductor => (
                <option key={conductor.id} value={conductor.id}>
                  {conductor.nombre} - {conductor.zona}
                </option>
              ))}
            </select>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los tipos</option>
              <option value="Shein/Temu">Shein/Temu</option>
              <option value="Dropi">Dropi</option>
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los estados</option>
              <option value="0">No Entregado</option>
              <option value="1">Entregado</option>
              <option value="2">Devuelto</option>
            </select>
          </div>

          <button
            onClick={loadPackages}
            className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Aplicar Filtros
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 font-montserrat">
              {editingPackage ? 'Editar Paquete' : 'Registrar Nuevo Paquete'}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tracking *
                </label>
                <input
                  type="text"
                  value={formData.tracking}
                  onChange={(e) => setFormData({ ...formData, tracking: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conductor *
                </label>
                <select
                  value={formData.conductor_id}
                  onChange={(e) => setFormData({ ...formData, conductor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
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
                  Tipo *
                </label>
                <select
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'Shein/Temu' | 'Dropi' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="Shein/Temu">Shein/Temu</option>
                  <option value="Dropi">Dropi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Entrega *
                </label>
                <input
                  type="date"
                  value={formData.fecha_entrega}
                  onChange={(e) => setFormData({ ...formData, fecha_entrega: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              {formData.tipo === 'Dropi' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor (COP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  {editingPackage ? 'Actualizar' : 'Registrar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingPackage(null)
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de Paquetes */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {pkg.tracking}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {pkg.conductor.nombre} - {pkg.conductor.zona}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(pkg)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Editar
                      </button>
                      <select
                        value={pkg.estado}
                        onChange={(e) => updatePackageStatus(pkg.id, parseInt(e.target.value) as 0 | 1 | 2)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value={0}>No Entregado</option>
                        <option value={1}>Entregado</option>
                        <option value={2}>Devuelto</option>
                      </select>
                      <button
                        onClick={() => handleDelete(pkg.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {packages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No se encontraron paquetes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

