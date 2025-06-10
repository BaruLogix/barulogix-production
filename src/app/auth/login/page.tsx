'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showResendButton, setShowResendButton] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== INICIO LOGIN FRONTEND ===')
    console.log('Email:', email)
    console.log('Password length:', password.length)
    
    setLoading(true)
    setError('')
    setShowResendButton(false)

    try {
      console.log('Enviando request a /api/auth/login...')
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)

      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        console.error('Error en response:', data)
        
        if (data.error === 'email_not_verified') {
          setError(data.message)
          setShowResendButton(true)
          console.log('Email no verificado, mostrando botón de reenvío')
        } else {
          setError(data.error || 'Error al iniciar sesión')
        }
        return
      }

      if (data.success && data.user) {
        console.log('Login exitoso, usuario:', data.user)
        console.log('Guardando datos en localStorage...')
        
        // Guardar datos del usuario en localStorage
        localStorage.setItem('user', JSON.stringify(data.user))
        localStorage.setItem('session', JSON.stringify(data.session))
        
        console.log('Datos guardados, redirigiendo al dashboard...')
        
        // Redireccionar al dashboard
        // Redireccionar al dashboard usando window.location.href (más confiable)
        console.log('Redirigiendo al dashboard con window.location.href...')
        window.location.href = 'src/app/dashboard'


        
        console.log('Redirección iniciada')
      } else {
        console.error('Respuesta exitosa pero sin datos de usuario:', data)
        setError('Error en la respuesta del servidor')
      }

    } catch (error) {
      console.error('Error en fetch:', error)
      setError('Error de conexión. Por favor, intenta nuevamente.')
    } finally {
      setLoading(false)
      console.log('=== FIN LOGIN FRONTEND ===')
    }
  }

  const handleResendVerification = async () => {
    console.log('Reenviando email de verificación para:', email)
    
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setError('Email de verificación enviado. Revisa tu bandeja de entrada.')
        setShowResendButton(false)
      } else {
        setError(data.error || 'Error al enviar email de verificación')
      }
    } catch (error) {
      console.error('Error al reenviar verificación:', error)
      setError('Error al enviar email de verificación')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="mx-auto h-20 w-20 mb-4">
              <Image
                src="/logo-oficial.png"
                alt="BaruLogix"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Bienvenido a BaruLogix
            </h2>
            <p className="text-gray-600">
              Inicia sesión para acceder a tu plataforma logística
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="tu@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Tu contraseña"
                disabled={loading}
              />
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Botón de reenvío de verificación */}
            {showResendButton && (
              <button
                type="button"
                onClick={handleResendVerification}
                className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg hover:bg-yellow-700 transition-colors font-medium"
              >
                Reenviar email de verificación
              </button>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Enlaces adicionales */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?{' '}
              <a href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                Regístrate aquí
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            © 2025 BaruLogix. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}

