// Script para ejecutar la migración SQL en Supabase
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config()

// Leer el script SQL
const sqlScript = fs.readFileSync('add_fecha_entrega_cliente.sql', 'utf8')

// Crear cliente Supabase con la clave de servicio
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function runMigration() {
  console.log('Ejecutando migración para agregar columna fecha_entrega_cliente...')
  
  try {
    // Ejecutar SQL usando la API de Supabase
    const { data, error } = await supabase.rpc('pgexecute', { query: sqlScript })
    
    if (error) {
      console.error('Error ejecutando migración:', error)
      return
    }
    
    console.log('Migración ejecutada exitosamente')
    console.log('Columna fecha_entrega_cliente agregada a la tabla packages')
  } catch (err) {
    console.error('Error inesperado:', err)
  }
}

runMigration()
