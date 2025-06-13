import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Configuración para el sistema de autenticación de conductores
const CONDUCTOR_JWT_SECRET = process.env.CONDUCTOR_JWT_SECRET || 'conductor_secret_key_change_in_production'
const CONDUCTOR_JWT_EXPIRES_IN = process.env.CONDUCTOR_JWT_EXPIRES_IN || '24h'

export interface ConductorAuthData {
  id: number
  conductor_id: string // Cambiado a string para UUID
  email: string
  email_verified: boolean
}

export interface ConductorJWTPayload {
  id: number
  conductor_id: string // Cambiado a string para UUID
  email: string
  type: 'conductor'
  iat?: number
  exp?: number
}

/**
 * Genera un hash de contraseña usando bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * Verifica una contraseña contra su hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Genera un JWT para un conductor
 */
export function generateConductorJWT(conductorAuth: ConductorAuthData): string {
  const payload: ConductorJWTPayload = {
    id: conductorAuth.id,
    conductor_id: conductorAuth.conductor_id,
    email: conductorAuth.email,
    type: 'conductor'
  }
  
  return jwt.sign(payload, CONDUCTOR_JWT_SECRET, { 
    expiresIn: CONDUCTOR_JWT_EXPIRES_IN 
  })
}

/**
 * Verifica y decodifica un JWT de conductor
 */
export function verifyConductorJWT(token: string): ConductorJWTPayload | null {
  try {
    const decoded = jwt.verify(token, CONDUCTOR_JWT_SECRET) as ConductorJWTPayload
    
    // Verificar que sea un token de conductor
    if (decoded.type !== 'conductor') {
      return null
    }
    
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * Genera un token de verificación aleatorio
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Genera un token de recuperación de contraseña
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Valida el formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida la fortaleza de la contraseña
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' }
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula' }
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula' }
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' }
  }
  
  return { valid: true }
}

/**
 * Extrae el token JWT del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  return authHeader.substring(7) // Remover "Bearer "
}

