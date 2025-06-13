import { NextRequest, NextResponse } from 'next/server'
import { verifyConductorJWT, extractTokenFromHeader } from '@/lib/conductor-auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rutas protegidas para conductores
  if (pathname.startsWith('/conductor-dashboard')) {
    // Primero intentar obtener el token del localStorage (que se convierte en cookie)
    const token = request.cookies.get('conductor_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

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

      // Si el token es válido, continuar
      return NextResponse.next()
    } catch (error) {
      console.error('Error verifying conductor token:', error)
      return NextResponse.redirect(new URL('/auth/conductor', request.url))
    }
  }

  // Rutas protegidas para administradores (ej. /dashboard)
  // Si un conductor intenta acceder al dashboard de admin, redirigirlo a su dashboard
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('conductor_token')?.value

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

