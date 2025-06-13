import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const JWT_SECRET = process.env.CONDUCTOR_JWT_SECRET || 'conductor_secret_key_change_in_production'
const JWT_EXPIRES_IN = process.env.CONDUCTOR_JWT_EXPIRES_IN || '24h'

// Configuración SMTP
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Hash de contraseña
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

// Generar JWT para conductor
export function generateConductorJWT(conductorId: string, email: string): string {
  return jwt.sign(
    { 
      conductor_id: conductorId, 
      email,
      type: 'conductor'
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  )
}

// Verificar JWT de conductor
export function verifyConductorJWT(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Token inválido')
  }
}

// Extraer token del header Authorization
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

// Generar token de verificación
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validar fortaleza de contraseña
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'La contraseña debe tener al menos 8 caracteres' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra mayúscula' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos una letra minúscula' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'La contraseña debe contener al menos un número' }
  }
  return { valid: true }
}

// Crear transporter de nodemailer
function createTransporter() {
  // Asegurarse de que las variables de entorno SMTP estén definidas
  if (!SMTP_CONFIG.host || !SMTP_CONFIG.auth.user || !SMTP_CONFIG.auth.pass) {
    console.error('Missing SMTP environment variables. Email sending will not work.')
    throw new Error('Missing SMTP environment variables.')
  }
  return nodemailer.createTransport(SMTP_CONFIG)
}

// Enviar email de verificación
export async function sendVerificationEmail(
  email: string, 
  name: string, 
  verificationToken: string
): Promise<void> {
  const transporter = createTransporter()
  
  const verificationUrl = `https://barulogix-production.vercel.app/auth/conductor/verify?token=${verificationToken}`
  
  const mailOptions = {
    from: `"BaruLogix" <${SMTP_CONFIG.auth.user}>`,
    to: email,
    subject: 'Verifica tu cuenta de conductor - BaruLogix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1>¡Bienvenido a BaruLogix!</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2>Hola ${name},</h2>
          
          <p>Tu cuenta de conductor ha sido creada exitosamente. Para completar el registro y acceder a tu dashboard, necesitas verificar tu dirección de correo electrónico.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verificar Email
            </a>
          </div>
          
          <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
          
          <p><strong>Este enlace expirará en 24 horas.</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Si no solicitaste esta cuenta, puedes ignorar este correo.
          </p>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 BaruLogix. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }
  
  await transporter.sendMail(mailOptions)
}

// Enviar email de restablecimiento de contraseña
export async function sendPasswordResetEmail(
  email: string, 
  name: string, 
  resetToken: string
): Promise<void> {
  const transporter = createTransporter()
  
  const resetUrl = `https://barulogix-production.vercel.app/auth/conductor/reset-password?token=${resetToken}`
  
  const mailOptions = {
    from: `"BaruLogix" <${SMTP_CONFIG.auth.user}>`,
    to: email,
    subject: 'Restablece tu contraseña - BaruLogix',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
          <h1>Restablecimiento de Contraseña</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9fafb;">
          <h2>Hola ${name},</h2>
          
          <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de conductor en BaruLogix.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Restablecer Contraseña
            </a>
          </div>
          
          <p>Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
          
          <p><strong>Este enlace expirará en 1 hora.</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          
          <p style="color: #6b7280; font-size: 14px;">
            Si no solicitaste este restablecimiento, puedes ignorar este correo. Tu contraseña no será cambiada.
          </p>
        </div>
        
        <div style="background-color: #374151; color: white; padding: 20px; text-align: center; font-size: 14px;">
          <p>© 2024 BaruLogix. Todos los derechos reservados.</p>
        </div>
      </div>
    `
  }
  
  await transporter.sendMail(mailOptions)
}

