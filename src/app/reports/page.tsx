'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'

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
  const [pdfLoading, setPdfLoading] = useState(false)
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
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar conductores')
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      const response = await fetch('/api/conductors', { headers })
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
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setLoading(false)
        return
      }

      const requestBody = {
        tipo_reporte: type,
        fecha_inicio: dateRange.fecha_desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días atrás por defecto
        fecha_fin: dateRange.fecha_hasta || new Date().toISOString().split('T')[0], // Hoy por defecto
        conductor_id: type === 'specific' ? selectedConductor : undefined
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })
      
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        const error = await response.json()
        console.error('Error generating report:', error)
        alert(error.error || 'Error al generar el reporte')
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
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setExportLoading(false)
        return
      }

      const queryParams = new URLSearchParams()
      queryParams.append('format', format)
      queryParams.append('dataType', dataType)
      
      if (selectedConductor) {
        queryParams.append('conductor_id', selectedConductor)
      }
      
      if (dateRange.fecha_desde) {
        queryParams.append('fecha_desde', dateRange.fecha_desde)
      }
      
      if (dateRange.fecha_hasta) {
        queryParams.append('fecha_hasta', dateRange.fecha_hasta)
      }

      const headers = {
        'x-user-id': userId
      }

      const response = await fetch(`/api/reports/export?${queryParams}`, {
        method: 'GET',
        headers
      })
      
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
        const error = await response.json()
        console.error('Error exporting data:', error)
        alert(error.error || 'Error al exportar los datos')
      }
    } catch (error) {
      console.error('Error exporting data:', error)
      alert('Error al exportar los datos')
    } finally {
      setExportLoading(false)
    }
  }

  const exportPDF = async (type: 'general' | 'specific') => {
    setPdfLoading(true)
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        alert('Error: No se pudo obtener información del usuario')
        setPdfLoading(false)
        return
      }

      const requestBody = {
        type,
        conductor_id: type === 'specific' ? selectedConductor : null,
        fecha_desde: dateRange.fecha_desde || null,
        fecha_hasta: dateRange.fecha_hasta || null
      }

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': userId
      }

      const response = await fetch('/api/reports/pdf', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Generar PDF en el frontend usando los datos
        generatePDFFromData(data.report_data, type)
        
      } else {
        const error = await response.json()
        console.error('Error generating PDF:', error)
        alert(error.error || 'Error al generar reporte PDF')
      }
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error al generar reporte PDF')
    } finally {
      setPdfLoading(false)
    }
  }

  const generatePDFFromData = (data: any, type: string) => {
    // Crear contenido HTML para el PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte BaruLogix</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #2563eb;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 28px;
          }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
          }
          .stat-card { 
            border: 1px solid #ddd; 
            padding: 15px; 
            border-radius: 8px; 
            text-align: center;
            background: #f9fafb;
          }
          .stat-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: #2563eb; 
            margin: 5px 0;
          }
          .stat-label { 
            font-size: 14px; 
            color: #666; 
            margin: 0;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 12px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background-color: #f5f5f5; 
            font-weight: bold;
          }
          .conductor-section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          .conductor-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 10px; 
            color: #1f2937;
            border-left: 4px solid #2563eb;
            padding-left: 10px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BaruLogix - Reporte ${type === 'general' ? 'General' : 'Específico'}</h1>
          <p>Generado el: ${new Date().toLocaleDateString('es-ES', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          ${data.metadata?.fecha_desde ? `<p>Período: ${data.metadata.fecha_desde} - ${data.metadata.fecha_hasta || 'Presente'}</p>` : ''}
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${data.general_stats?.total_conductors || 0}</div>
            <div class="stat-label">Total Conductores</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.general_stats?.total_packages || 0}</div>
            <div class="stat-label">Total Paquetes</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.general_stats?.entregados || 0}</div>
            <div class="stat-label">Entregados</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${data.general_stats?.devueltos || 0}</div>
            <div class="stat-label">Devueltos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">$${data.general_stats?.valor_total_dropi?.toLocaleString() || '0'}</div>
            <div class="stat-label">Valor Total Dropi</div>
          </div>
        </div>

        ${(data.conductor_stats || []).map((conductor: any) => `
          <div class="conductor-section">
            <div class="conductor-title">${conductor.conductor?.nombre || 'N/A'} - ${conductor.conductor?.zona || 'N/A'}</div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${conductor.stats?.total_packages || 0}</div>
                <div class="stat-label">Total Paquetes</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${conductor.stats?.entregados || 0}</div>
                <div class="stat-label">Entregados</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${conductor.stats?.devueltos || 0}</div>
                <div class="stat-label">Devueltos</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">$${conductor.stats?.valor_total_dropi?.toLocaleString() || '0'}</div>
                <div class="stat-label">Valor Dropi</div>
              </div>
            </div>
          </div>
        `).join('')}

        ${(data.packages || []).length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Tracking</th>
                <th>Conductor</th>
                <th>Zona</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Fecha Entrega</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              ${(data.packages || []).map((pkg: any) => `
                <tr>
                  <td>${pkg.tracking || 'N/A'}</td>
                  <td>${pkg.conductor || 'N/A'}</td>
                  <td>${pkg.zona || 'N/A'}</td>
                  <td>${pkg.tipo || 'N/A'}</td>
                  <td>${pkg.estado || 'N/A'}</td>
                  <td>${pkg.fecha_entrega || 'N/A'}</td>
                  <td>$${pkg.valor?.toLocaleString() || '0'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>Reporte generado por BaruLogix - Sistema de Gestión Logística</p>
          <p>© ${new Date().getFullYear()} BaruLogix. Todos los derechos reservados.</p>
        </div>

        <script>
          // Auto-trigger print dialog for PDF generation
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `

    // Crear nueva ventana optimizada para PDF
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      
      // Configurar para PDF
      printWindow.onbeforeprint = () => {
        printWindow.document.title = `BaruLogix_Reporte_${type}_${new Date().toISOString().split('T')[0]}`
      }
      
      // Cerrar ventana después de imprimir/cancelar
      printWindow.onafterprint = () => {
        setTimeout(() => {
          printWindow.close()
        }, 1000)
      }
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

              {/* Botones de PDF */}
              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-semibold text-secondary-800 font-montserrat mb-3 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Exportar PDF
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => exportPDF('general')}
                    disabled={pdfLoading}
                    className="btn-pdf disabled:opacity-50"
                  >
                    {pdfLoading ? (
                      <>
                        <div className="loading-spinner w-4 h-4 mr-2"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF General
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => exportPDF('specific')}
                    disabled={pdfLoading || !selectedConductor}
                    className="btn-pdf disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    PDF Específico
                  </button>
                </div>
              </div>
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats?.total_conductors || 0}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {reportData.general_stats?.active_conductors || 0} activos
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats?.total_packages || 0}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    100% del total
                  </p>
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{reportData.general_stats?.entregados || 0}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getPercentage(reportData.general_stats?.entregados || 0, reportData.general_stats?.total_packages || 1)}% del total
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
                    ${reportData.general_stats?.valor_total_dropi?.toLocaleString('es-CO') || '0'}
                  </p>
                  <p className="text-xs text-secondary-500 mt-1">En pesos colombianos</p>
                </div>
              </div>
            </div>

            {/* Gráficas Interactivas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Gráfica de Pastel - Estados de Paquetes */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                  Estados de Paquetes
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Entregados', value: reportData.general_stats?.entregados || 0, color: '#10b981' },
                        { name: 'Pendientes', value: reportData.general_stats?.no_entregados || 0, color: '#f59e0b' },
                        { name: 'Devueltos', value: reportData.general_stats?.devueltos || 0, color: '#ef4444' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Entregados', value: reportData.general_stats?.entregados || 0, color: '#10b981' },
                        { name: 'Pendientes', value: reportData.general_stats?.no_entregados || 0, color: '#f59e0b' },
                        { name: 'Devueltos', value: reportData.general_stats?.devueltos || 0, color: '#ef4444' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Paquetes']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de Barras - Paquetes por Conductor */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Paquetes por Conductor
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(reportData.conductor_stats || []).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="conductor.nombre" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [value, name === 'stats.total_packages' ? 'Total Paquetes' : name]}
                      labelFormatter={(label) => `Conductor: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="stats.total_packages" fill="#3b82f6" name="Total Paquetes" />
                    <Bar dataKey="stats.entregados" fill="#10b981" name="Entregados" />
                    <Bar dataKey="stats.no_entregados" fill="#f59e0b" name="Pendientes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráficas Adicionales */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Gráfica de Pastel - Tipos de Paquetes */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Tipos de Paquetes
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { 
                          name: 'Shein/Temu', 
                          value: (reportData.conductor_stats || []).reduce((sum, c) => sum + (c.stats?.shein_temu_count || 0), 0),
                          color: '#8b5cf6' 
                        },
                        { 
                          name: 'Dropi', 
                          value: (reportData.conductor_stats || []).reduce((sum, c) => sum + (c.stats?.dropi_count || 0), 0),
                          color: '#06b6d4' 
                        }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { 
                          name: 'Shein/Temu', 
                          value: (reportData.conductor_stats || []).reduce((sum, c) => sum + (c.stats?.shein_temu_count || 0), 0),
                          color: '#8b5cf6' 
                        },
                        { 
                          name: 'Dropi', 
                          value: (reportData.conductor_stats || []).reduce((sum, c) => sum + (c.stats?.dropi_count || 0), 0),
                          color: '#06b6d4' 
                        }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Paquetes']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gráfica de Barras - Días Promedio de Atraso */}
              <div className="card-barulogix-lg animate-fade-in">
                <h3 className="text-xl font-bold text-secondary-900 mb-6 font-montserrat flex items-center">
                  <svg className="w-6 h-6 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Días Promedio de Atraso
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={(reportData.conductor_stats || []).filter(c => (c.stats?.dias_promedio_atraso || 0) > 0).slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="conductor.nombre" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [value, 'Días de Atraso']}
                      labelFormatter={(label) => `Conductor: ${label}`}
                    />
                    <Bar 
                      dataKey="stats.dias_promedio_atraso" 
                      fill="#ef4444" 
                      name="Días Promedio de Atraso"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Estadísticas por Conductor */}
            <div className="card-barulogix-lg animate-fade-in">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
                Estadísticas por Conductor ({reportData.conductor_stats?.length || 0})
              </h3>

              {(!reportData.conductor_stats || reportData.conductor_stats.length === 0) ? (
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
                      {(reportData.conductor_stats || []).map((item, index) => (
                        <tr key={item.conductor?.id || index} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                          <td>
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-primary-600 font-semibold text-sm">
                                  {item.conductor?.nombre?.charAt(0)?.toUpperCase() || 'C'}
                                </span>
                              </div>
                              <span className="font-medium text-secondary-900 font-segoe">{item.conductor?.nombre || 'N/A'}</span>
                            </div>
                          </td>
                          <td>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {item.conductor?.zona || 'N/A'}
                            </span>
                          </td>
                          <td className="text-center font-semibold text-secondary-900">{item.stats?.total_packages || 0}</td>
                          <td className="text-center text-purple-600 font-medium">{item.stats?.shein_temu_count || 0}</td>
                          <td className="text-center text-blue-600 font-medium">{item.stats?.dropi_count || 0}</td>
                          <td className="text-center text-green-600 font-medium">{item.stats?.entregados || 0}</td>
                          <td className="text-center text-yellow-600 font-medium">{item.stats?.no_entregados || 0}</td>
                          <td className="text-center text-secondary-600 font-segoe text-sm">
                            ${item.stats?.valor_total_dropi?.toLocaleString('es-CO') || '0'}
                          </td>
                          <td className="text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              (item.stats?.dias_promedio_atraso || 0) > 7 ? 'bg-red-100 text-red-800' :
                              (item.stats?.dias_promedio_atraso || 0) > 3 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {item.stats?.dias_promedio_atraso || 0} días
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

