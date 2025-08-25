'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface ConductorAnalysis {
  conductor: {
    id: string
    nombre: string
    zona: string
    activo: boolean
  }
  stats: {
    total_packages: number
    paquetes_pagos_count: number
    paquetes_cod_count: number
    entregados: number
    no_entregados: number
    devueltos: number
    valor_total_cod: number
    valor_entregado_cod: number
    valor_pendiente_cod: number
    dias_promedio_atraso: number
  }
  packages: Array<{
    id: string
    tracking: string
    tipo: 'Paquetes Pagos' | 'Paquetes Pago Contra Entrega (COD)'
    estado: number
    fecha_entrega: string
    valor?: number
    dias_atraso?: number
  }>
}

interface Conductor {
  id: string
  nombre: string
  zona: string
  activo: boolean
}

export default function ConductorAnalysisPage() {
  const [conductors, setConductors] = useState<Conductor[]>([])
  const [selectedConductor, setSelectedConductor] = useState('')
  const [analysis, setAnalysis] = useState<ConductorAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [filterEstado, setFilterEstado] = useState('')
  
  // Estados para filtros temporales
  const [filterType, setFilterType] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [lastDays, setLastDays] = useState('7')
  const [month, setMonth] = useState((new Date().getMonth() + 1).toString())
  const [year, setYear] = useState(new Date().getFullYear().toString())
  
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

  const loadAnalysis = async (conductorId: string) => {
    if (!conductorId) return

    setLoading(true)
    try {
      // Obtener el ID del usuario logueado
      const userData = localStorage.getItem('user')
      const userId = userData ? JSON.parse(userData).id : null
      
      if (!userId) {
        console.error('No se pudo obtener ID del usuario para cargar análisis')
        setLoading(false)
        return
      }
      
      const headers = {
        'x-user-id': userId
      }

      // Construir URL con parámetros de filtro
      let url = `/api/packages/by-conductor/${conductorId}?filterType=${filterType}`
      
      if (filterType === 'range' && startDate && endDate) {
        url += `&startDate=${startDate}&endDate=${endDate}`
      } else if (filterType === 'lastDays') {
        url += `&lastDays=${lastDays}`
      } else if (filterType === 'month') {
        url += `&month=${month}&year=${year}`
      }

      console.log('Cargando análisis con URL:', url)

      const response = await fetch(url, { headers })
      if (response.ok) {
        const data = await response.json()
        setAnalysis(data)
      } else {
        console.error('Error loading analysis')
        setAnalysis(null)
      }
    } catch (error) {
      console.error('Error loading analysis:', error)
      setAnalysis(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConductorChange = (conductorId: string) => {
    setSelectedConductor(conductorId)
    if (conductorId) {
      loadAnalysis(conductorId)
    } else {
      setAnalysis(null)
    }
  }

  const getEstadoText = (estado: number) => {
    switch (estado) {
      case 0: return 'No Entregado'
      case 1: return 'Entregado'
      case 2: return 'Devuelto'
      default: return 'Desconocido'
    }
  }

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return 'badge-warning'
      case 1: return 'badge-success'
      case 2: return 'badge-danger'
      default: return 'badge-neutral'
    }
  }

  const getDiasAtrasoColor = (dias: number) => {
    if (dias > 12) return 'text-red-600 bg-red-100'
    if (dias > 7) return 'text-orange-600 bg-orange-100'
    if (dias > 3) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  // Filtrar paquetes por estado
  const filteredPackages = analysis?.packages.filter(pkg => {
    if (!filterEstado) return true
    return pkg.estado.toString() === filterEstado
  }) || []

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
              <h1 className="text-2xl font-bold text-secondary-800 font-montserrat">BaruLogix - Análisis por Conductor</h1>
              <p className="text-sm text-secondary-600 font-segoe">Estadísticas detalladas de rendimiento</p>
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
        {/* Selector de Conductor y Filtros Temporales */}
        <div className="card-barulogix-lg mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
            <svg className="w-8 h-8 inline-block mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Seleccionar Conductor y Filtros
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selector de Conductor */}
            <div>
              <label className="label-barulogix">Conductor a Analizar</label>
              <select
                value={selectedConductor}
                onChange={(e) => handleConductorChange(e.target.value)}
                className="input-barulogix-modern focus-ring"
              >
                <option value="">Seleccionar conductor...</option>
                {conductors.filter(c => c.activo).map(conductor => (
                  <option key={conductor.id} value={conductor.id}>
                    {conductor.nombre} - {conductor.zona}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtros Temporales */}
            <div>
              <label className="label-barulogix">Filtro Temporal</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input-barulogix-modern focus-ring"
              >
                <option value="all">Todos los paquetes</option>
                <option value="lastDays">Últimos días</option>
                <option value="range">Rango de fechas</option>
                <option value="month">Mes específico</option>
              </select>
            </div>
          </div>

          {/* Filtros Adicionales */}
          {filterType === 'lastDays' && (
            <div className="mt-4">
              <label className="label-barulogix">Últimos días</label>
              <select
                value={lastDays}
                onChange={(e) => setLastDays(e.target.value)}
                className="input-barulogix-modern focus-ring max-w-xs"
              >
                <option value="7">Últimos 7 días</option>
                <option value="15">Últimos 15 días</option>
                <option value="30">Últimos 30 días</option>
              </select>
            </div>
          )}

          {filterType === 'range' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-barulogix">Fecha desde</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                />
              </div>
              <div>
                <label className="label-barulogix">Fecha hasta</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                />
              </div>
            </div>
          )}

          {filterType === 'month' && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-barulogix">Mes</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
              <div>
                <label className="label-barulogix">Año</label>
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="input-barulogix-modern focus-ring"
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
              </div>
            </div>
          )}

          {/* Botón Aplicar Filtros */}
          {selectedConductor && filterType !== 'all' && (
            <div className="mt-6">
              <button
                onClick={() => loadAnalysis(selectedConductor)}
                className="btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Aplicar Filtros
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="loading-spinner w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-secondary-600 text-lg font-medium font-segoe">Analizando datos del conductor...</p>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Información del Conductor */}
            {analysis.conductor && (
              <div className="card-barulogix mb-8 animate-slide-up">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-2xl font-bold font-montserrat">
                      {analysis.conductor?.nombre?.charAt(0) || 'C'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-secondary-900 font-montserrat">{analysis.conductor?.nombre || 'Conductor'}</h2>
                      <p className="text-secondary-600 font-segoe">Zona: {analysis.conductor?.zona || 'N/A'}</p>
                      <div className="mt-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          analysis.conductor?.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {analysis.conductor?.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-secondary-600 font-segoe">Total de Paquetes</p>
                    <p className="text-4xl font-bold text-primary-600 font-montserrat">{analysis.stats?.total_paquetes || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="card-barulogix hover-lift animate-slide-up">
                <div className="text-center">
                  <div className="p-4 rounded-full bg-purple-100 text-purple-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Paquetes Pagos</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats?.shein_total || 0}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getPercentage(analysis.stats?.shein_total || 0, analysis.stats?.total_paquetes || 0)}% del total
                  </p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="text-center">
                  <div className="p-4 rounded-full bg-blue-100 text-blue-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Paquetes COD</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{analysis.stats?.dropi_total || 0}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getPercentage(analysis.stats?.dropi_total || 0, analysis.stats?.total_paquetes || 0)}% del total
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
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{(analysis.stats?.shein_entregados || 0) + (analysis.stats?.dropi_entregados || 0)}</p>
                  <p className="text-xs text-secondary-500 mt-1">
                    {getPercentage((analysis.stats?.shein_entregados || 0) + (analysis.stats?.dropi_entregados || 0), analysis.stats?.total_paquetes || 0)}% del total
                  </p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.3s'}}>
                <div className="text-center">
                  <div className="p-4 rounded-full bg-yellow-100 text-yellow-600 mx-auto mb-4 w-fit">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">Días Atraso Prom.</p>
                  <p className="text-3xl font-bold text-secondary-900 font-montserrat">{
                    analysis.stats?.paquetes_atrasados?.length > 0 
                      ? Math.round(analysis.stats.paquetes_atrasados.reduce((sum: number, p: any) => sum + p.dias_atraso, 0) / analysis.stats.paquetes_atrasados.length)
                      : 0
                  }</p>
                  <p className="text-xs text-secondary-500 mt-1">Para paquetes pendientes</p>
                </div>
              </div>
            </div>

            {/* Estadísti            {/* Estadísticas Generales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="card-barulogix hover-lift animate-slide-up">
                <div className="text-center">
                  <div className="p-3 rounded-full bg-green-100 text-green-600 mx-auto mb-3 w-fit">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">💰 Valor Entregado</p>
                  <p className="text-2xl font-bold text-green-600 font-montserrat">
                    ${(analysis.stats.cod_valor_entregado || 0).toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-secondary-500 font-segoe">
                    {analysis.stats.cod_entregados || 0} paquetes COD
                  </p>
                </div>
              </div>

              <div className="card-barulogix hover-lift animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="text-center">
                  <div className="p-3 rounded-full bg-yellow-100 text-yellow-600 mx-auto mb-3 w-fit">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-secondary-600 font-segoe">⏳ Valor Pendiente</p>
                  <p className="text-2xl font-bold text-yellow-600 font-montserrat">
                    ${(analysis.stats.cod_valor_pendiente || 0).toLocaleString('es-CO')}
                  </p>
                  <p className="text-xs text-secondary-500 font-segoe">
                    {analysis.stats.cod_pendientes || 0} paquetes COD
                  </p>
                </div>
              </div>
            </div>

            {/* Reset automático banner */}
            {analysis.stats.cod_count > 0 && analysis.stats.reset_automatico && (
              <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-8">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-green-800 font-semibold font-montserrat">✅ Conductor al Día</h4>
                    <p className="text-green-700 text-sm font-segoe">Todos los paquetes COD han sido entregados</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filtro por Estado */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-secondary-700 mb-2 font-segoe">
                Filtrar por Estado:
              </label>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="input-barulogix w-full md:w-auto"
              >
                <option value="">Todos los estados</option>
                <option value="0">No Entregado</option>
                <option value="1">Entregado</option>
                <option value="2">Devuelto</option>
              </select>
            </div>        {/* Lista de Paquetes */}
            <div className="card-barulogix-lg animate-fade-in">
              <h3 className="text-2xl font-bold text-secondary-900 mb-6 font-montserrat">
                Detalle de Paquetes ({filteredPackages.length}{filterEstado ? ` de ${analysis.packages.length}` : ''})
              </h3>

              {filteredPackages.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-4 4m0 0l-4-4m4 4V3" />
                  </svg>
                  <p className="text-secondary-600 text-lg font-segoe">Este conductor no tiene paquetes asignados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-barulogix">
                    <thead>
                      <tr>
                        <th>Tracking</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Fecha Entrega</th>
                        <th>Valor</th>
                        <th>Días Atraso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPackages.map((pkg, index) => (
                        <tr key={pkg.id} className="animate-slide-up" style={{animationDelay: `${index * 0.05}s`}}>
                          <td>
                            <div className="flex items-center">
                              <div className={`w-3 h-3 rounded-full mr-3 ${
                                pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' ? 'bg-blue-500' : 'bg-purple-500'
                              }`}></div>
                              <span className="font-medium text-secondary-900 font-mono text-sm">{pkg.tracking}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              pkg.tipo === 'Paquetes Pago Contra Entrega (COD)' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {pkg.tipo}
                            </span>
                          </td>
                          <td>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(pkg.estado)}`}>
                              {getEstadoText(pkg.estado)}
                            </span>
                          </td>
                          <td className="text-secondary-600 font-segoe text-sm">
                            {new Date(pkg.fecha_entrega).toLocaleDateString('es-CO')}
                          </td>
                          <td className="text-secondary-600 font-segoe text-sm">
                            {pkg.valor ? `$${pkg.valor.toLocaleString('es-CO')}` : '-'}
                          </td>
                          <td className="text-secondary-600 font-segoe text-sm">
                            {pkg.dias_atraso !== undefined && pkg.estado === 0 ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDiasAtrasoColor(pkg.dias_atraso)}`}>
                                {pkg.dias_atraso} días
                              </span>
                            ) : '-'}
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

        {!selectedConductor && !loading && (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-secondary-600 text-lg font-segoe">Selecciona un conductor para ver su análisis detallado</p>
            <p className="text-secondary-500 text-sm font-segoe mt-1">Las estadísticas y paquetes aparecerán aquí</p>
          </div>
        )}
      </div>
    </div>
  )
}

