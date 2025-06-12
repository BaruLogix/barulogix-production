-- Script para agregar la columna fecha_entrega_cliente a la tabla packages
ALTER TABLE packages ADD COLUMN IF NOT EXISTS fecha_entrega_cliente TIMESTAMP WITH TIME ZONE DEFAULT NULL;
