import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG DELAYED PACKAGES API ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver paquetes atrasados'
      }, { status: 401 })
    }

    // Calcular fecha límite (3 días atrás)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() - 3)
    const fechaLimiteStr = fechaLimite.toISOString().split('T')[0]

    console.log('Buscando paquetes atrasados desde:', fechaLimiteStr)

    // Función para obtener TODOS los paquetes atrasados con paginación
    const getAllDelayedPackages = async (userId: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`📦 Obteniendo paquetes atrasados desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await supabase
          .from('packages')
          .select(`
            id,
            tracking,
            tipo,
            estado,
            fecha_entrega,
            valor,
            created_at,
            conductor:conductors!inner(id, nombre, zona, user_id)
          `)
          .eq('conductor.user_id', userId)
          .eq('estado', 0) // Solo paquetes no entregados
          .lt('fecha_entrega', fechaLimiteStr) // Fecha de entrega anterior a hace 3 días
          .order('fecha_entrega', { ascending: true }) // Los más atrasados primero
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('❌ Error obteniendo paquetes atrasados:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`✅ Página obtenida: ${packages.length} paquetes atrasados. Total: ${allPackages.length}`)
          
          if (packages.length < pageSize) {
            hasMore = false
          } else {
            from += pageSize
          }
        } else {
          hasMore = false
        }
      }

      return allPackages
    }

    const delayedPackages = await getAllDelayedPackages(userId)

    // Calcular días de atraso para cada paquete
    const packagesWithDelay = delayedPackages.map(pkg => {
      const fechaEntrega = new Date(pkg.fecha_entrega)
      const hoy = new Date()
      const diasAtraso = Math.floor((hoy.getTime() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        ...pkg,
        dias_atraso: diasAtraso
      }
    })

    console.log(`🎯 Total de paquetes atrasados encontrados: ${packagesWithDelay.length}`)

    // Agrupar por conductor para estadísticas
    const conductorStats = packagesWithDelay.reduce((acc, pkg) => {
      const conductorId = pkg.conductor.id
      if (!acc[conductorId]) {
        acc[conductorId] = {
          conductor: pkg.conductor,
          total_atrasados: 0,
          valor_total_cod: 0,
          paquetes: []
        }
      }
      
      acc[conductorId].total_atrasados++
      acc[conductorId].paquetes.push(pkg)
      
      if (pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' && pkg.valor) {
        acc[conductorId].valor_total_cod += pkg.valor
      }
      
      return acc
    }, {} as any)

    const response = {
      total_delayed: packagesWithDelay.length,
      fecha_limite: fechaLimiteStr,
      packages: packagesWithDelay,
      conductor_stats: Object.values(conductorStats),
      generated_at: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in delayed packages API:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

