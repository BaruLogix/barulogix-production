'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ReportData {
  general_stats: {
    total_conductors: number
    active_conductors: number
    total_packages: number
    entregados: number
    no_entregados: number
    devueltos: number
    valor_total_dropi: number
  }
  conductor_stats: Array<{
    conductor: {
      id: string
      nombre: string
      zona: string
    }
    stats: {
      total_packages: number
      shein_temu_count: number
      dropi_count: number
      entregados: number
      no_entregados: number
      devueltos: number
      valor_total_dropi: number
      dias_promedio_atraso: number
    }
  }>
}

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedConductor, setSelectedConductor] = useState('')
  const [dateRange, setDateRange] = useState({
    fecha_desde: '',
    fecha_hasta: ''
  })
  const [exportLoading, setExportLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    loadConductors()
  }, [])

  const checkAuth = () => {
    const userData = localStorage.getItem('user')
    const sessionData = localStorage.getItem('session')
    
    if (!userData || !sessionData) {
      router.push('/auth/login')
      return
    }
  }

  const loadConductors = async () => {
    try {
      const response = await fetch('/api/conductors')
      if (response.ok) {
        const data = await response.json()
        setConductors(data.conductors || [])
      }
    } catch (error) {
      console.error('Error loading conductors:', error)
    }
  }

  const generateReport = async (type: 'general' | 'specific') => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('type', type)
      
      if (type === 'specific' && selectedConductor) {
        queryParams.append('conductor_id', selectedConductor)
      }
      
      if (dateRange.fecha_desde) {
        queryParams.append('fecha_desde', dateRange.fecha_desde)
      }
      
      if (dateRange.fecha_hasta) {
        queryParams.append('fecha_hasta', dateRange.fecha_hasta)
      }

      const response = await fetch(`/api/reports/generate?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        console.error('Error generating report')
        alert('Error al generar el reporte')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'json' | 'csv', dataType: 'conductors' | 'packages' | 'both') => {
    setExportLoading(true)
    try {
      const queryParams = new URLSearchParams()
      queryParams.append('format', format)
      queryParams.append('data_type', dataType)
      
      if (selectedConductor) {
        queryParams.append('conductor_id', selectedConductor)
      }
      
      if (dateRange.fecha_desde) {
        queryParams.append('fecha_desde', dateRange.fecha_desde)
      }
      
      if (dateRange.fecha_hasta) {
        queryParams.append('fecha_hasta', dateRange.fecha_hasta)
      }

      const response = await fetch(`/api/reports/export?${queryParams}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `barulogix_export_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        console.error('Error exporting data')
        alert('Error al exportar los datos')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error al exportar los datos')
    } finally {
      setExportLoading(false)
    }
  }

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="header-barulogix">
        <div className="header-content">
          <div className="flex items-center">
            <Image
              src="/logo-oficial-transparente.png"
              alt="BaruLogix"
              width={50}
              height={50}
              className="mr-4"
            />
            <div>
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Reportes y Exportación</h1>
              <p className="text-sm text-secondary-600 font-segoe">Genera reportes detallados y exporta datos</p>
            </div>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-secondary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('user')
                localStorage.removeItem('session')
                router.push('/auth/login')
              }}
              className="btn-danger btn-sm"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controles de Reporte */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            <svg className="w-8 h-8 inline-block mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar Reportes
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Configuración de Reporte */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secondary-800 font-montserrat">Configuración</h3>
              
              <div>
                <label className="label-barulogix">Conductor Específico (Opcional)</label>
                <select
                  value={selectedConductor}
                  onChange={(e) => setSelectedConductor(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="">Todos los conductores</option>
                  {conductors.filter(c => c.activo).map(conductor => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre} - {conductor.zona}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-barulogix">Fecha Desde</label>
                  <input
                    type="date"
                    value={dateRange.fecha_desde}
                    onChange={(e) => setDateRange({ ...dateRange, fecha_desde: e.target.value })}
                    className="input-barulogix-modern focus-ring"
                  />
                </div>
                <div>
                  <label className="label-barulogix">Fecha Hasta</label>
                  <input
                    type="date"
                    value={dateRange.fecha_hasta}
                    onChange={(e) => setDateRange({ ...dateRange, fecha_hasta: e.target.value })}
                    className="input-barulogix-modern focus-ring"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={() => generateReport('general')}
                  disabled={loading}
                  className="btn-primary hover-glow disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner w-4 h-4 mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Reporte General
                    </>
                  )}
                </button>
                <button
                  onClick={() => generateReport('specific')}
                  disabled={loading || !selectedConductor}
                  className="btn-secondary disabled:opacity-50"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Reporte Específico
                </button>
              </div>
            </div>

            {/* Exportación de Datos */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-secondary-800 font-montserrat">Exportar Datos</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => exportData('json', 'conductors')}
                  disabled={exportLoading}
                  className="btn-accent disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Conductores JSON
                </button>
                <button
                  onClick={() => exportData('csv', 'conductors')}
                  disabled={exportLoading}
                  className="btn-accent disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Conductores CSV
                </button>
                <button
                  onClick={() => exportData('json', 'packages')}
                  disabled={exportLoading}
                  className="btn-accent disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paquetes JSON
                </button>
                <button
                  onClick={() => exportData('csv', 'packages')}
                  disabled={exportLoading}
                  className="btn-accent disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Paquetes CSV
                </button>
              </div>

              <button
                onClick={() => exportData('json', 'both')}
                disabled={exportLoading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {exportLoading ? (
                  <>
                    <div className="loading-spinner w-4 h-4 mr-2"></div>
                    Exportando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar Todo (JSON)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Resultados del Reporte */}
        {reportData && (
          <>
            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card-barulogix hover-lift animate-slide-up">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-primary-100 text-primary-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Total Conductores</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats.total_conductors}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {reportData.general_stats.active_conductors} activos
                  </p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="text-center">
                  <div className="p-4 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Total Paquetes</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats.total_packages}</p>
                  <p className="text-xs text-secondary-500 mt-1">En el sistema</p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.2s'}}>
                <div className="text-center">
                  <div className="p-4 rounded-full bg-green-100 text-green-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Entregados</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats.entregados}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getPercentage(reportData.general_stats.entregados, reportData.general_stats.total_packages)}% del total
                  </p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
                <div className="text-center">
                  <div className="p-4 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Valor Total Dropi</p>
                  <p className="text-2xl font-bold text-secondary-900 font-montserrat">
                    ${reportData.general_stats.valor_total_dropi?.toLocaleString('es-CO') || '0'}
                  </p>
                  <p className="text-xs text-secondary-500 mt-1">En pesos colombianos</p>
                </div>
              </div>
            </div>

            {/* Estadísticas por Conductor */}
            <div className="card-barulogix-lg animate-fade-in">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
                Estadísticas por Conductor ({reportData.conductor_stats.length})
              </h3>

              {reportData.conductor_stats.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-secondary-600 text-lg font-segoe">No hay datos para mostrar</p>
                  <p className="text-secondary-500 text-sm font-segoe mt-1">Ajusta los filtros y genera un nuevo reporte</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-barulogix">
                    <thead>
                      <tr>
                        <th>Conductor</th>
                        <th>Zona</th>
                        <th>Total Paquetes</th>
                        <th>Shein/Temu</th>
                        <th>Dropi</th>
                        <th>Entregados</th>
                        <th>Pendientes</th>
                        <th>Valor Dropi</th>
                        <th>Días Atraso Prom.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.conductor_stats.map((item, index) => (
                        <tr key={item.conductor.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                          <td>
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-primary-600 font-semibold text-sm">
                                  {item.conductor.nombre.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="font-medium text-secondary-900 font-segoe">{item.conductor.nombre}</span>
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {item.conductor.zona}
                            </span>
                          </td>
                          <td className="text-center font-semibold text-secondary-900">{item.stats.total_packages}</td>
                          <td className="text-center text-purple-600 font-medium">{item.stats.shein_temu_count}</td>
                          <td className="text-center text-blue-600 font-medium">{item.stats.dropi_count}</td>
                          <td className="text-center text-green-600 font-medium">{item.stats.entregados}</td>
                          <td className="text-center text-yellow-600 font-medium">{item.stats.no_entregados}</td>
                          <td className="text-center text-secondary-600 font-segoe text-sm">
                            ${item.stats.valor_total_dropi?.toLocaleString('es-CO') || '0'}
                          </td>
                          <td className="text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.stats.dias_promedio_atraso > 7 ? 'bg-red-100 text-red-800' :
                              item.stats.dias_promedio_atraso > 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.stats.dias_promedio_atraso || 0} días
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {!reportData && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-secondary-600 text-lg font-segoe">Genera un reporte para ver las estadísticas</p>
            <p className="text-secondary-500 text-sm font-segoe mt-1">Los datos aparecerán aquí una vez generado el reporte</p>
          </div>
        )}
      </div>
    </div>
  )
}

