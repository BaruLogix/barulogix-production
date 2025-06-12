'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Guardar datos de usuario y sesión
        if (!data.session || !data.session.access_token) {
          setError('Error de autenticación: No se recibió un token válido')
          return
        }
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('session', JSON.stringify(data.session))
        
        // Redirigir al dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('Error during login:', error)
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={80}
                height={80}
                className="animate-scale-in"
              />
              <div className="absolute inset-0 bg-gradient-barulogix opacity-20 rounded-full animate-pulse-slow"></div>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-secondary-900 font-montserrat animate-fade-in">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-secondary-600 font-segoe animate-fade-in" style={{animationDelay: '0.1s'}}>
            Accede a tu plataforma de gestión logística
          </p>
        </div>

        {/* Formulario */}
        <div className="card-barulogix-modern animate-slide-up" style={{animationDelay: '0.2s'}}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 animate-slide-down">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700 font-segoe">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="label-barulogix">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-barulogix-modern focus-ring"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="password" className="label-barulogix">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-barulogix-modern focus-ring"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-secondary-700 font-segoe">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="loading-spinner w-5 h-5 border-2 border-white border-t-transparent mr-2"></div>
                    Iniciando sesión...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Iniciar Sesión
                  </div>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-secondary-600 font-segoe">
                ¿No tienes una cuenta?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/register')}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center animate-fade-in" style={{animationDelay: '0.5s'}}>
          <p className="text-xs text-secondary-500 font-segoe">
            © 2025 BaruLogix. Plataforma de gestión logística profesional.
          </p>
        </div>
      </div>
    </div>
  )
}

