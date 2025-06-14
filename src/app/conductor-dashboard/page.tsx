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
}

export default function ConductorDashboard() {
  const router = useRouter()
  const [conductorId, setConductorId] = useState('')
  const [conductor, setConductor] = useState<Conductor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!conductorId.trim()) {
      setError('Por favor, ingresa tu ID de conductor')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/conductor/${conductorId}`)
      
      if (response.ok) {
        const data = await response.json()
        setConductor(data.conductor)
        setIsLoggedIn(true)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'ID de conductor no encontrado')
      }
    } catch (error) {
      console.error('Error al buscar conductor:', error)
      setError('Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setConductor(null)
    setIsLoggedIn(false)
    setConductorId('')
    setError('')
  }

  if (!isLoggedIn) {
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
                <p className="text-sm text-secondary-600 font-segoe">Dashboard de Conductor</p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="max-w-md w-full">
            <div className="card-barulogix-lg text-center">
              <div className="mb-8">
                <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-secondary-900 font-montserrat mb-2">
                  Bienvenido a BaruLogix
                </h2>
                <p className="text-secondary-600 font-segoe">
                  Ingresa tu ID de conductor para acceder a tu dashboard
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="conductorId" className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                    ID de Conductor
                  </label>
                  <input
                    type="text"
                    id="conductorId"
                    value={conductorId}
                    onChange={(e) => setConductorId(e.target.value)}
                    className="input-barulogix-modern focus-ring"
                    placeholder="Ingresa tu ID único de conductor"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm text-red-800 font-segoe">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary btn-lg w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Verificando...
                    </div>
                  ) : (
                    'Acceder al Dashboard'
                  )}
                </button>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-sm text-secondary-500 font-segoe">
              <p>© 2025 BaruLogix</p>
              <p className="mt-1">BaruLogix By BaruCourier S.A.S</p>
              <div className="flex items-center justify-center mt-2">
                <span>Plataforma creada por:</span>
                <div className="flex items-center ml-2">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-1">
                    <span className="text-white text-xs font-bold">S</span>
                  </div>
                  <span className="font-medium">ScibaruAI</span>
                </div>
              </div>
            </div>
          </div>
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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
              <p className="text-sm text-secondary-600 font-segoe">Dashboard de Conductor</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-secondary-800 font-segoe">{conductor?.nombre}</p>
              <p className="text-xs text-secondary-600 font-segoe">ID: {conductor?.id}</p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary btn-sm"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bienvenida */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xl font-bold text-primary-600 font-montserrat">
                  {conductor?.nombre.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-secondary-900 font-montserrat">
                ¡Bienvenido, {conductor?.nombre}!
              </h2>
              <p className="text-secondary-600 font-segoe">
                Zona de trabajo: <span className="font-medium">{conductor?.zona}</span>
              </p>
              <p className="text-sm text-secondary-500 font-segoe">
                Conductor desde: {conductor?.created_at ? new Date(conductor.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas del conductor */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Entregas Completadas</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">47</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Entregas Pendientes</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">12</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Calificación Promedio</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">4.8</p>
              </div>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600 font-segoe">Ganancias del Mes</p>
                <p className="text-3xl font-bold text-secondary-900 font-montserrat">$2.4M</p>
              </div>
            </div>
          </div>
        </div>

        {/* Funcionalidades principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <div className="text-center p-6">
              <div className="mx-auto h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-2">
                Mis Entregas
              </h3>
              <p className="text-sm text-secondary-600 font-segoe mb-4">
                Ver y gestionar tus entregas asignadas
              </p>
              <button className="btn-primary btn-sm w-full">
                Ver Entregas
              </button>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="text-center p-6">
              <div className="mx-auto h-12 w-12 bg-accent-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-2">
                Historial
              </h3>
              <p className="text-sm text-secondary-600 font-segoe mb-4">
                Consulta tu historial de entregas completadas
              </p>
              <button className="btn-secondary btn-sm w-full">
                Ver Historial
              </button>
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
            <div className="text-center p-6">
              <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-2">
                Mi Perfil
              </h3>
              <p className="text-sm text-secondary-600 font-segoe mb-4">
                Actualiza tu información personal
              </p>
              <button className="btn-secondary btn-sm w-full">
                Editar Perfil
              </button>
            </div>
          </div>
        </div>

        {/* Información del conductor */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card-barulogix hover-lift animate-slide-up">
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Información Personal
            </h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-secondary-700 font-segoe">{conductor?.nombre}</span>
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-secondary-700 font-segoe">{conductor?.zona}</span>
              </div>
              {conductor?.telefono && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-secondary-700 font-segoe">{conductor.telefono}</span>
                </div>
              )}
              {conductor?.email && (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-3 text-secondary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-secondary-700 font-segoe">{conductor.email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
            <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-4">
              Estado del Conductor
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">Estado:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  conductor?.activo 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {conductor?.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">ID Único:</span>
                <code className="text-xs bg-secondary-100 px-2 py-1 rounded font-mono">
                  {conductor?.id}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">Última Entrega:</span>
                <span className="text-sm text-secondary-600 font-segoe">Hace 2 horas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-secondary-700 font-segoe">Próxima Entrega:</span>
                <span className="text-sm text-secondary-600 font-segoe">En 30 min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Entregas recientes */}
        <div className="card-barulogix-lg animate-fade-in">
          <h3 className="text-lg font-semibold text-secondary-900 font-montserrat mb-6">
            Entregas Recientes
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-secondary-900 font-segoe">Entrega #2024-001</p>
                  <p className="text-sm text-secondary-600 font-segoe">Calle 72 #10-34, Barranquilla</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Completada
                </span>
                <p className="text-sm text-secondary-500 font-segoe mt-1">Hace 2 horas</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-secondary-900 font-segoe">Entrega #2024-002</p>
                  <p className="text-sm text-secondary-600 font-segoe">Carrera 53 #84-15, Barranquilla</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  En Progreso
                </span>
                <p className="text-sm text-secondary-500 font-segoe mt-1">Estimado: 30 min</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-secondary-900 font-segoe">Entrega #2024-003</p>
                  <p className="text-sm text-secondary-600 font-segoe">Avenida Murillo #45-67, Barranquilla</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pendiente
                </span>
                <p className="text-sm text-secondary-500 font-segoe mt-1">Programada: 14:30</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-secondary-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-secondary-500 font-segoe">
            <p>© 2025 BaruLogix</p>
            <p className="mt-1">BaruLogix By BaruCourier S.A.S</p>
            <div className="flex items-center justify-center mt-2">
              <span>Plataforma creada por:</span>
              <div className="flex items-center ml-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-1">
                  <span className="text-white text-xs font-bold">S</span>
                </div>
                <span className="font-medium">ScibaruAI</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

