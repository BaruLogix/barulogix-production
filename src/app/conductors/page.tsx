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
  has_credentials?: boolean
  email_verified?: boolean
}

export default function ConductorsPage() {
  const router = useRouter()
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)
  const [editingConductor, setEditingConductor] = useState<Conductor | null>(null)
  const [selectedConductor, setSelectedConductor] = useState<Conductor | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    zona: '',
    telefono: '',
    email: '',
    password: '',
    activo: true
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterZone, setFilterZone] = useState('')

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
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }
      
      const response = await fetch('/api/conductors', {
        headers: headers
      })
      
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
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('No se pudo obtener información del usuario logueado')
        return
      }
      
      const url = editingConductor ? `/api/conductors/${editingConductor.id}` : '/api/conductors'
      const method = editingConductor ? 'PUT' : 'POST'

      const headers = { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      }

      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        let credentialsSuccess = true
        
        // Si se está creando un conductor nuevo y se proporcionó email/password
        if (!editingConductor && formData.email && formData.password) {
          // Crear credenciales de conductor
          credentialsSuccess = await createConductorCredentials(response)
        }
        
        await loadConductors()
        setShowModal(false)
        setEditingConductor(null)
        setFormData({ nombre: '', zona: '', telefono: '', email: '', password: '', activo: true })
        
        // Solo mostrar mensaje de éxito si ambas operaciones fueron exitosas
        if (credentialsSuccess) {
          alert(`✅ Conductor "${formData.nombre}" ${editingConductor ? 'actualizado' : 'creado'} exitosamente`)
        }
      } else {
        const error = await response.json()
        console.error('Error response:', error)
        alert(error.error || 'Error al guardar conductor')
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      alert('Error al procesar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  const createConductorCredentials = async (conductorResponse: Response): Promise<boolean> => {
    try {
      const conductorData = await conductorResponse.json()
      const conductorId = conductorData.conductor?.id

      if (!conductorId) {
        console.error('No se pudo obtener el ID del conductor creado')
        alert('Error: No se pudo obtener el ID del conductor creado')
        return false
      }

      const credentialsResponse = await fetch('/api/conductor/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conductor_id: conductorId,
          email: formData.email,
          password: formData.password
        })
      })

      if (!credentialsResponse.ok) {
        const error = await credentialsResponse.json()
        console.error('Error creating conductor credentials:', error)
        alert(`❌ Error al crear las credenciales del conductor: ${error.error}`)
        return false
      }

      return true
    } catch (error) {
      console.error('Error creating conductor credentials:', error)
      alert('❌ Error al crear las credenciales del conductor')
      return false
    }
  }

  const handleEdit = (conductor: Conductor) => {
    setEditingConductor(conductor)
    setFormData({
      nombre: conductor.nombre,
      zona: conductor.zona,
      telefono: conductor.telefono || '',
      email: conductor.email || '',
      password: '',
      activo: conductor.activo
    })
    setShowModal(true)
  }

  const handleViewCredentials = (conductor: Conductor) => {
    setSelectedConductor(conductor)
    setShowCredentialsModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este conductor?')) {
      return
    }

    try {
      const userData = localStorage.getItem('user')
      const sessionData = localStorage.getItem('session')
      const userId = userData ? JSON.parse(userData).id : null
      const token = sessionData ? JSON.parse(sessionData).access_token : null
      
      if (!userId || !token) {
        console.error('No se pudo obtener información de autenticación')
        alert('Error de autenticación. Por favor, inicie sesión nuevamente.')
        return
      }
      
      const headers = {
        'x-user-id': userId,
        'authorization': `Bearer ${token}`
      }
      
      const response = await fetch(`/api/conductors/${id}`, {
        method: 'DELETE',
        headers: headers
      })

      if (response.ok) {
        await loadConductors()
        alert('Conductor eliminado exitosamente')
      } else {
        const errorData = await response.json()
        console.error('Error response:', errorData)
        alert(errorData.error || 'Error al eliminar conductor')
      }
    } catch (error) {
      console.error('Error deleting conductor:', error)
      alert('Error al eliminar conductor')
    }
  }

  const filteredConductors = conductors.filter(conductor => {
    const matchesSearch = !searchTerm || 
      conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conductor.zona.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesZone = !filterZone || conductor.zona === filterZone
    return matchesSearch && matchesZone
  })

  const zones = [...new Set(conductors.map(c => c.zona))].sort()
  const activeConductors = conductors.filter(c => c.activo).length
  const conductorsWithCredentials = conductors.filter(c => c.has_credentials).length

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
              <p className="text-sm text-secondary-600 font-segoe">Gestión de conductores y credenciales</p>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Con Credenciales</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{conductorsWithCredentials}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
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
                setFormData({ nombre: '', zona: '', telefono: '', email: '', password: '', activo: true })
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
              <p className="text-secondary-600 text-lg font-segoe">No hay conductores registrados</p>
              <p className="text-secondary-500 text-sm font-segoe mt-2">Agrega tu primer conductor para comenzar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConductors.map((conductor, index) => (
                <div key={conductor.id} className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${conductor.activo ? 'bg-accent-500' : 'bg-red-500'}`}></div>
                      <div>
                        <h3 className="text-lg font-bold text-secondary-900 font-montserrat">{conductor.nombre}</h3>
                        <p className="text-sm text-secondary-600 font-segoe">{conductor.zona}</p>
                        {conductor.email && (
                          <p className="text-xs text-secondary-500 font-segoe">{conductor.email}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {conductor.has_credentials && (
                        <button
                          onClick={() => handleViewCredentials(conductor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver credenciales"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(conductor)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(conductor.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {conductor.telefono && (
                      <div className="flex items-center text-sm text-secondary-600">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {conductor.telefono}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        conductor.activo 
                          ? 'bg-accent-100 text-accent-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {conductor.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      
                      {conductor.has_credentials && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          conductor.email_verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {conductor.email_verified ? 'Verificado' : 'Pendiente'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal para Agregar/Editar Conductor */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-secondary-900 mb-4 font-montserrat">
                {editingConductor ? 'Editar Conductor' : 'Agregar Conductor'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Nombre del conductor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Zona *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zona}
                    onChange={(e) => setFormData({...formData, zona: e.target.value})}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Zona de trabajo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Número de teléfono"
                  />
                </div>

                {!editingConductor && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Email (para acceso al dashboard)
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="input-barulogix-modern focus-ring"
                        placeholder="email@ejemplo.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        Contraseña (para acceso al dashboard)
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="input-barulogix-modern focus-ring"
                        placeholder="Mínimo 8 caracteres"
                      />
                      <p className="text-xs text-secondary-500 mt-1">
                        Debe contener al menos: 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
                      </p>
                    </div>
                  </>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={formData.activo}
                    onChange={(e) => setFormData({...formData, activo: e.target.checked})}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="activo" className="ml-2 block text-sm text-secondary-700">
                    Conductor activo
                  </label>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingConductor(null)
                      setFormData({ nombre: '', zona: '', telefono: '', email: '', password: '', activo: true })
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Guardando...' : (editingConductor ? 'Actualizar' : 'Crear')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Ver Credenciales */}
      {showCredentialsModal && selectedConductor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-secondary-900 mb-4 font-montserrat">
                Credenciales de Acceso
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Conductor
                  </label>
                  <p className="text-secondary-900 font-semibold">{selectedConductor.nombre}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Email de acceso
                  </label>
                  <p className="text-secondary-900">{selectedConductor.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    Estado de verificación
                  </label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedConductor.email_verified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedConductor.email_verified ? 'Email verificado' : 'Pendiente de verificación'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">
                    URL de acceso
                  </label>
                  <p className="text-blue-600 text-sm break-all">
                    {window.location.origin}/auth/conductor
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowCredentialsModal(false)
                    setSelectedConductor(null)
                  }}
                  className="btn-secondary flex-1"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

