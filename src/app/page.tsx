'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si el usuario ya está logueado
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user')
        const sessionData = localStorage.getItem('session')
        
        if (userData && sessionData) {
          // Usuario ya logueado, redirigir al dashboard
          router.push('/dashboard')
          return
        }
        
        setLoading(false)
      } catch (error) {
        console.error('Error checking auth:', error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-barulogix flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg font-medium">Cargando BaruLogix...</p>
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
              className="mr-3"
            />
            <div className="flex items-baseline">
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix</h1>
              <p className="text-xs text-gray-500 ml-2">By BaruCourier S.A.S</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/auth/login')}
              className="btn-secondary btn-sm"
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => router.push('/auth/register')}
              className="btn-primary btn-sm"
            >
              Registrarse
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-8 animate-fade-in">
              <Image
                src="/emblema-barulogix.png"
                alt="Emblema BaruLogix"
                width={120}
                height={120}
                className="mx-auto mb-6 animate-float"
              />
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-secondary-900 mb-6 font-montserrat animate-slide-up">
              Gestiona tus entregas con
              <span className="text-gradient block mt-2">BaruLogix</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-secondary-600 mb-8 max-w-3xl mx-auto font-segoe animate-slide-up" style={{animationDelay: '0.2s'}}>
              La plataforma web profesional para pequeñas empresas de distribución. 
              Controla tus paquetes Shein/Temu y Dropi, genera reportes detallados y optimiza tu operación logística.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up" style={{animationDelay: '0.4s'}}>
              <button
                onClick={() => router.push('/auth/login')}
                className="btn-primary btn-lg hover-glow"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Comenzar Gratis
              </button>
              <button
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="btn-secondary btn-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Ver Características
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Características Principales */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4 font-montserrat">
              Características Principales
            </h2>
            <p className="text-xl text-secondary-600 max-w-2xl mx-auto font-segoe">
              Todo lo que necesitas para gestionar tu empresa de distribución de manera profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Gestión de Paquetes */}
            <div className="card-barulogix-modern hover-lift animate-slide-up">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Gestión de Paquetes</h3>
              <p className="text-secondary-600 font-segoe">
                Registra y controla paquetes Shein/Temu y Dropi. Seguimiento de estados: no entregado, entregado, devuelto.
              </p>
            </div>

            {/* Conductores por Zonas */}
            <div className="card-barulogix-modern hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Conductores por Zonas</h3>
              <p className="text-secondary-600 font-segoe">
                Organiza tu equipo de conductores por zonas geográficas. Asignación automática y seguimiento de rendimiento.
              </p>
            </div>

            {/* Reportes Detallados */}
            <div className="card-barulogix-modern hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Reportes Detallados</h3>
              <p className="text-secondary-600 font-segoe">
                Genera reportes generales y específicos por conductor. Exporta datos en JSON y CSV para análisis externos.
              </p>
            </div>

            {/* Búsqueda Avanzada */}
            <div className="card-barulogix-modern hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Búsqueda Avanzada</h3>
              <p className="text-secondary-600 font-segoe">
                Encuentra paquetes por tracking, conductor, zona, tipo, estado y rangos de fechas. Filtros inteligentes.
              </p>
            </div>

            {/* Control de Valores */}
            <div className="card-barulogix-modern hover-lift animate-slide-up" style={{animationDelay: '0.4s'}}>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Control de Valores</h3>
              <p className="text-secondary-600 font-segoe">
                Gestiona valores monetarios de paquetes Dropi. Cálculos automáticos de totales entregados y pendientes.
              </p>
            </div>

            {/* Análisis de Atrasos */}
            <div className="card-barulogix-modern hover-lift animate-slide-up" style={{animationDelay: '0.5s'}}>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-secondary-900 mb-3 font-montserrat">Análisis de Atrasos</h3>
              <p className="text-secondary-600 font-segoe">
                Cálculo automático de días de atraso para paquetes no entregados. Alertas y seguimiento de rendimiento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-barulogix">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 font-montserrat">
            ¿Listo para optimizar tu operación logística?
          </h2>
          <p className="text-xl text-blue-100 mb-8 font-segoe">
            Únete a las empresas que ya confían en BaruLogix para gestionar sus entregas de manera profesional.
          </p>
          <button
            onClick={() => router.push('/auth/register')}
            className="btn-accent btn-lg hover-glow"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Crear Cuenta Gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={40}
                height={40}
                className="mr-3"
              />
              <div>
                <div className="flex items-baseline">
                  <h3 className="text-xl font-bold font-montserrat">BaruLogix</h3>
                  <p className="text-gray-500 text-xs ml-2">By BaruCourier S.A.S</p>
                </div>
                <p className="text-gray-400 text-sm font-segoe">Gestión logística profesional</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm font-segoe">
                © 2025 BaruLogix. Todos los derechos reservados.
              </p>
              <p className="text-gray-500 text-xs mt-1 font-segoe">
                Plataforma diseñada para pequeñas empresas de distribución
              </p>
              <div className="flex items-center justify-end mt-3">
                <p className="text-gray-400 text-xs font-segoe mr-2">
                  Programa desarrollado por: ScibaruAI
                </p>
                <Image
                  src="/logo-scibaru.png"
                  alt="ScibaruAI"
                  width={24}
                  height={24}
                  className="opacity-70"
                />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

