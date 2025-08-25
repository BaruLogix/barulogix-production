import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // SOLUCIÓN DEFINITIVA: Usar ID real del usuario
    const userId = request.headers.get('x-user-id')
    
    console.log('=== DEBUG PACKAGES STATS ===')
    console.log('User ID recibido:', userId)
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'ID de usuario no proporcionado',
        details: 'Debe estar logueado para ver estadísticas'
      }, { status: 401 })
    }

    console.log('Obteniendo estadísticas para user ID:', userId)

    // Función para obtener TODOS los paquetes con paginación automática
    const getAllPackages = async (userId: string) => {
      let allPackages: any[] = []
      let from = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        console.log(`Obteniendo paquetes desde ${from} hasta ${from + pageSize - 1}`)
        
        const { data: packages, error } = await supabase
          .from('packages')
          .select(`
            tipo, estado, valor,
            conductor:conductors!inner(user_id)
          `)
          .eq('conductor.user_id', userId)
          .range(from, from + pageSize - 1)

        if (error) {
          console.error('Error en paginación de paquetes:', error)
          throw error
        }

        if (packages && packages.length > 0) {
          allPackages = allPackages.concat(packages)
          console.log(`Página obtenida: ${packages.length} paquetes. Total acumulado: ${allPackages.length}`)
          
          // Si obtuvimos menos de pageSize, ya no hay más páginas
          if (packages.length < pageSize) {
            hasMore = false
          } else {
            from += pageSize
          }
        } else {
          hasMore = false
        }
      }

      console.log(`TOTAL FINAL de paquetes obtenidos: ${allPackages.length}`)
      return allPackages
    }

    // Obtener TODOS los paquetes usando paginación
    const packages = await getAllPackages(userId)

    const stats = {
      total_packages: packages.length,
      no_entregados: packages.filter(p => p.estado === 0).length,
      entregados: packages.filter(p => p.estado === 1).length,
      devueltos: packages.filter(p => p.estado === 2).length,
      paquetes_pagos: packages.filter(p => p.tipo === 'Paquetes Pagos').length,
      paquetes_cod: packages.filter(p => p.tipo === 'Paquetes Pago Contra Entrega (COD)').length,
      valor_total_cod: packages
        .filter(p => p.tipo === 'Paquetes Pago Contra Entrega (COD)' && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0),
      valor_no_entregado_cod: packages
        .filter(p => p.tipo === 'Paquetes Pago Contra Entrega (COD)' && p.estado === 0 && p.valor)
        .reduce((sum, p) => sum + (p.valor || 0), 0)
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error in package stats GET:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

