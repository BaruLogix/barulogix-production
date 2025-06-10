'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  banned: boolean
  user_metadata: any
  app_metadata: any
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    banned: 0,
    confirmed: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAdminAuth()
    loadUsers()
  }, [])

  const checkAdminAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }

    // Verificar si es admin
    const user = JSON.parse(userData)
    if (user.email !== 'barulogix.platform@gmail.com') {
      alert('Acceso denegado - Solo administradores')
      router.push('/dashboard')
      return
    }
  }

  const loadUsers = async () => {
    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}')
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setStats(data.stats || { total: 0, active: 0, banned: 0, confirmed: 0 })
      } else {
        const error = await response.json()
        alert(error.error || 'Error al cargar usuarios')
      }
    } catch (error) {
      console.error('Error loading users:', error)
      alert('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async (userId: string, currentlyBanned: boolean) => {
    const action = currentlyBanned ? 'unban' : 'ban'
    const confirmMessage = currentlyBanned 
      ? '¿Está seguro de desbanear este usuario?' 
      : '¿Está seguro de banear este usuario?'

    if (!confirm(confirmMessage)) return

    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ action })
      })

      if (response.ok) {
        await loadUsers()
        const result = await response.json()
        alert(result.message)
      } else {
        const error = await response.json()
        alert(error.error || 'Error al actualizar usuario')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error al actualizar usuario')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Está seguro de ELIMINAR PERMANENTEMENTE este usuario? Esta acción no se puede deshacer.')) return

    try {
      const session = JSON.parse(localStorage.getItem('session') || '{}')
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        await loadUsers()
        alert('Usuario eliminado exitosamente')
      } else {
        const error = await response.json()
        alert(error.error || 'Error al eliminar usuario')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error al eliminar usuario')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && !user.banned) ||
      (filterStatus === 'banned' && user.banned) ||
      (filterStatus === 'confirmed' && user.email_confirmed_at) ||
      (filterStatus === 'unconfirmed' && !user.email_confirmed_at)
    
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('es-CO')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600 font-segoe">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={40}
                height={40}
                className="mr-3"
              />
              <div>
                <h1 className="text-xl font-bold text-secondary-900 font-montserrat">Panel de Administración</h1>
                <p className="text-sm text-secondary-600 font-segoe">Gestión de Usuarios</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Total Usuarios</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.total}</p>
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
                <p className="text-xs font-medium text-secondary-600 font-segoe">Activos</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Baneados</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.banned}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-secondary-600 font-segoe">Confirmados</p>
                <p className="text-2xl font-bold text-secondary-900 font-montserrat">{stats.confirmed}</p>
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
                  placeholder="Buscar por email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activos</option>
                  <option value="banned">Baneados</option>
                  <option value="confirmed">Confirmados</option>
                  <option value="unconfirmed">Sin confirmar</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="card-barulogix-lg animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            Lista de Usuarios ({filteredUsers.length})
          </h2>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              <p className="text-secondary-600 text-lg font-segoe">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-barulogix">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Estado</th>
                    <th>Fecha Registro</th>
                    <th>Último Login</th>
                    <th>Confirmado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <tr key={user.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                      <td>
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                            <span className="text-primary-600 font-semibold text-sm">
                              {user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-secondary-900 font-segoe">{user.email}</span>
                            {user.email === 'barulogix.platform@gmail.com' && (
                              <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          user.banned 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-2 ${user.banned ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          {user.banned ? 'Baneado' : 'Activo'}
                        </span>
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="text-secondary-600 font-segoe text-sm">
                        {formatDate(user.last_sign_in_at)}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          user.email_confirmed_at 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {user.email_confirmed_at ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td>
                        {user.email !== 'barulogix.platform@gmail.com' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleBanUser(user.id, user.banned)}
                              className={`p-2 rounded-lg transition-colors duration-200 ${
                                user.banned
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-yellow-600 hover:bg-yellow-50'
                              }`}
                              title={user.banned ? 'Desbanear' : 'Banear'}
                            >
                              {user.banned ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                              title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

