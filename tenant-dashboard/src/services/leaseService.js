import { supabase, isSupabaseConfigured } from './supabaseClient';

export const leaseService = {
  /**
   * Fetch active lease for an assigned property
   * @param {string} propertyId - UUID of property
   */
  async getLeaseByProperty(propertyId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: null, error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('leases')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { success: false, data: null, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, data: null, error: err.message };
    }
  },

  /**
   * Submit a lease renewal request
   * @param {string} leaseId - UUID of lease
   * @param {object} payload - { durationMonths, message }
   */
  async requestRenewal(leaseId, { durationMonths, message }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('leases')
        .update({
          renewal_status: 'Pending Owner Approval',
          renewal_requested_months: durationMonths,
          renewal_message: message,
          updated_at: new Date().toISOString()
        })
        .eq('id', leaseId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

