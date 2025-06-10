// Utilidades para autenticación y validación
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Hashear contraseña
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verificar contraseña
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generar JWT token
export function generateToken(payload: any): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verificar JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Extraer token del header Authorization
export function extractTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validar contraseña (mínimo 6 caracteres, al menos una letra y un número)
export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/;
  return passwordRegex.test(password);
}

// Validar tracking number (alfanumérico, 6-20 caracteres)
export function isValidTracking(tracking: string): boolean {
  const trackingRegex = /^[A-Za-z0-9]{6,20}$/;
  return trackingRegex.test(tracking.trim());
}

// Sanitizar string para evitar inyecciones
export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>\"']/g, '');
}

// Generar ID único para transacciones
export function generateTransactionId(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `BL_${timestamp}_${random}`.toUpperCase();
}

// Formatear fecha para mostrar
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

// Formatear moneda colombiana
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(amount);
}

// Validar rango de fechas
export function isValidDateRange(startDate: string, endDate: string): boolean {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  
  // Verificar que las fechas sean válidas
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return false;
  }
  
  // Verificar que la fecha de inicio no sea posterior a la fecha de fin
  if (start > end) {
    return false;
  }
  
  // Verificar que las fechas no sean futuras
  if (start > now || end > now) {
    return false;
  }
  
  return true;
}

// Calcular días de atraso
export function calculateDelayDays(deliveryDate: Date): number {
  const now = new Date();
  const delivery = new Date(deliveryDate);
  const diffTime = now.getTime() - delivery.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Generar código de verificación
export function generateVerificationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Tipos de respuesta API estándar
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Crear respuesta de éxito
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

// Crear respuesta de error
export function createErrorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message
  };
}

