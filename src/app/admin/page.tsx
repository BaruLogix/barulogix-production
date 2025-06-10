'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  isActive: boolean
  subscription: 'basic' | 'premium' | 'enterprise'
  company?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    initializeAdmin()
  }, [])

  const initializeAdmin = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const supabase = createClient()
      
      // Verificar autenticación
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        router.push('/auth/login')
        return
      }

      // Obtener perfil del usuario actual
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        setError('Error al cargar perfil de usuario')
        return
      }

      // Verificar que sea administrador
      if (profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setCurrentUser({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        isActive: profile.is_active,
        subscription: profile.subscription,
        company: profile.company,
        phone: profile.phone,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      })

      // Cargar todos los usuarios
      await loadAllUsers(supabase)

    } catch (error) {
      console.error('Admin initialization error:', error)
      setError('Error al inicializar panel de administración')
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async (supabase: any) => {
    try {
      const { data: allUsers, error: usersError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) {
        console.error('Users error:', usersError)
        return
      }

      const formattedUsers = allUsers?.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.is_active,
        subscription: user.subscription,
        company: user.company,
        phone: user.phone,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })) || []

      setUsers(formattedUsers)

    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user status:', error)
        alert('Error al actualizar estado del usuario')
        return
      }

      // Recargar usuarios
      await loadAllUsers(supabase)
      alert('Estado del usuario actualizado exitosamente')

    } catch (error) {
      console.error('Error toggling user status:', error)
      alert('Error al cambiar estado del usuario')
    }
  }

  const changeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) {
        console.error('Error updating user role:', error)
        alert('Error al actualizar rol del usuario')
        return
      }

      // Recargar usuarios
      await loadAllUsers(supabase)
      alert('Rol del usuario actualizado exitosamente')

    } catch (error) {
      console.error('Error changing user role:', error)
      alert('Error al cambiar rol del usuario')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Cargando panel de administración...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">❌ {error}</div>
          <button
            onClick={initializeAdmin}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">👑 Panel de Administración</h1>
              <p className="text-sm text-gray-600">Gestión de usuarios y sistema</p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Volver al Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👥</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Usuarios
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.length}
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
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">✅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Usuarios Activos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.isActive).length}
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
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-bold">👑</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Administradores
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {users.filter(u => u.role === 'admin').length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Gestión de Usuarios
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Lista de todos los usuarios registrados en el sistema
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Suscripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Registro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => changeUserRole(user.id, e.target.value as 'admin' | 'user')}
                          className="text-sm border rounded px-2 py-1"
                          disabled={user.id === currentUser?.id}
                        >
                          <option value="user">👤 Usuario</option>
                          <option value="admin">👑 Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          disabled={user.id === currentUser?.id}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          } ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
                        >
                          {user.isActive ? '✅ Activo' : '❌ Inactivo'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.subscription === 'enterprise' ? 'bg-purple-100 text-purple-800' :
                          user.subscription === 'premium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.subscription}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {user.id === currentUser?.id ? (
                          <span className="text-gray-400">Tú mismo</span>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => toggleUserStatus(user.id, user.isActive)}
                              className={`${
                                user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'
                              }`}
                            >
                              {user.isActive ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

