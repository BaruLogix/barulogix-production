'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Verificar si ya hay usuario logueado
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (userData && sessionData) {
      router.push('/dashboard')
    }
  }, [router])

  const doLogin = async () => {
    if (!email || !password) {
      setError('Por favor ingresa email y contraseña')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        // Guardar datos en localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('session', JSON.stringify(data.session))
        
        // Redirección exitosa
        router.push('/dashboard')
      } else {
        setError(data.error || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('Error en login:', error)
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logo-oficial-transparente.png"
              alt="BaruLogix"
              width={80}
              height={80}
              className="hover-lift"
            />
          </div>
          <h2 className="text-3xl font-bold text-secondary-900 font-montserrat">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-secondary-600 font-segoe">
            Accede a tu cuenta de BaruLogix
          </p>
        </div>

        {/* Formulario */}
        <div className="card-barulogix">
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-segoe">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 font-segoe mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-barulogix"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 font-segoe mb-2">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-barulogix"
                placeholder="••••••••"
                onKeyPress={(e) => e.key === 'Enter' && doLogin()}
              />
            </div>

            <div>
              <button
                type="button"
                onClick={doLogin}
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center"
              >
                {loading ? (
                  <>
                    <div className="loading-spinner mr-2"></div>
                    Iniciando sesión...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Iniciar Sesión
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-secondary-600 font-segoe">
                ¿No tienes cuenta?{' '}
                <button
                  onClick={() => router.push('/auth/register')}
                  className="font-medium text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Regístrate aquí
                </button>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-secondary-500 font-segoe">
            © 2025 BaruLogix. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

