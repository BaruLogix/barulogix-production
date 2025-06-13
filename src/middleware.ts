import { NextRequest, NextResponse } from 'next/server'
import { verifyConductorJWT, extractTokenFromHeader } from '@/lib/conductor-auth'

// Clave secreta específica para tokens de conductores (debe ser la misma que en .env)
const CONDUCTOR_JWT_SECRET = process.env.CONDUCTOR_JWT_SECRET || 'conductor_secret_key_change_in_production'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas protegidas para conductores
  if (pathname.startsWith('/conductor-dashboard')) {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader) || request.cookies.get('conductor_token')?.value

    if (!token) {
      // Si no hay token, redirigir al login de conductor
      return NextResponse.redirect(new URL('/auth/conductor', request.url))
    }

    try {
      const decoded = verifyConductorJWT(token)
      if (!decoded || decoded.type !== 'conductor') {
        // Si el token es inválido o no es de conductor, redirigir al login
        return NextResponse.redirect(new URL('/auth/conductor', request.url))
      }

      // Si el token es válido, añadir el conductor_id a los headers para las APIs
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-conductor-id', decoded.conductor_id)
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    } catch (error) {
      console.error('Error verifying conductor token:', error)
      return NextResponse.redirect(new URL('/auth/conductor', request.url))
    }
  }

  // Rutas protegidas para administradores (ej. /dashboard)
  // Si un conductor intenta acceder al dashboard de admin, redirigirlo a su dashboard
  if (pathname.startsWith('/dashboard')) {
    const authHeader = request.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader) || request.cookies.get('conductor_token')?.value

    if (token) {
      try {
        const decoded = verifyConductorJWT(token)
        if (decoded && decoded.type === 'conductor') {
          // Si es un conductor, redirigirlo a su dashboard
          return NextResponse.redirect(new URL('/conductor-dashboard', request.url))
        }
      } catch (error) {
        // Token de conductor inválido, continuar con el flujo normal para admin
        console.warn('Invalid conductor token on admin route, proceeding with admin auth:', error)
      }
    }
    // Si no hay token de conductor o es inválido, permitir que el flujo de autenticación de admin continúe
    return NextResponse.next()
  }

  // Para todas las demás rutas, continuar normalmente
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/conductor-dashboard/:path*'],
}


