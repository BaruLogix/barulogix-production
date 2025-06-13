import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyConductorJWT, extractTokenFromHeader } from '@/lib/conductor-auth'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase URL or Service Role Key environment variables.')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

export async function GET(req: NextRequest) {
  try {
    // 1. Verificar autenticación
    const authHeader = req.headers.get('authorization')
    const token = extractTokenFromHeader(authHeader)
    
    if (!token) {
      return NextResponse.json({ error: 'Token de autenticación requerido' }, { status: 401 })
    }

    const decodedToken = verifyConductorJWT(token)
    if (!decodedToken) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    const conductorId = decodedToken.conductor_id

    // 2. Obtener información básica del conductor
    const { data: conductorData, error: conductorError } = await supabaseAdmin
      .from('conductors')
      .select('id, name, email, phone, status')
      .eq('id', conductorId)
      .single()

    if (conductorError || !conductorData) {
      return NextResponse.json({ error: 'Conductor no encontrado' }, { status: 404 })
    }

    // 3. Obtener información de autenticación
    const { data: authData, error: authError } = await supabaseAdmin
      .from('conductor_auth')
      .select('email, email_verified, created_at')
      .eq('conductor_id', conductorId)
      .single()

    if (authError || !authData) {
      return NextResponse.json({ error: 'Información de autenticación no encontrada' }, { status: 404 })
    }

    // 4. Retornar información del conductor
    return NextResponse.json({
      conductor: {
        id: conductorData.id,
        name: conductorData.name,
        email: authData.email,
        phone: conductorData.phone,
        status: conductorData.status,
        email_verified: authData.email_verified,
        member_since: authData.created_at,
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Error en la API de información del conductor:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

