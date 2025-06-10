'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { 
  BarChart3, 
  Download, 
  Calendar,
  TrendingUp,
  Package,
  Users,
  ArrowLeft,
  FileText
} from 'lucide-react'

interface User {
  id: string
  role: 'admin' | 'user'
}

interface ReportData {
  totalDeliveries: number
  completedDeliveries: number
  pendingDeliveries: number
  returnedDeliveries: number
  activeConductors: number
  totalUsers: number
  deliveriesByPlatform: {
    shein: number
    temu: number
    dropi: number
    other: number
  }
  deliveriesByMonth: Array<{
    month: string
    count: number
  }>
}

export default function ReportsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const router = useRouter()

  useEffect(() => {
    initializeReports()
  }, [])

  const initializeReports = async () => {
    try {
      setLoading(true)
      
      const supabase = createClient()
      
      // Verificar autenticación
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

      if (authError || !authUser) {
        router.push('/auth/login')
        return
      }

      // Obtener perfil del usuario
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, role')
        .eq('id', authUser.id)
        .single()

      if (profileError || !profile) {
        router.push('/auth/login')
        return
      }

      setUser({
        id: profile.id,
        role: profile.role
      })

      // Cargar datos de reportes
      await loadReportData(authUser.id, profile.role, supabase)

    } catch (error) {
      console.error('Error initializing reports:', error)
      router.push('/auth/login')
    } finally {
      setLoading(false)
    }
  }

  const loadReportData = async (userId: string, userRole: string, supabase: any) => {
    try {
      // Configurar consultas basadas en el rol
      let deliveriesQuery = supabase.from('deliveries').select('*')
      let conductorsQuery = supabase.from('conductors').select('*')
      let usersQuery = supabase.from('user_profiles').select('*')

      // Si no es admin, filtrar por usuario
      if (userRole !== 'admin') {
        deliveriesQuery = deliveriesQuery.eq('user_id', userId)
        conductorsQuery = conductorsQuery.eq('user_id', userId)
        usersQuery = usersQuery.eq('id', userId)
      }

      // Ejecutar consultas
      const [deliveriesResult, conductorsResult, usersResult] = await Promise.all([
        deliveriesQuery,
        conductorsQuery,
        usersQuery
      ])

      const deliveries = deliveriesResult.data || []
      const conductors = conductorsResult.data || []
      const users = usersResult.data || []

      // Calcular estadísticas
      const totalDeliveries = deliveries.length
      const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length
      const pendingDeliveries = deliveries.filter(d => d.status === 'pending').length
      const returnedDeliveries = deliveries.filter(d => d.status === 'returned').length
      const activeConductors = conductors.filter(c => c.is_active).length
      const totalUsers = users.length

      // Entregas por plataforma
      const deliveriesByPlatform = {
        shein: deliveries.filter(d => d.platform === 'shein').length,
        temu: deliveries.filter(d => d.platform === 'temu').length,
        dropi: deliveries.filter(d => d.platform === 'dropi').length,
        other: deliveries.filter(d => d.platform === 'other').length
      }

      // Entregas por mes (últimos 6 meses)
      const now = new Date()
      const deliveriesByMonth = []
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const monthName = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
        const monthDeliveries = deliveries.filter(d => {
          const deliveryDate = new Date(d.created_at)
          return deliveryDate.getMonth() === date.getMonth() && 
                 deliveryDate.getFullYear() === date.getFullYear()
        }).length
        
        deliveriesByMonth.push({
          month: monthName,
          count: monthDeliveries
        })
      }

      setReportData({
        totalDeliveries,
        completedDeliveries,
        pendingDeliveries,
        returnedDeliveries,
        activeConductors,
        totalUsers,
        deliveriesByPlatform,
        deliveriesByMonth
      })

    } catch (error) {
      console.error('Error loading report data:', error)
    }
  }

  const generateReport = () => {
    if (!reportData) return

    const reportContent = `
REPORTE BARULOGIX
================

Fecha: ${new Date().toLocaleDateString()}
Período: ${selectedPeriod}

RESUMEN GENERAL
--------------
Total de Entregas: ${reportData.totalDeliveries}
Entregas Completadas: ${reportData.completedDeliveries}
Entregas Pendientes: ${reportData.pendingDeliveries}
Entregas Devueltas: ${reportData.returnedDeliveries}
Conductores Activos: ${reportData.activeConductors}
Total de Usuarios: ${reportData.totalUsers}

ENTREGAS POR PLATAFORMA
----------------------
Shein: ${reportData.deliveriesByPlatform.shein}
Temu: ${reportData.deliveriesByPlatform.temu}
Dropi: ${reportData.deliveriesByPlatform.dropi}
Otros: ${reportData.deliveriesByPlatform.other}

ENTREGAS POR MES
---------------
${reportData.deliveriesByMonth.map(m => `${m.month}: ${m.count}`).join('\n')}

MÉTRICAS DE RENDIMIENTO
----------------------
Tasa de Éxito: ${reportData.totalDeliveries > 0 ? ((reportData.completedDeliveries / reportData.totalDeliveries) * 100).toFixed(1) : 0}%
Tasa de Devolución: ${reportData.totalDeliveries > 0 ? ((reportData.returnedDeliveries / reportData.totalDeliveries) * 100).toFixed(1) : 0}%
    `

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-barulogix-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg text-gray-600">Cargando reportes...</div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">❌ Error al cargar datos de reportes</div>
          <button
            onClick={initializeReports}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Link
                href="/dashboard"
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📊 Reportes y Estadísticas</h1>
                <p className="text-sm text-gray-600">Análisis de rendimiento y métricas</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Esta semana</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="year">Este año</option>
              </select>
              <button
                onClick={generateReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Reporte
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Entregas
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {reportData.totalDeliveries}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tasa de Éxito
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {reportData.totalDeliveries > 0 
                          ? ((reportData.completedDeliveries / reportData.totalDeliveries) * 100).toFixed(1)
                          : 0}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Conductores Activos
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {reportData.activeConductors}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Pendientes
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {reportData.pendingDeliveries}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Entregas por Estado */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Estado de Entregas</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completadas</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.completedDeliveries / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.completedDeliveries}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pendientes</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.pendingDeliveries / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.pendingDeliveries}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Devueltas</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.returnedDeliveries / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.returnedDeliveries}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Entregas por Plataforma */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Entregas por Plataforma</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Shein</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-pink-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.deliveriesByPlatform.shein / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.deliveriesByPlatform.shein}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Temu</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.deliveriesByPlatform.temu / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.deliveriesByPlatform.temu}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Dropi</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.deliveriesByPlatform.dropi / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.deliveriesByPlatform.dropi}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Otros</span>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                      <div 
                        className="bg-gray-500 h-2 rounded-full" 
                        style={{ 
                          width: reportData.totalDeliveries > 0 
                            ? `${(reportData.deliveriesByPlatform.other / reportData.totalDeliveries) * 100}%` 
                            : '0%' 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">{reportData.deliveriesByPlatform.other}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Entregas por Mes */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Tendencia de Entregas (Últimos 6 meses)</h3>
            <div className="mt-4">
              <div className="flex items-end space-x-2 h-64">
                {reportData.deliveriesByMonth.map((month, index) => {
                  const maxCount = Math.max(...reportData.deliveriesByMonth.map(m => m.count))
                  const height = maxCount > 0 ? (month.count / maxCount) * 100 : 0
                  
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-xs text-gray-600 mb-1">{month.count}</span>
                        <div 
                          className="w-full bg-blue-500 rounded-t"
                          style={{ height: `${height}%`, minHeight: month.count > 0 ? '4px' : '0px' }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                        {month.month}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Summary Report */}
          <div className="bg-white p-6 rounded-lg shadow mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Resumen Ejecutivo</h3>
              <FileText className="h-5 w-5 text-gray-400" />
            </div>
            <div className="prose text-sm text-gray-600">
              <p>
                En el período seleccionado, se han procesado un total de <strong>{reportData.totalDeliveries}</strong> entregas, 
                con una tasa de éxito del <strong>
                {reportData.totalDeliveries > 0 
                  ? ((reportData.completedDeliveries / reportData.totalDeliveries) * 100).toFixed(1)
                  : 0}%
                </strong>.
              </p>
              <p className="mt-2">
                El equipo cuenta con <strong>{reportData.activeConductors}</strong> conductores activos, 
                y actualmente hay <strong>{reportData.pendingDeliveries}</strong> entregas pendientes de procesamiento.
              </p>
              {reportData.returnedDeliveries > 0 && (
                <p className="mt-2 text-amber-600">
                  Se registraron <strong>{reportData.returnedDeliveries}</strong> entregas devueltas, 
                  lo que representa un <strong>
                  {((reportData.returnedDeliveries / reportData.totalDeliveries) * 100).toFixed(1)}%
                  </strong> del total.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

