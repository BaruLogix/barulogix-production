'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface Conductor {
  id: string
  name: string
  email: string
  phone: string
  license_number: string
  license_type: string
  vehicle_type: string
  vehicle_plate: string
  status: string
  rating: number
  total_deliveries: number
  created_at: string
}

export default function ConductorsPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license_number: '',
    license_type: 'B',
    license_expiry: '',
    vehicle_type: '',
    vehicle_plate: '',
    vehicle_model: '',
    vehicle_year: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    salary: '',
    commission_rate: '',
    notes: ''
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Verificar autenticación
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/auth/login')
      return
    }

    loadConductors()
  }, [router])

  const loadConductors = async () => {
    try {
      const response = await fetch('/api/conductors')
      const data = await response.json()

      if (response.ok) {
        setConductors(data.conductors || [])
      } else {
        setError(data.error || 'Error al cargar conductores')
      }
    } catch (error) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const url = editingConductor ? '/api/conductors' : '/api/conductors'
      const method = editingConductor ? 'PUT' : 'POST'
      const body = editingConductor 
        ? { ...formData, id: editingConductor.id }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setShowForm(false)
        setEditingConductor(null)
        resetForm()
        loadConductors()
      } else {
        setError(data.error || 'Error al guardar conductor')
      }
    } catch (error) {
      setError('Error de conexión')
    }
  }

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor)
    setFormData({
      name: conductor.name || '',
      email: conductor.email || '',
      phone: conductor.phone || '',
      license_number: conductor.license_number || '',
      license_type: conductor.license_type || 'B',
      license_expiry: '',
      vehicle_type: conductor.vehicle_type || '',
      vehicle_plate: conductor.vehicle_plate || '',
      vehicle_model: '',
      vehicle_year: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      salary: '',
      commission_rate: '',
      notes: ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      return
    }

    try {
      const response = await fetch(`/api/conductors?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        loadConductors()
      } else {
        setError(data.error || 'Error al eliminar conductor')
      }
    } catch (error) {
      setError('Error de conexión')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      license_number: '',
      license_type: 'B',
      license_expiry: '',
      vehicle_type: '',
      vehicle_plate: '',
      vehicle_model: '',
      vehicle_year: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      salary: '',
      commission_rate: '',
      notes: ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'suspended': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Activo'
      case 'inactive': return 'Inactivo'
      case 'suspended': return 'Suspendido'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando conductores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Image
                  src="/logo-oficial.png"
                  alt="BaruLogix"
                  width={120}
                  height={120}
                  className="h-12 w-auto cursor-pointer"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🚛 Conductores</h1>
                <p className="text-sm text-gray-600">Gestión de equipo de conductores</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowForm(true)
                  setEditingConductor(null)
                  resetForm()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Nuevo Conductor</span>
              </button>
              
              <Link
                href="/dashboard"
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ← Volver
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensajes */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="mb-8 bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}
            </h3>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre del conductor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+57 300 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Licencia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.license_number}
                  onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Licencia
                </label>
                <select
                  value={formData.license_type}
                  onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="A1">A1 - Motocicleta</option>
                  <option value="A2">A2 - Motocicleta</option>
                  <option value="B">B - Automóvil</option>
                  <option value="C1">C1 - Camión liviano</option>
                  <option value="C2">C2 - Camión pesado</option>
                  <option value="C3">C3 - Camión articulado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Vehículo
                </label>
                <input
                  type="text"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Motocicleta, Camión, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa del Vehículo
                </label>
                <input
                  type="text"
                  value={formData.vehicle_plate}
                  onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ABC123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salario Mensual
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1500000"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Información adicional sobre el conductor..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingConductor(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingConductor ? 'Actualizar' : 'Crear'} Conductor
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de conductores */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Lista de Conductores ({conductors.length})
            </h3>
          </div>

          {conductors.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">🚛</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay conductores registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando tu primer conductor al equipo
              </p>
              <button
                onClick={() => {
                  setShowForm(true)
                  setEditingConductor(null)
                  resetForm()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ➕ Agregar Primer Conductor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conductor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Licencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehículo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entregas
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {conductors.map((conductor) => (
                    <tr key={conductor.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {conductor.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {conductor.email}
                          </div>
                          {conductor.phone && (
                            <div className="text-sm text-gray-500">
                              📞 {conductor.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {conductor.license_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          Tipo {conductor.license_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {conductor.vehicle_type || 'No asignado'}
                        </div>
                        {conductor.vehicle_plate && (
                          <div className="text-sm text-gray-500">
                            🚗 {conductor.vehicle_plate}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(conductor.status)}`}>
                          {getStatusText(conductor.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {conductor.total_deliveries || 0}
                        </div>
                        <div className="text-sm text-gray-500">
                          ⭐ {conductor.rating || 5.0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(conductor)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(conductor.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          🗑️ Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

