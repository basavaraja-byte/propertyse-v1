import { supabase, isSupabaseConfigured } from './supabaseClient';

export const paymentService = {
  /**
   * Fetch payment ledger for an assigned property
   * Read-only payment history viewer.
   * @param {string} propertyId - UUID of property
   */
  async getPaymentHistory(propertyId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [], error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('property_id', propertyId)
        .order('payment_date', { ascending: false });

      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, data: [], error: err.message };
    }
  }
};

