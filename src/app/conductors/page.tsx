'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Conductor {
  id: string
  name: string
  zone: string
  phone?: string
  email?: string
  is_active: boolean
  created_at: string
}

export default function ConductorsPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    zone: '',
    phone: '',
    email: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadConductors()
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadConductors = async () => {
    try {
      const response = await fetch('/api/conductors')
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.zone.trim()) {
      alert('Nombre y zona son obligatorios')
      return
    }

    try {
      const url = editingConductor ? `/api/conductors/${editingConductor.id}` : '/api/conductors'
      const method = editingConductor ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        await loadConductors()
        resetForm()
        alert(editingConductor ? 'Conductor actualizado exitosamente' : 'Conductor registrado exitosamente')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar conductor')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar conductor')
    }
  }

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor)
    setFormData({
      name: conductor.name,
      zone: conductor.zone,
      phone: conductor.phone || '',
      email: conductor.email || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (conductor: Conductor) => {
    if (!confirm(`¿Estás seguro de eliminar al conductor ${conductor.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/conductors/${conductor.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await loadConductors()
        alert('Conductor eliminado exitosamente')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar conductor')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar conductor')
    }
  }

  const toggleStatus = async (conductor: Conductor) => {
    try {
      const response = await fetch(`/api/conductors/${conductor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: conductor.name,
          zone: conductor.zone,
          phone: conductor.phone,
          email: conductor.email,
          is_active: !conductor.is_active
        }),
      })

      if (response.ok) {
        await loadConductors()
        alert(`Conductor ${!conductor.is_active ? 'activado' : 'desactivado'} exitosamente`)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al cambiar estado del conductor')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', zone: '', phone: '', email: '' })
    setEditingConductor(null)
    setShowForm(false)
  }

  const filteredConductors = conductors.filter(conductor =>
    conductor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conductor.zone.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary-600 font-segoe">Cargando conductores...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Header */}
      <header className="header-barulogix">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 rounded-lg hover:bg-secondary-100 transition-colors"
              >
                <svg className="w-6 h-6 text-secondary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={50}
                height={50}
                className="mr-3"
              />
              <div>
                <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">Gestión de Conductores</h1>
                <p className="text-sm text-secondary-600 font-segoe">Administra conductores y zonas de entrega</p>
              </div>
            </div>
            <button onClick={handleLogout} className="btn-danger">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-barulogix">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-100 text-accent-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Total Conductores</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{conductors.length}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Activos</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">
                  {conductors.filter(c => c.is_active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="card-barulogix">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Zonas Cubiertas</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">
                  {new Set(conductors.map(c => c.zone)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="card-barulogix mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por nombre o zona..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-barulogix pl-10"
                />
              </div>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuevo Conductor
            </button>
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="card-barulogix-lg mb-8 animate-slide-up">
            <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat">
              {editingConductor ? 'Editar Conductor' : 'Nuevo Conductor'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-barulogix"
                    placeholder="Nombre completo del conductor"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Zona *
                  </label>
                  <input
                    type="text"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="input-barulogix"
                    placeholder="Zona de entrega asignada"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-barulogix"
                    placeholder="Número de teléfono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-barulogix"
                    placeholder="Correo electrónico"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingConductor ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de conductores */}
        <div className="card-barulogix">
          <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat">
            Lista de Conductores ({filteredConductors.length})
          </h3>
          
          {filteredConductors.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-secondary-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-secondary-500 font-segoe">No hay conductores registrados</p>
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary mt-4"
              >
                Registrar primer conductor
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-barulogix">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Zona</th>
                    <th>Teléfono</th>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductors.map((conductor) => (
                    <tr key={conductor.id}>
                      <td className="font-medium">{conductor.name}</td>
                      <td>{conductor.zone}</td>
                      <td>{conductor.phone || '-'}</td>
                      <td>{conductor.email || '-'}</td>
                      <td>
                        <span className={conductor.is_active ? 'estado-entregado' : 'estado-devuelto'}>
                          {conductor.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{new Date(conductor.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(conductor)}
                            className="text-primary-600 hover:text-primary-800 transition-colors"
                            title="Editar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => toggleStatus(conductor)}
                            className={`transition-colors ${conductor.is_active ? 'text-yellow-600 hover:text-yellow-800' : 'text-accent-600 hover:text-accent-800'}`}
                            title={conductor.is_active ? 'Desactivar' : 'Activar'}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={conductor.is_active ? "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(conductor)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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

