import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function logOperation(userId: string, operationType: string, description: string, details: any, affectedRecords: number) {
  try {
    await supabase
      .from('admin_operations_history')
      .insert([
        {
          user_id: userId,
          operation_type: operationType,
          description,
          details,
          affected_records: affectedRecords,
          can_undo: true,
          created_at: new Date().toISOString()
        }
      ]);
  } catch (error) {
    console.error('Error logging operation to history:', error);
    // No fallar la operación principal si falla el log
  }
}
