'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  ArrowLeft,
  Shield,
  Smartphone,
  Building
} from 'lucide-react';

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pse');
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/auth/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (error) {
      router.push('/auth/login');
    }
  }, [router]);

  const handlePayment = async () => {
    setLoading(true);
    
    // Simular proceso de pago
    setTimeout(() => {
      setLoading(false);
      // Simular pago exitoso
      alert('¡Pago procesado exitosamente! Tu suscripción está ahora activa.');
      router.push('/dashboard');
    }, 3000);
  };

  const paymentMethods = [
    {
      id: 'pse',
      name: 'PSE',
      description: 'Pago Seguro en Línea',
      icon: <Building className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      id: 'nequi',
      name: 'Nequi',
      description: 'Pago con Nequi',
      icon: <Smartphone className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      id: 'card',
      name: 'Tarjeta',
      description: 'Tarjeta de Crédito/Débito',
      icon: <CreditCard className="h-6 w-6" />,
      color: 'bg-green-100 text-green-600'
    }
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Activar Suscripción</h1>
              <p className="text-sm text-gray-500">Completa tu pago para acceder a todas las funcionalidades</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Plan Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Plan Profesional</h2>
            
            <div className="mb-6">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-blue-600">$50.000</span>
                <span className="text-gray-600 ml-2">COP/mes</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Facturación mensual</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">Gestión ilimitada de paquetes</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">Control de conductores</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">Reportes y gráficos detallados</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">Soporte técnico incluido</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <span className="text-gray-700">Actualizaciones automáticas</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-blue-800 font-medium">Pago 100% Seguro</span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Tus datos están protegidos con encriptación SSL de 256 bits
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Método de Pago</h2>

            {/* Payment Methods */}
            <div className="space-y-3 mb-6">
              {paymentMethods.map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg mr-4 ${method.color}`}>
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{method.name}</h3>
                    <p className="text-sm text-gray-500">{method.description}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    paymentMethod === method.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === method.id && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Payment Details */}
            {paymentMethod === 'pse' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Pago con PSE</h4>
                <p className="text-sm text-gray-600">
                  Serás redirigido al portal de tu banco para completar el pago de forma segura.
                </p>
              </div>
            )}

            {paymentMethod === 'nequi' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Pago con Nequi</h4>
                <p className="text-sm text-gray-600">
                  Recibirás una notificación en tu app Nequi para autorizar el pago.
                </p>
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Tarjeta
                  </label>
                  <input
                    type="text"
                    placeholder="1234 5678 9012 3456"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del Titular
                  </label>
                  <input
                    type="text"
                    placeholder="Nombre como aparece en la tarjeta"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Order Summary */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">$50.000 COP</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">IVA (19%)</span>
                <span className="text-gray-900">$9.500 COP</span>
              </div>
              <div className="flex justify-between items-center text-lg font-semibold border-t border-gray-200 pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">$59.500 COP</span>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Procesando Pago...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 mr-2" />
                  Pagar $59.500 COP
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Al proceder con el pago, aceptas nuestros términos y condiciones de servicio.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

