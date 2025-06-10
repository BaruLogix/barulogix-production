'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  city: string
  customer_type: string
  status: string
  created_at: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Colombia',
    customer_type: 'regular',
    credit_limit: '',
    payment_terms: '30',
    tax_id: '',
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

    loadCustomers()
  }, [router])

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/customers')
      const data = await response.json()

      if (response.ok) {
        setCustomers(data.customers || [])
      } else {
        setError(data.error || 'Error al cargar clientes')
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
      const url = '/api/customers'
      const method = editingCustomer ? 'PUT' : 'POST'
      const body = editingCustomer 
        ? { ...formData, id: editingCustomer.id }
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
        setEditingCustomer(null)
        resetForm()
        loadCustomers()
      } else {
        setError(data.error || 'Error al guardar cliente')
      }
    } catch (error) {
      setError('Error de conexión')
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      address: customer.address || '',
      city: customer.city || '',
      state: '',
      postal_code: '',
      country: 'Colombia',
      customer_type: customer.customer_type || 'regular',
      credit_limit: '',
      payment_terms: '30',
      tax_id: '',
      notes: ''
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
      return
    }

    try {
      const response = await fetch(`/api/customers?id=${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        loadCustomers()
      } else {
        setError(data.error || 'Error al eliminar cliente')
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
      company: '',
      address: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Colombia',
      customer_type: 'regular',
      credit_limit: '',
      payment_terms: '30',
      tax_id: '',
      notes: ''
    })
  }

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'premium': return 'bg-yellow-100 text-yellow-800'
      case 'corporate': return 'bg-purple-100 text-purple-800'
      case 'regular': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCustomerTypeText = (type: string) => {
    switch (type) {
      case 'premium': return '⭐ Premium'
      case 'corporate': return '🏢 Corporativo'
      case 'regular': return '👤 Regular'
      default: return type
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'blocked': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando clientes...</p>
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
                <h1 className="text-2xl font-bold text-gray-900">👥 Clientes</h1>
                <p className="text-sm text-gray-600">Base de datos de clientes</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowForm(true)
                  setEditingCustomer(null)
                  resetForm()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Nuevo Cliente</span>
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
              {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  placeholder="Nombre del cliente"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
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
                  Empresa
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nombre de la empresa"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dirección completa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ciudad"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Cliente
                </label>
                <select
                  value={formData.customer_type}
                  onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="regular">👤 Regular</option>
                  <option value="premium">⭐ Premium</option>
                  <option value="corporate">🏢 Corporativo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite de Crédito
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Términos de Pago (días)
                </label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0">Contado</option>
                  <option value="15">15 días</option>
                  <option value="30">30 días</option>
                  <option value="45">45 días</option>
                  <option value="60">60 días</option>
                </select>
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
                  placeholder="Información adicional sobre el cliente..."
                />
              </div>

              <div className="md:col-span-2 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCustomer(null)
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
                  {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de clientes */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              Lista de Clientes ({customers.length})
            </h3>
          </div>

          {customers.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay clientes registrados
              </h3>
              <p className="text-gray-600 mb-4">
                Comienza agregando tu primer cliente
              </p>
              <button
                onClick={() => {
                  setShowForm(true)
                  setEditingCustomer(null)
                  resetForm()
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                ➕ Agregar Primer Cliente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ubicación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.name}
                          </div>
                          {customer.company && (
                            <div className="text-sm text-gray-500">
                              🏢 {customer.company}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          {customer.email && (
                            <div className="text-sm text-gray-900">
                              📧 {customer.email}
                            </div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-gray-500">
                              📞 {customer.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          📍 {customer.address}
                        </div>
                        {customer.city && (
                          <div className="text-sm text-gray-500">
                            {customer.city}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCustomerTypeColor(customer.customer_type)}`}>
                          {getCustomerTypeText(customer.customer_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                          {customer.status === 'active' ? '✅ Activo' : customer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
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

