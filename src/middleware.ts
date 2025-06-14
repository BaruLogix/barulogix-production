import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Obtener el token de conductor de las cookies (aunque ya no se usa para el acceso directo)
  const conductorToken = request.cookies.get('conductor_token')?.value

  // Rutas protegidas para administradores (ej. /dashboard)
  // Si un conductor intenta acceder al dashboard de admin, redirigirlo a su dashboard
  if (pathname.startsWith('/dashboard')) {
    if (conductorToken) {
      // Si hay un token de conductor (de una sesión antigua), redirigirlo a su dashboard
      return NextResponse.redirect(new URL('/conductor-dashboard', request.url))
    }
    // Si no hay token de conductor, permitir que el flujo de autenticación de admin continúe
    return NextResponse.next()
  }

  // Para el dashboard de conductores, permitir el acceso directo.
  // La lógica de acceso por ID se maneja dentro de la página /conductor-dashboard.
  if (pathname.startsWith('/conductor-dashboard')) {
    return NextResponse.next()
  }

  // Para la antigua ruta de login de conductor, redirigir al nuevo dashboard de conductor
  if (pathname === '/auth/conductor') {
    return NextResponse.redirect(new URL('/conductor-dashboard', request.url))
  }

  // Para todas las demás rutas, continuar normalmente
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/conductor-dashboard/:path*', '/auth/conductor'],
}


