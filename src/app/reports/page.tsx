'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

export default function ReportsPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [loading, setLoading] = useState(false)
  const [reportResult, setReportResult] = useState<string>('')
  const router = useRouter()

  // Estado para generación de reportes
  const [reportForm, setReportForm] = useState({
    tipo_reporte: 'general',
    fecha_inicio: '',
    fecha_fin: '',
    conductor_id: ''
  })

  // Estado para exportación
  const [exportForm, setExportForm] = useState({
    formato: 'json',
    fecha_inicio: '',
    fecha_fin: '',
    conductor_id: '',
    incluir_conductores: true,
    incluir_paquetes: true
  })

  useEffect(() => {
    checkAuth()
    loadConductors()
    
    // Establecer fechas por defecto (último mes)
    const today = new Date()
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    
    const todayStr = today.toISOString().split('T')[0]
    const lastMonthStr = lastMonth.toISOString().split('T')[0]
    
    setReportForm(prev => ({
      ...prev,
      fecha_inicio: lastMonthStr,
      fecha_fin: todayStr
    }))
    
    setExportForm(prev => ({
      ...prev,
      fecha_inicio: lastMonthStr,
      fecha_fin: todayStr
    }))
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

  const handleGenerateReport = async () => {
    if (!reportForm.fecha_inicio || !reportForm.fecha_fin) {
      alert('Debe seleccionar las fechas de inicio y fin')
      return
    }

    if (reportForm.tipo_reporte === 'especifico' && !reportForm.conductor_id) {
      alert('Debe seleccionar un conductor para el reporte específico')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm)
      })

      if (response.ok) {
        const data = await response.json()
        setReportResult(data.report)
      } else {
        const error = await response.json()
        alert(error.error || 'Error al generar reporte')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Error al generar reporte')
    } finally {
      setLoading(false)
    }
  }

  const handleExportData = async () => {
    if (!exportForm.fecha_inicio || !exportForm.fecha_fin) {
      alert('Debe seleccionar las fechas de inicio y fin')
      return
    }

    if (!exportForm.incluir_conductores && !exportForm.incluir_paquetes) {
      alert('Debe seleccionar al menos un tipo de datos para exportar')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportForm)
      })

      if (response.ok) {
        if (exportForm.formato === 'csv') {
          // Descargar archivo CSV
          const blob = await response.blob()
          const url = window.URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `barulogix_export_${new Date().toISOString().split('T')[0]}.csv`
          document.body.appendChild(a)
          a.click()
          window.URL.revokeObjectURL(url)
          document.body.removeChild(a)
          alert('Archivo CSV descargado exitosamente')
        } else {
          // Mostrar JSON
          const data = await response.json()
          setReportResult(JSON.stringify(data, null, 2))
        }
      } else {
        const error = await response.json()
        alert(error.error || 'Error al exportar datos')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error al exportar datos')
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (!reportResult) return

    const blob = new Blob([reportResult], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte_barulogix_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(url)
    document.body.removeChild(a)
  }

  const clearReport = () => {
    setReportResult('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Image
                src="/logo-oficial-transparente.png"
                alt="BaruLogix"
                width={40}
                height={40}
                className="mr-3"
              />
              <h1 className="text-xl font-bold text-gray-800 font-montserrat">BaruLogix - Reportes y Exportación</h1>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/search')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Búsqueda
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('user')
                  localStorage.removeItem('session')
                  router.push('/auth/login')
                }}
                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Generación de Reportes */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-montserrat flex items-center">
              <svg className="w-6 h-6 mr-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generar Reportes
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Reporte
                </label>
                <select
                  value={reportForm.tipo_reporte}
                  onChange={(e) => setReportForm({ ...reportForm, tipo_reporte: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">Reporte General</option>
                  <option value="especifico">Reporte Específico por Conductor</option>
                </select>
              </div>

              {reportForm.tipo_reporte === 'especifico' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conductor
                  </label>
                  <select
                    value={reportForm.conductor_id}
                    onChange={(e) => setReportForm({ ...reportForm, conductor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar conductor</option>
                    {conductors.filter(c => c.activo).map(conductor => (
                      <option key={conductor.id} value={conductor.id}>
                        {conductor.nombre} - {conductor.zona}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={reportForm.fecha_inicio}
                    onChange={(e) => setReportForm({ ...reportForm, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={reportForm.fecha_fin}
                    onChange={(e) => setReportForm({ ...reportForm, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Generando...' : 'Generar Reporte'}
              </button>
            </div>
          </div>

          {/* Exportación de Datos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 font-montserrat flex items-center">
              <svg className="w-6 h-6 mr-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Datos
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Formato de Exportación
                </label>
                <select
                  value={exportForm.formato}
                  onChange={(e) => setExportForm({ ...exportForm, formato: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="json">JSON</option>
                  <option value="csv">CSV</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conductor (Opcional)
                </label>
                <select
                  value={exportForm.conductor_id}
                  onChange={(e) => setExportForm({ ...exportForm, conductor_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los conductores</option>
                  {conductors.map(conductor => (
                    <option key={conductor.id} value={conductor.id}>
                      {conductor.nombre} - {conductor.zona}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    value={exportForm.fecha_inicio}
                    onChange={(e) => setExportForm({ ...exportForm, fecha_inicio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    value={exportForm.fecha_fin}
                    onChange={(e) => setExportForm({ ...exportForm, fecha_fin: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Datos a Incluir
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportForm.incluir_paquetes}
                      onChange={(e) => setExportForm({ ...exportForm, incluir_paquetes: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Incluir Paquetes</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportForm.incluir_conductores}
                      onChange={(e) => setExportForm({ ...exportForm, incluir_conductores: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Incluir Conductores</span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleExportData}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                {loading ? 'Exportando...' : 'Exportar Datos'}
              </button>
            </div>
          </div>
        </div>

        {/* Resultado del Reporte */}
        {reportResult && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 font-montserrat">Resultado del Reporte</h3>
              <div className="flex space-x-2">
                <button
                  onClick={downloadReport}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Descargar
                </button>
                <button
                  onClick={clearReport}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Limpiar
                </button>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {reportResult}
              </pre>
            </div>
          </div>
        )}

        {/* Información de Ayuda */}
        {!reportResult && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Información sobre Reportes y Exportación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Reportes Disponibles:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Reporte General:</strong> Estadísticas completas de todos los conductores y paquetes</li>
                  <li>• <strong>Reporte Específico:</strong> Análisis detallado de un conductor particular</li>
                  <li>• Incluye paquetes entregados, no entregados y devueltos</li>
                  <li>• Cálculo automático de días de atraso</li>
                  <li>• Valores monetarios para paquetes Dropi</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Formatos de Exportación:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>JSON:</strong> Formato estructurado para análisis programático</li>
                  <li>• <strong>CSV:</strong> Compatible con Excel y hojas de cálculo</li>
                  <li>• Filtrado por rango de fechas</li>
                  <li>• Opción de incluir conductores y/o paquetes</li>
                  <li>• Filtrado por conductor específico</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

