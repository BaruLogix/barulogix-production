'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar si hay usuario logueado
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user')
        const sessionData = localStorage.getItem('session')
        
        if (userData && sessionData) {
          // Si hay usuario logueado, redirigir al dashboard
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
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mx-auto mb-4"></div>
          <p className="text-secondary-600 font-segoe">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-secondary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
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
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/auth/login')}
                className="btn-secondary"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="btn-primary"
              >
                Registrarse
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Contenido */}
            <div className="animate-fade-in">
              <h2 className="text-5xl lg:text-6xl font-bold text-secondary-900 mb-6 font-montserrat leading-tight">
                Gestiona tus entregas con
                <span className="text-primary-500 block">BaruLogix</span>
              </h2>
              <p className="text-xl text-secondary-600 mb-8 font-segoe leading-relaxed">
                La plataforma web profesional para pequeñas empresas de distribución. 
                Controla tus paquetes Shein/Temu y Dropi, genera reportes detallados y 
                optimiza tu operación logística.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => router.push('/auth/register')}
                  className="btn-primary text-lg px-8 py-4 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Comenzar Gratis
                </button>
                <button
                  onClick={() => document.getElementById('caracteristicas')?.scrollIntoView({ behavior: 'smooth' })}
                  className="btn-secondary text-lg px-8 py-4 flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Características
                </button>
              </div>
            </div>

            {/* Imagen/Logo */}
            <div className="flex justify-center lg:justify-end animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-500 rounded-full opacity-20 blur-3xl transform scale-150"></div>
                <Image
                  src="/emblema-barulogix.png"
                  alt="Emblema BaruLogix"
                  width={400}
                  height={400}
                  className="relative z-10 hover-lift"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Características Principales */}
      <section id="caracteristicas" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-secondary-900 mb-4 font-montserrat">
              Características Principales
            </h3>
            <p className="text-xl text-secondary-600 font-segoe max-w-3xl mx-auto">
              Todo lo que necesitas para gestionar tu empresa de distribución de manera profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Gestión de Paquetes */}
            <div className="card-barulogix hover-lift animate-slide-up text-center">
              <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Gestión de Paquetes</h4>
              <p className="text-secondary-600 font-segoe">
                Registra y controla paquetes Shein/Temu y Dropi. Seguimiento de estados: no entregado, entregado, devuelto.
              </p>
            </div>

            {/* Control de Conductores */}
            <div className="card-barulogix hover-lift animate-slide-up text-center" style={{animationDelay: '0.1s'}}>
              <div className="p-4 bg-accent-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Control de Conductores</h4>
              <p className="text-secondary-600 font-segoe">
                Administra tu equipo de conductores, asigna entregas y monitorea el rendimiento individual.
              </p>
            </div>

            {/* Reportes Detallados */}
            <div className="card-barulogix hover-lift animate-slide-up text-center" style={{animationDelay: '0.2s'}}>
              <div className="p-4 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Reportes Detallados</h4>
              <p className="text-secondary-600 font-segoe">
                Genera reportes completos por conductor, fecha y tipo. Exporta en PDF y Excel para análisis.
              </p>
            </div>

            {/* Búsqueda Avanzada */}
            <div className="card-barulogix hover-lift animate-slide-up text-center" style={{animationDelay: '0.3s'}}>
              <div className="p-4 bg-blue-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Búsqueda Avanzada</h4>
              <p className="text-secondary-600 font-segoe">
                Encuentra paquetes rápidamente por tracking, conductor, fecha o estado con filtros inteligentes.
              </p>
            </div>

            {/* Análisis de Rendimiento */}
            <div className="card-barulogix hover-lift animate-slide-up text-center" style={{animationDelay: '0.4s'}}>
              <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Análisis de Rendimiento</h4>
              <p className="text-secondary-600 font-segoe">
                Estadísticas detalladas de entregas, eficiencia por conductor y métricas de rendimiento.
              </p>
            </div>

            {/* Seguridad y Respaldos */}
            <div className="card-barulogix hover-lift animate-slide-up text-center" style={{animationDelay: '0.5s'}}>
              <div className="p-4 bg-yellow-100 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-xl font-bold text-secondary-900 mb-4 font-montserrat">Seguridad y Respaldos</h4>
              <p className="text-secondary-600 font-segoe">
                Tus datos están seguros con encriptación avanzada y respaldos automáticos en la nube.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-barulogix">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-4xl font-bold text-white mb-6 font-montserrat">
            ¿Listo para optimizar tu logística?
          </h3>
          <p className="text-xl text-primary-100 mb-8 font-segoe">
            Únete a las empresas que ya confían en BaruLogix para gestionar sus entregas de manera profesional.
          </p>
          <button
            onClick={() => router.push('/auth/register')}
            className="bg-white text-primary-600 hover:bg-primary-50 font-bold py-4 px-8 rounded-lg transition-colors duration-200 text-lg shadow-lg"
          >
            Comenzar Ahora - Es Gratis
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-secondary-800 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/emblema-barulogix.png"
                  alt="BaruLogix"
                  width={40}
                  height={40}
                  className="mr-3"
                />
                <h4 className="text-xl font-bold font-montserrat">BaruLogix</h4>
              </div>
              <p className="text-secondary-300 font-segoe">
                La plataforma logística profesional para pequeñas empresas de distribución.
              </p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4 font-montserrat">Funciones</h5>
              <ul className="space-y-2 text-secondary-300 font-segoe">
                <li>Gestión de Paquetes</li>
                <li>Control de Conductores</li>
                <li>Reportes Detallados</li>
                <li>Análisis de Rendimiento</li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4 font-montserrat">Soporte</h5>
              <ul className="space-y-2 text-secondary-300 font-segoe">
                <li>barulogix.platform@gmail.com</li>
                <li>Documentación</li>
                <li>Actualizaciones</li>
                <li>Soporte Técnico</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-secondary-700 mt-8 pt-8 text-center">
            <p className="text-secondary-400 font-segoe">
              © 2025 BaruLogix. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

