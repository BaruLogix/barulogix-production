import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// PUT - Banear/desbanear usuario
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verificar si es admin
    const isAdmin = user.email === 'barulogix.platform@gmail.com' || user.user_metadata?.is_admin

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body // 'ban' o 'unban'
    const userId = params.id

    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes banearte a ti mismo' }, { status: 400 })
    }

    let updateData: any = {}

    if (action === 'ban') {
      // Banear por 100 años (prácticamente permanente)
      const banUntil = new Date()
      banUntil.setFullYear(banUntil.getFullYear() + 100)
      updateData.banned_until = banUntil.toISOString()
    } else if (action === 'unban') {
      updateData.banned_until = 'none'
    } else {
      return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
    }

    // Actualizar usuario
    const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, updateData)

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: action === 'ban' ? 'Usuario baneado exitosamente' : 'Usuario desbaneado exitosamente',
      user: updatedUser
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/users/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verificar si es admin
    const isAdmin = user.email === 'barulogix.platform@gmail.com' || user.user_metadata?.is_admin

    if (!isAdmin) {
      return NextResponse.json({ error: 'Acceso denegado - Solo administradores' }, { status: 403 })
    }

    const userId = params.id

    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })
    }

    // Eliminar usuario
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error in DELETE /api/admin/users/[id]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

