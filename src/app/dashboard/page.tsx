'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
  id: string
  email: string
  name: string
  role: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total_packages: 0,
    conductors: 0,
    delivered_today: 0,
    reports: 0
  })
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadStats()
  }, [])

  const checkAuth = () => {
    try {
      const userData = localStorage.getItem('user')
      const sessionData = localStorage.getItem('session')
      
      if (!userData || !sessionData) {
        router.push('/auth/login')
        return
      }

      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setLoading(false)
    } catch (error) {
      console.error('Error al verificar autenticación:', error)
      router.push('/auth/login')
    }
  }

  const loadStats = async () => {
    try {
      // Cargar estadísticas de paquetes
      const packagesRes = await fetch('/api/packages/stats')
      if (packagesRes.ok) {
        const packagesData = await packagesRes.json()
        setStats(prev => ({
          ...prev,
          total_packages: packagesData.stats?.total_packages || 0,
          delivered_today: packagesData.stats?.entregados || 0
        }))
      }

      // Cargar estadísticas de conductores
      const conductorsRes = await fetch('/api/conductors')
      if (conductorsRes.ok) {
        const conductorsData = await conductorsRes.json()
        setStats(prev => ({
          ...prev,
          conductors: conductorsData.conductors?.length || 0
        }))
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    router.push('/auth/login')
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 text-lg font-medium font-segoe">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
              <p className="text-sm text-secondary-600 font-segoe">Panel de Control</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-900 font-segoe">{user.name}</p>
              <p className="text-xs text-secondary-500 capitalize font-segoe">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-danger btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Bienvenida */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-secondary-900 mb-2 font-montserrat">
                ¡Bienvenido, {user.name}!
              </h2>
              <p className="text-lg text-secondary-600 font-segoe">
                Gestiona tu plataforma logística desde este panel de control.
              </p>
            </div>
            <Image
              src="/emblema-barulogix.png"
              alt="Emblema BaruLogix"
              width={80}
              height={80}
              className="opacity-20 animate-float"
            />
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary-100 text-primary-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Paquetes Totales</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.total_packages}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-accent-100 text-accent-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Conductores</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.conductors}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Entregados</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.delivered_today}</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Reportes</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">{stats.reports}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Funciones principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Funciones de Gestión */}
          <div className="card-barulogix-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
              <svg className="w-6 h-6 mr-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Gestión Principal
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => navigateTo('/packages')}
                className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-primary-100 rounded-lg">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-secondary-900 font-montserrat">Gestionar Paquetes</p>
                    <p className="text-sm text-secondary-600 font-segoe">Registrar y administrar paquetes Shein/Temu y Dropi</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigateTo('/conductors')}
                className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-accent-100 rounded-lg">
                    <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-secondary-900 font-montserrat">Gestionar Conductores</p>
                    <p className="text-sm text-secondary-600 font-segoe">Registrar y administrar conductores por zonas</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Funciones de Análisis */}
          <div className="card-barulogix-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
              <svg className="w-6 h-6 mr-3 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Análisis y Reportes
            </h3>
            <div className="space-y-4">
              <button
                onClick={() => navigateTo('/search')}
                className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-secondary-900 font-montserrat">Búsqueda Avanzada</p>
                    <p className="text-sm text-secondary-600 font-segoe">Buscar paquetes por múltiples criterios</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigateTo('/conductor-analysis')}
                className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-secondary-900 font-montserrat">Análisis por Conductor</p>
                    <p className="text-sm text-secondary-600 font-segoe">Estadísticas detalladas por conductor</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => navigateTo('/reports')}
                className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
              >
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="font-semibold text-secondary-900 font-montserrat">Reportes y Exportación</p>
                    <p className="text-sm text-secondary-600 font-segoe">Generar reportes y exportar datos</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="card-barulogix-lg animate-fade-in">
          <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
            <svg className="w-6 h-6 mr-3 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Acciones Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigateTo('/packages')}
              className="btn-primary hover-glow"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Registrar Paquete
            </button>
            <button
              onClick={() => navigateTo('/conductors')}
              className="btn-accent hover-glow"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Agregar Conductor
            </button>
            <button
              onClick={() => navigateTo('/reports')}
              className="btn-secondary hover-lift"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Reporte
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

