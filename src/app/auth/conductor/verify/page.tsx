'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2, Truck } from 'lucide-react'

export default function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (!token) {
      setStatus('error')
      setMessage('Token de verificación no proporcionado')
      return
    }

    verifyEmail(token)
  }, [searchParams])

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/conductor/auth/verify-email?token=${token}`)
      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage(data.message)
        
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push('/auth/conductor')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Error al verificar el email')
      }
    } catch (error) {
      setStatus('error')
      setMessage('Error de conexión. Por favor, intenta de nuevo.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Verificación de Email</h2>
          <p className="mt-2 text-sm text-gray-600">
            Verificando tu cuenta de conductor en BaruLogix
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-600">Verificando tu email...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    ¡Email Verificado!
                  </h3>
                  <p className="text-gray-600 mb-4">{message}</p>
                  <p className="text-sm text-gray-500">
                    Serás redirigido al login en unos segundos...
                  </p>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="h-12 w-12 text-red-600 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Error de Verificación
                  </h3>
                  <p className="text-gray-600 mb-4">{message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {status === 'success' && (
              <Link
                href="/auth/conductor"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Ir al Login
              </Link>
            )}

            {status === 'error' && (
              <div className="space-y-2">
                <Link
                  href="/auth/conductor"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Volver al Login
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Intentar de Nuevo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            ¿Necesitas ayuda?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500">
              Contacta soporte
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

