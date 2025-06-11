'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Conductor {
  id: string
  nombre: string
  zona: string
  telefono?: string
  activo: boolean
  created_at: string
}

export default function ConductorsPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterZone, setFilterZone] = useState('')
  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    telefono: '',
    activo: true
  })
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
      // Obtener el email del usuario logueado
      const userData = localStorage.getItem('user')
      const userEmail = userData ? JSON.parse(userData).email : null
      
      console.log('=== DEBUG FRONTEND ===')
      console.log('userData from localStorage:', userData)
      console.log('userEmail extracted:', userEmail)
      
      if (!userEmail) {
        console.error('No se pudo obtener email del usuario')
        return
      }
      
      const headers = {
        'x-user-email': userEmail
      }
      
      console.log('Headers a enviar:', headers)
      
      const response = await fetch('/api/conductors', {
        headers: headers
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Obtener el email del usuario logueado
      const userData = localStorage.getItem('user')
      const userEmail = userData ? JSON.parse(userData).email : null
      
      console.log('=== DEBUG FRONTEND SUBMIT ===')
      console.log('userData from localStorage:', userData)
      console.log('userEmail extracted:', userEmail)
      
      if (!userEmail) {
        alert('No se pudo obtener información del usuario logueado')
        return
      }
      
      const url = editingConductor ? `/api/conductors/${editingConductor.id}` : '/api/conductors'
      const method = editingConductor ? 'PUT' : 'POST'

      const headers = { 
        'Content-Type': 'application/json',
        'x-user-email': userEmail
      }
      
      console.log('Headers a enviar:', headers)
      console.log('URL:', url)
      console.log('Method:', method)
      console.log('Body:', formData)

      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(formData)
      })

      console.log('Response status:', response.status)

      if (response.ok) {
        const newConductor = await response.json()
        await loadConductors() // Recargar la lista
        setShowModal(false)
        setEditingConductor(null)
        setFormData({ nombre: '', zona: '', telefono: '', activo: true })
        
        // Mostrar mensaje de éxito
        alert(`✅ Conductor "${formData.nombre}" creado exitosamente`)
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        alert(error.error || 'Error al guardar conductor')
      }
    } catch (error) {
      console.error('Error saving conductor:', error)
      alert('Error al guardar conductor')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor)
    setFormData({
      nombre: conductor.nombre,
      zona: conductor.zona,
      telefono: conductor.telefono || '',
      activo: conductor.activo
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este conductor?')) return

    try {
      const response = await fetch(`/api/conductors/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadConductors()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar conductor')
      }
    } catch (error) {
      console.error('Error deleting conductor:', error)
      alert('Error al eliminar conductor')
    }
  }

  const toggleActive = async (conductor: Conductor) => {
    try {
      const response = await fetch(`/api/conductors/${conductor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: conductor.nombre,
          zona: conductor.zona,
          activo: !conductor.activo
        })
      })

      if (response.ok) {
        await loadConductors()
      }
    } catch (error) {
      console.error('Error toggling conductor status:', error)
    }
  }

  const filteredConductors = conductors.filter(conductor => {
    const matchesSearch = conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conductor.zona.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesZone = !filterZone || conductor.zona === filterZone
    return matchesSearch && matchesZone
  })

  const zones = [...new Set(conductors.map(c => c.zona))].sort()
  const activeConductors = conductors.filter(c => c.activo).length
  const inactiveConductors = conductors.filter(c => !c.activo).length

  if (loading && conductors.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 text-lg font-medium font-segoe">Cargando conductores...</p>
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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Conductores</h1>
              <p className="text-sm text-secondary-600 font-segoe">Gestión de conductores por zonas</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('user')
                localStorage.removeItem('session')
                router.push('/auth/login')
              }}
              className="btn-danger btn-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Total Conductores</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{conductors.length}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-100 text-accent-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Activos</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{activeConductors}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Zonas</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{zones.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nombre o zona..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filterZone}
                  onChange={(e) => setFilterZone(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todas las zonas</option>
                  {zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingConductor(null)
                setFormData({ nombre: '', zona: '', telefono: '', activo: true })
                setShowModal(true)
              }}
              className="btn-primary hover-glow"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Agregar Conductor
            </button>
          </div>
        </div>

        {/* Lista de Conductores */}
        <div className="card-barulogix-lg animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            Lista de Conductores ({filteredConductors.length})
          </h2>

          {filteredConductors.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-secondary-600 text-lg font-segoe">No se encontraron conductores</p>
              <p className="text-secondary-500 text-sm font-segoe mt-1">Agrega el primer conductor para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-barulogix">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Zona</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConductors.map((conductor, index) => (
                    <tr key={conductor.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                      <td>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-primary-600 font-semibold text-sm">
                              {conductor.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-secondary-900 font-segoe">{conductor.nombre}</span>
                        </div>
                      </td>
                      <td>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {conductor.zona}
                        </span>
                      </td>
                      <td className="text-secondary-600 font-segoe">
                        {conductor.telefono ? (
                          <a href={`tel:${conductor.telefono}`} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">
                            {conductor.telefono}
                          </a>
                        ) : (
                          <span className="text-secondary-400 italic">No registrado</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => toggleActive(conductor)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                            conductor.activo 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${conductor.activo ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          {conductor.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td className="text-secondary-600 font-segoe">
                        {new Date(conductor.created_at).toLocaleDateString('es-CO')}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(conductor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(conductor.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900 font-montserrat">
                {editingConductor ? 'Editar Conductor' : 'Agregar Conductor'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-barulogix">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                  placeholder="Nombre del conductor"
                />
              </div>

              <div>
                <label className="label-barulogix">Zona</label>
                <input
                  type="text"
                  required
                  value={formData.zona}
                  onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                  placeholder="Zona de trabajo"
                />
              </div>

              <div>
                <label className="label-barulogix">Teléfono (Opcional)</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                  placeholder="Número de teléfono"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="activo" className="ml-2 text-sm text-secondary-700 font-segoe">
                  Conductor activo
                </label>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : (editingConductor ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

