import { Truck, Package, BarChart3, Shield, Users, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.png" 
                alt="BaruLogix Logo" 
                width={50} 
                height={50}
                className="rounded-full"
              />
              <h1 className="text-2xl font-bold text-gray-900">BaruLogix</h1>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/auth/login" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
              <Link 
                href="/auth/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Gestiona tus entregas con
              <span className="text-blue-600 block">BaruLogix</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              La plataforma web profesional para pequeñas empresas de distribución. 
              Controla tus paquetes Shein/Temu y Dropi, genera reportes detallados y 
              optimiza tu operación logística.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Comenzar Gratis
                <CheckCircle className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                href="#features" 
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg text-lg font-semibold transition-colors inline-flex items-center justify-center"
              >
                Ver Características
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Características Principales
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Todo lo que necesitas para gestionar tu empresa de distribución de manera profesional
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-blue-100 rounded-lg p-3 w-fit mb-4">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Gestión de Paquetes
              </h3>
              <p className="text-gray-600">
                Registra y controla paquetes Shein/Temu y Dropi. Seguimiento de estados: 
                no entregado, entregado, devuelto.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-green-100 rounded-lg p-3 w-fit mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Control de Conductores
              </h3>
              <p className="text-gray-600">
                Administra tu equipo de conductores, asigna entregas y 
                monitorea el rendimiento individual.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-purple-100 rounded-lg p-3 w-fit mb-4">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Reportes Detallados
              </h3>
              <p className="text-gray-600">
                Genera reportes completos con gráficos, estadísticas y 
                análisis de rendimiento por conductor y período.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-red-100 rounded-lg p-3 w-fit mb-4">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Seguridad Avanzada
              </h3>
              <p className="text-gray-600">
                Autenticación segura, encriptación de datos y 
                control de acceso por roles de usuario.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-yellow-100 rounded-lg p-3 w-fit mb-4">
                <Truck className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Registro Masivo
              </h3>
              <p className="text-gray-600">
                Importa múltiples entregas de una vez. Detección automática 
                de duplicados y validación de datos.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="bg-indigo-100 rounded-lg p-3 w-fit mb-4">
                <CheckCircle className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Fácil de Usar
              </h3>
              <p className="text-gray-600">
                Interfaz intuitiva y moderna. Acceso desde cualquier 
                dispositivo con conexión a internet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Precio Simple y Transparente
            </h2>
            <p className="text-xl text-gray-600">
              Una suscripción mensual que incluye todas las características
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-500">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Profesional</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold text-blue-600">$50.000</span>
                  <span className="text-gray-600 ml-2">COP/mes</span>
                </div>
                <ul className="text-left space-y-3 mb-8">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Gestión ilimitada de paquetes</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Control de conductores</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Reportes y gráficos detallados</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Soporte técnico incluido</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span>Actualizaciones automáticas</span>
                  </li>
                </ul>
                <Link 
                  href="/auth/register" 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors inline-block text-center"
                >
                  Comenzar Ahora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Truck className="h-8 w-8 text-blue-400 mr-3" />
              <h3 className="text-2xl font-bold">BaruLogix</h3>
            </div>
            <p className="text-gray-400 mb-6">
              La solución profesional para empresas de distribución
            </p>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-500">
                © 2025 BaruLogix. Todos los derechos reservados.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

