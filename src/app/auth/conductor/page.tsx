'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConductorLoginRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir inmediatamente al nuevo dashboard de conductores
    router.replace('/conductor-dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-secondary-600 text-lg font-medium font-segoe">Redirigiendo al nuevo portal de conductores...</p>
      </div>
    </div>
  )
}

