'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalDeliveries: 0,
    pendingDeliveries: 0,
    activeConductors: 0,
    totalCustomers: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar autenticación
    const userData = localStorage.getItem('user')
    if (!userData) {
      router.push('/auth/login')
      return
    }

    const parsedUser = JSON.parse(userData)
    setUser(parsedUser)
    
    // Cargar estadísticas (simuladas por ahora)
    setTimeout(() => {
      setStats({
        totalDeliveries: 156,
        pendingDeliveries: 23,
        activeConductors: 8,
        totalCustomers: 45
      })
      setLoading(false)
    }, 1000)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('user')
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  const menuItems = [
    {
      title: 'Entregas',
      description: 'Gestionar entregas y seguimiento',
      icon: '📦',
      href: '/deliveries',
      color: 'bg-blue-500',
      stats: `${stats.pendingDeliveries} pendientes`
    },
    {
      title: 'Conductores',
      description: 'Administrar equipo de conductores',
      icon: '🚛',
      href: '/conductors',
      color: 'bg-green-500',
      stats: `${stats.activeConductors} activos`
    },
    {
      title: 'Clientes',
      description: 'Base de datos de clientes',
      icon: '👥',
      href: '/customers',
      color: 'bg-purple-500',
      stats: `${stats.totalCustomers} registrados`
    },
    {
      title: 'Reportes',
      description: 'Análisis y estadísticas',
      icon: '📊',
      href: '/reports',
      color: 'bg-orange-500',
      stats: 'Ver análisis'
    },
    {
      title: 'Rutas',
      description: 'Planificación de rutas',
      icon: '🗺️',
      href: '/routes',
      color: 'bg-indigo-500',
      stats: 'Optimizar rutas'
    },
    {
      title: 'Vehículos',
      description: 'Gestión de flota',
      icon: '🚐',
      href: '/vehicles',
      color: 'bg-red-500',
      stats: 'Gestionar flota'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo y título */}
            <div className="flex items-center space-x-4">
              <Image
                src="/logo-oficial.png"
                alt="BaruLogix"
                width={120}
                height={120}
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">Panel de control principal</p>
              </div>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'Usuario'}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            ¡Bienvenido a BaruLogix! 👋
          </h2>
          <p className="text-lg text-gray-600">
            Tu plataforma completa de gestión logística
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">📦</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Entregas</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <span className="text-yellow-600 font-bold">⏳</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingDeliveries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">🚛</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Conductores</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeConductors}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menú principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="group bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {item.stats}
                    </span>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4">
                  {item.description}
                </p>
                
                <div className="flex items-center text-blue-600 text-sm font-medium">
                  <span>Acceder</span>
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🚀 Acciones Rápidas</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              ➕ Nueva Entrega
            </button>
            <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              👤 Agregar Conductor
            </button>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-3 rounded-lg font-medium transition-colors">
              🏢 Nuevo Cliente
            </button>
          </div>
        </div>

        {/* Footer con logo */}
        <div className="mt-12 text-center">
          <div className="flex justify-center items-center space-x-2 text-gray-500">
            <Image
              src="/logo-oficial.png"
              alt="BaruLogix"
              width={24}
              height={24}
              className="h-6 w-auto opacity-50"
            />
            <span className="text-sm">Powered by BaruLogix © 2025</span>
          </div>
        </div>
      </main>
    </div>
  )
}

