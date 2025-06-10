// Página de diagnóstico simple para BaruLogix
// Esta página mostrará información de diagnóstico directamente en el frontend

'use client';

import { useState, useEffect } from 'react';

export default function DiagnosticoPage() {
    const [diagnostico, setDiagnostico] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const realizarDiagnostico = async () => {
            try {
                // Intentar hacer una petición de prueba a la API de registro
                const testRegistro = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: 'Test User',
                        email: 'test@test.com',
                        password: 'Test123!',
                        confirmPassword: 'Test123!'
                    })
                });

                const registroResponse = await testRegistro.text();
                
                // Intentar hacer una petición de prueba a la API de login
                const testLogin = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: 'admin@barulogix.com',
                        password: 'BaruAdmin2025!'
                    })
                });

                const loginResponse = await testLogin.text();

                setDiagnostico({
                    timestamp: new Date().toISOString(),
                    registro: {
                        status: testRegistro.status,
                        response: registroResponse
                    },
                    login: {
                        status: testLogin.status,
                        response: loginResponse
                    },
                    url: window.location.href,
                    userAgent: navigator.userAgent
                });

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        realizarDiagnostico();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
                    <h1 className="text-2xl font-bold text-blue-600 mb-4">
                        🔍 Diagnóstico BaruLogix
                    </h1>
                    <p>Ejecutando diagnóstico...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl w-full">
                    <h1 className="text-2xl font-bold text-red-600 mb-4">
                        ❌ Error en Diagnóstico
                    </h1>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-blue-600 mb-6">
                        🔍 Diagnóstico BaruLogix
                    </h1>
                    
                    <div className="space-y-6">
                        <div className="border-l-4 border-blue-500 pl-4">
                            <h2 className="text-xl font-semibold mb-2">📊 Información General</h2>
                            <p><strong>Timestamp:</strong> {diagnostico.timestamp}</p>
                            <p><strong>URL:</strong> {diagnostico.url}</p>
                        </div>

                        <div className="border-l-4 border-green-500 pl-4">
                            <h2 className="text-xl font-semibold mb-2">📝 Prueba de Registro</h2>
                            <p><strong>Status:</strong> 
                                <span className={`ml-2 px-2 py-1 rounded text-white ${
                                    diagnostico.registro.status === 200 ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                    {diagnostico.registro.status}
                                </span>
                            </p>
                            <div className="mt-2">
                                <strong>Respuesta:</strong>
                                <pre className="bg-gray-100 p-3 rounded mt-1 text-sm overflow-auto">
                                    {diagnostico.registro.response}
                                </pre>
                            </div>
                        </div>

                        <div className="border-l-4 border-purple-500 pl-4">
                            <h2 className="text-xl font-semibold mb-2">🔐 Prueba de Login</h2>
                            <p><strong>Status:</strong> 
                                <span className={`ml-2 px-2 py-1 rounded text-white ${
                                    diagnostico.login.status === 200 ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                    {diagnostico.login.status}
                                </span>
                            </p>
                            <div className="mt-2">
                                <strong>Respuesta:</strong>
                                <pre className="bg-gray-100 p-3 rounded mt-1 text-sm overflow-auto">
                                    {diagnostico.login.response}
                                </pre>
                            </div>
                        </div>

                        <div className="border-l-4 border-yellow-500 pl-4">
                            <h2 className="text-xl font-semibold mb-2">🌐 Información del Cliente</h2>
                            <p><strong>User Agent:</strong></p>
                            <p className="text-sm text-gray-600">{diagnostico.userAgent}</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-semibold text-blue-800 mb-2">💡 Instrucciones</h3>
                            <p className="text-blue-700">
                                Comparte esta información completa para identificar exactamente qué está causando 
                                el problema con BaruLogix. Los códigos de estado y las respuestas nos dirán 
                                exactamente dónde está fallando el sistema.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

