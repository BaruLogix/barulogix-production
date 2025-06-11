'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Package {
  id: string
  tracking: string
  conductor_id: string
  conductor: {
    id: string
    nombre: string
    zona: string
  }
  tipo: 'Shein/Temu' | 'Dropi'
  estado: number
  fecha_entrega: string
  valor?: number
  created_at: string
}

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterConductor, setFilterConductor] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterEstado, setFilterEstado] = useState('')
  const [bulkData, setBulkData] = useState('')
  const [bulkType, setBulkType] = useState<'shein_temu' | 'dropi'>('shein_temu')
  const [bulkConductor, setBulkConductor] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [stats, setStats] = useState({
    total_packages: 0,
    entregados: 0,
    no_entregados: 0,
    devueltos: 0,
    valor_total_dropi: 0
  })
  const [formData, setFormData] = useState({
    tracking: '',
    conductor_id: '',
    tipo: 'Shein/Temu' as 'Shein/Temu' | 'Dropi',
    estado: 0,
    fecha_entrega: '',
    valor: ''
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadPackages()
    loadConductors()
    loadStats()
    
    // Establecer fecha por defecto (hoy)
    const today = new Date().toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, fecha_entrega: today }))
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadPackages = async () => {
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar paquetes')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      const response = await fetch('/api/packages', { headers })
      if (response.ok) {
        const data = await response.json()
        setPackages(data.packages || [])
      }
    } catch (error) {
      console.error('Error loading packages:', error)
    }
  }

  const loadConductors = async () => {
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar conductores')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      const response = await fetch('/api/conductors', { headers })
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    }
  }

  const loadStats = async () => {
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar estadísticas')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      const response = await fetch('/api/packages/stats', { headers })
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats || {})
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setLoading(false)
        return
      }

      const submitData = {
        ...formData,
        valor: formData.tipo === 'Dropi' && formData.valor ? parseFloat(formData.valor) : null
      }

      const url = editingPackage ? `/api/packages/${editingPackage.id}` : '/api/packages'
      const method = editingPackage ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        await loadPackages()
        await loadStats()
        setShowModal(false)
        setEditingPackage(null)
        setFormData({
          tracking: '',
          conductor_id: '',
          tipo: 'Shein/Temu',
          estado: 0,
          fecha_entrega: new Date().toISOString().split('T')[0],
          valor: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Error al guardar paquete')
      }
    } catch (error) {
      console.error('Error saving package:', error)
      alert('Error al guardar paquete')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!bulkData.trim() || !bulkConductor) {
      alert('Por favor complete todos los campos')
      return
    }

    setBulkLoading(true)
    
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setBulkLoading(false)
        return
      }

      const response = await fetch('/api/packages/bulk', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          tipo: bulkType,
          data: bulkData.trim(),
          conductor_id: bulkConductor
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        let message = `✅ Procesamiento completado:\n\n`
        message += `📦 Paquetes insertados: ${result.inserted}\n`
        message += `📋 Total procesados: ${result.total_processed}\n`
        
        if (result.errors.length > 0) {
          message += `\n⚠️ Errores encontrados (${result.errors.length}):\n`
          message += result.errors.slice(0, 10).join('\n')
          if (result.errors.length > 10) {
            message += `\n... y ${result.errors.length - 10} errores más`
          }
        }
        
        alert(message)
        
        // Limpiar formulario y recargar datos
        setBulkData('')
        setBulkConductor('')
        setShowBulkModal(false)
        await loadPackages()
        await loadStats()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al procesar paquetes')
      }
    } catch (error) {
      console.error('Error in bulk submit:', error)
      alert('Error al procesar paquetes')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
    setFormData({
      tracking: pkg.tracking,
      conductor_id: pkg.conductor_id,
      tipo: pkg.tipo,
      estado: pkg.estado,
      fecha_entrega: pkg.fecha_entrega,
      valor: pkg.valor?.toString() || ''
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este paquete?')) return

    try {
      const response = await fetch(`/api/packages/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadPackages()
        await loadStats()
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar paquete')
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      alert('Error al eliminar paquete')
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

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return 'badge-warning'
      case 1: return 'badge-success'
      case 2: return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  const filteredPackages = packages.filter(pkg => {
    const matchesSearch = pkg.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pkg.conductor.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesConductor = !filterConductor || pkg.conductor_id === filterConductor
    const matchesTipo = !filterTipo || pkg.tipo === filterTipo
    const matchesEstado = !filterEstado || pkg.estado.toString() === filterEstado
    return matchesSearch && matchesConductor && matchesTipo && matchesEstado
  })

  if (loading && packages.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 text-lg font-medium font-segoe">Cargando paquetes...</p>
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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Paquetes</h1>
              <p className="text-sm text-secondary-600 font-segoe">Gestión de paquetes Shein/Temu y Dropi</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Total</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.total_packages}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Entregados</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.entregados}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Pendientes</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.no_entregados}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Devueltos</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.devueltos}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.4s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Valor Dropi</p>
                <p className="text-lg font-bold text-secondary-900 font-montserrat">
                  ${stats.valor_total_dropi?.toLocaleString('es-CO') || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controles */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
              <input
                type="text"
                placeholder="Buscar por tracking o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-barulogix-modern focus-ring"
              />
              <select
                value={filterConductor}
                onChange={(e) => setFilterConductor(e.target.value)}
                className="input-barulogix-modern focus-ring"
              >
                <option value="">Todos los conductores</option>
                {conductors.filter(c => c.activo).map(conductor => (
                  <option key={conductor.id} value={conductor.id}>
                    {conductor.nombre} - {conductor.zona}
                  </option>
                ))}
              </select>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="input-barulogix-modern focus-ring"
              >
                <option value="">Todos los tipos</option>
                <option value="Shein/Temu">Shein/Temu</option>
                <option value="Dropi">Dropi</option>
              </select>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="input-barulogix-modern focus-ring"
              >
                <option value="">Todos los estados</option>
                <option value="0">No Entregado</option>
                <option value="1">Entregado</option>
                <option value="2">Devuelto</option>
              </select>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setEditingPackage(null)
                  setFormData({
                    tracking: '',
                    conductor_id: '',
                    tipo: 'Shein/Temu',
                    estado: 0,
                    fecha_entrega: new Date().toISOString().split('T')[0],
                    valor: ''
                  })
                  setShowModal(true)
                }}
                className="btn-primary hover-glow"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Agregar Paquete
              </button>
              <button
                onClick={() => {
                  setBulkData('')
                  setBulkConductor('')
                  setBulkType('shein_temu')
                  setShowBulkModal(true)
                }}
                className="btn-accent hover-glow"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Registro Masivo
              </button>
            </div>
          </div>
        </div>

        {/* Lista de Paquetes */}
        <div className="card-barulogix-lg animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            Lista de Paquetes ({filteredPackages.length})
          </h2>

          {filteredPackages.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
              </svg>
              <p className="text-secondary-600 text-lg font-segoe">No se encontraron paquetes</p>
              <p className="text-secondary-500 text-sm font-segoe mt-1">Agrega el primer paquete para comenzar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-barulogix">
                <thead>
                  <tr>
                    <th>Tracking</th>
                    <th>Conductor</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Fecha Entrega</th>
                    <th>Valor</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((pkg, index) => (
                    <tr key={pkg.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                      <td>
                        <div className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            pkg.tipo === 'Dropi' ? 'bg-blue-500' : 'bg-purple-500'
                          }`}></div>
                          <span className="font-medium text-secondary-900 font-mono text-sm">{pkg.tracking}</span>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p className="font-medium text-secondary-900 font-segoe">{pkg.conductor.nombre}</p>
                          <p className="text-xs text-secondary-500">{pkg.conductor.zona}</p>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          pkg.tipo === 'Dropi' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {pkg.tipo}
                        </span>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(pkg.estado)}`}>
                          {getEstadoText(pkg.estado)}
                        </span>
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')}
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {pkg.valor ? `$${pkg.valor.toLocaleString('es-CO')}` : '-'}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(pkg)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(pkg.id)}
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
          <div className="modal-content animate-scale-in max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900 font-montserrat">
                {editingPackage ? 'Editar Paquete' : 'Agregar Paquete'}
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
                <label className="label-barulogix">Tracking</label>
                <input
                  type="text"
                  required
                  value={formData.tracking}
                  onChange={(e) => setFormData({ ...formData, tracking: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                  placeholder="Número de tracking"
                />
              </div>

              <div>
                <label className="label-barulogix">Conductor</label>
                <select
                  required
                  value={formData.conductor_id}
                  onChange={(e) => setFormData({ ...formData, conductor_id: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Seleccionar conductor</option>
                  {conductors.filter(c => c.activo).map(conductor => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre} - {conductor.zona}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-barulogix">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'Shein/Temu' | 'Dropi' })}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value="Shein/Temu">Shein/Temu</option>
                    <option value="Dropi">Dropi</option>
                  </select>
                </div>

                <div>
                  <label className="label-barulogix">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: parseInt(e.target.value) })}
                    className="input-barulogix-modern focus-ring"
                  >
                    <option value={0}>No Entregado</option>
                    <option value={1}>Entregado</option>
                    <option value={2}>Devuelto</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-barulogix">Fecha de Entrega</label>
                <input
                  type="date"
                  required
                  value={formData.fecha_entrega}
                  onChange={(e) => setFormData({ ...formData, fecha_entrega: e.target.value })}
                  className="input-barulogix-modern focus-ring"
                />
              </div>

              {formData.tipo === 'Dropi' && (
                <div>
                  <label className="label-barulogix">Valor (COP)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.valor}
                    onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Valor en pesos colombianos"
                  />
                </div>
              )}

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
                  {loading ? 'Guardando...' : (editingPackage ? 'Actualizar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Registro Masivo */}
      {showBulkModal && (
        <div className="modal-overlay animate-fade-in">
          <div className="modal-content-lg animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-secondary-900 font-montserrat">
                Registro Masivo de Paquetes
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-secondary-400 hover:text-secondary-600 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="space-y-6">
              <div>
                <label className="label-barulogix">Tipo de Paquetes</label>
                <select
                  value={bulkType}
                  onChange={(e) => setBulkType(e.target.value as 'shein_temu' | 'dropi')}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="shein_temu">Shein/Temu</option>
                  <option value="dropi">Dropi</option>
                </select>
              </div>

              <div>
                <label className="label-barulogix">Conductor</label>
                <select
                  required
                  value={bulkConductor}
                  onChange={(e) => setBulkConductor(e.target.value)}
                  className="input-barulogix-modern focus-ring"
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
                <label className="label-barulogix">
                  {bulkType === 'shein_temu' ? 'Trackings (uno por línea)' : 'Trackings y Valores (separados por tab)'}
                </label>
                <textarea
                  required
                  value={bulkData}
                  onChange={(e) => setBulkData(e.target.value)}
                  className="input-barulogix-modern focus-ring min-h-[200px] font-mono text-sm"
                  placeholder={
                    bulkType === 'shein_temu' 
                      ? "Ejemplo:\nSH123456789\nSH987654321\nTE555666777"
                      : "Ejemplo (tracking TAB valor):\nDR123456789\t15000\nDR987654321\t25000\nDR555666777\t18500"
                  }
                />
                <p className="text-xs text-secondary-500 mt-2">
                  {bulkType === 'shein_temu' 
                    ? "Pegue una columna de trackings desde Excel, uno por línea"
                    : "Pegue dos columnas desde Excel: tracking y valor separados por tab"
                  }
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Instrucciones:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  {bulkType === 'shein_temu' ? (
                    <>
                      <li>• Seleccione la columna de trackings en Excel</li>
                      <li>• Copie (Ctrl+C) y pegue (Ctrl+V) en el área de texto</li>
                      <li>• Cada línea debe contener un tracking</li>
                    </>
                  ) : (
                    <>
                      <li>• Seleccione las columnas de tracking y valor en Excel</li>
                      <li>• Copie (Ctrl+C) y pegue (Ctrl+V) en el área de texto</li>
                      <li>• Cada línea debe tener: tracking TAB valor</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {bulkLoading ? 'Procesando...' : 'Procesar Paquetes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

