import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Obtener el token de conductor de las cookies
  const conductorToken = request.cookies.get('conductor_token')?.value

  // Rutas protegidas para conductores
  if (pathname.startsWith('/conductor-dashboard')) {
    if (!conductorToken) {
      // Si no hay token, redirigir al login de conductor
      return NextResponse.redirect(new URL('/auth/conductor', request.url))
    }
    // Si hay token, permitir el acceso. La verificación real del token
    // se hará en el componente del dashboard o en una API route.
    return NextResponse.next()
  }

  // Rutas protegidas para administradores (ej. /dashboard)
  // Si un conductor intenta acceder al dashboard de admin, redirigirlo a su dashboard
  if (pathname.startsWith('/dashboard')) {
    if (conductorToken) {
      // Si hay un token de conductor, redirigirlo a su dashboard
      return NextResponse.redirect(new URL('/conductor-dashboard', request.url))
    }
    // Si no hay token de conductor, permitir que el flujo de autenticación de admin continúe
    return NextResponse.next()
  }

  // Para todas las demás rutas, continuar normalmente
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/conductor-dashboard/:path*'],
}


