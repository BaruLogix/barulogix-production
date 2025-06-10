import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Obtener todos los usuarios (solo admin)
export async function GET(request: NextRequest) {
  try {
    // Verificar que el usuario es admin
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Verificar si es admin (por email o campo is_admin)
    const isAdmin = user.email === 'barulogix.platform@gmail.com' || user.user_metadata?.is_admin

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 })
    }

    // Obtener todos los usuarios
    const { data: users, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
    }

    // Formatear datos de usuarios
    const formattedUsers = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      email_confirmed_at: user.email_confirmed_at,
      banned: user.banned_until ? new Date(user.banned_until) > new Date() : false,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata
    }))

    // Calcular estadísticas
    const stats = {
      total: formattedUsers.length,
      active: formattedUsers.filter(u => !u.banned).length,
      banned: formattedUsers.filter(u => u.banned).length,
      confirmed: formattedUsers.filter(u => u.email_confirmed_at).length
    }

    return NextResponse.json({ users: formattedUsers, stats })
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

