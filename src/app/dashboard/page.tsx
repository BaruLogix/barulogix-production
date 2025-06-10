'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface User {
  id: string
  email: string
  name: string
  role: string
  subscription: string
  is_active: boolean
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log('=== DASHBOARD CARGANDO ===')
    
    // Verificar autenticación
    const checkAuth = () => {
      try {
        console.log('Verificando localStorage...')
        
        const userData = localStorage.getItem('user')
        const sessionData = localStorage.getItem('session')
        
        console.log('userData en localStorage:', userData ? 'Existe' : 'No existe')
        console.log('sessionData en localStorage:', sessionData ? 'Existe' : 'No existe')
        
        if (!userData || !sessionData) {
          console.log('No hay datos de autenticación, redirigiendo al login...')
          router.push('/auth/login')
          return
        }

        const parsedUser = JSON.parse(userData)
        console.log('Usuario parseado:', parsedUser)
        
        setUser(parsedUser)
        setLoading(false)
        
        console.log('Dashboard cargado exitosamente para:', parsedUser.email)
        
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        localStorage.removeItem('user')
        localStorage.removeItem('session')
        router.push('/auth/login')
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    console.log('Cerrando sesión...')
    localStorage.removeItem('user')
    localStorage.removeItem('session')
    router.push('/auth/login')
  }

  const navigateTo = (path: string) => {
    router.push(path)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary-600 font-segoe">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-secondary-600 font-segoe">Redirigiendo al login...</p>
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
            {/* Logo y título */}
            <div className="flex items-center">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={60}
                height={60}
                className="mr-4"
              />
              <h1 className="text-3xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
            </div>

            {/* Usuario y logout */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-secondary-900 font-segoe">{user.name}</p>
                <p className="text-xs text-secondary-500 capitalize font-segoe">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn-danger"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
                className="opacity-20"
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
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Paquetes Activos</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">0</p>
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">0</p>
                </div>
              </div>
            </div>

            <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Entregados Hoy</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">0</p>
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Funciones principales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Funciones de Registro */}
            <div className="card-barulogix-lg animate-fade-in">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                <svg className="w-6 h-6 mr-3 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Funciones de Registro
              </h3>
              <div className="space-y-4">
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
                      <p className="text-sm text-secondary-600 font-segoe">Registrar entregas y asignar a conductores</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('/deliveries')}
                  className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-secondary-900 font-montserrat">Control de Entregas</p>
                      <p className="text-sm text-secondary-600 font-segoe">Marcar entregas y devoluciones</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Funciones de Análisis */}
            <div className="card-barulogix-lg animate-fade-in">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                <svg className="w-6 h-6 mr-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Funciones de Análisis
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
                      <p className="font-semibold text-secondary-900 font-montserrat">Buscar Paquetes</p>
                      <p className="text-sm text-secondary-600 font-segoe">Buscar por tracking y filtros avanzados</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('/reports')}
                  className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-secondary-900 font-montserrat">Generar Reportes</p>
                      <p className="text-sm text-secondary-600 font-segoe">Reportes detallados y exportación</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => navigateTo('/analytics')}
                  className="w-full p-4 border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all duration-200 text-left hover-lift"
                >
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="font-semibold text-secondary-900 font-montserrat">Análisis Avanzado</p>
                      <p className="text-sm text-secondary-600 font-segoe">Estadísticas y métricas de rendimiento</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Acceso rápido */}
          <div className="card-barulogix-lg animate-fade-in">
            <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
              <svg className="w-6 h-6 mr-3 text-accent-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Acceso Rápido
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => navigateTo('/packages/new')}
                className="btn-primary text-center py-4"
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Registrar Paquete
              </button>
              
              <button
                onClick={() => navigateTo('/search')}
                className="btn-secondary text-center py-4"
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar Paquete
              </button>
              
              <button
                onClick={() => navigateTo('/reports/new')}
                className="btn-accent text-center py-4"
              >
                <svg className="w-6 h-6 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Generar Reporte
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

