import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Verificar que las variables de entorno existen
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Función para crear cliente del servidor
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase server environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseServiceKey)
}

// Tipos de datos para TypeScript
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  isActive: boolean
  subscription: 'basic' | 'premium' | 'enterprise'
  company?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface Conductor {
  id: string
  userId: string
  name: string
  phone: string
  vehicleType: string
  licensePlate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Delivery {
  id: string
  userId: string
  conductorId?: string
  trackingNumber: string
  recipient: string
  address: string
  phone: string
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'returned'
  platform: 'shein' | 'temu' | 'dropi' | 'other'
  notes?: string
  createdAt: string
  updatedAt: string
  deliveredAt?: string
}

