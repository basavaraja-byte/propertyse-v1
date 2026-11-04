import { supabase, isSupabaseConfigured } from './supabaseClient';

export const propertyService = {
  /**
   * Fetch assigned property and tenant record from Supabase properties table
   * @param {string} propertyIdOrUnit - Property ID or unit number
   * @param {string} [companyId] - Optional company ID filter
   */
  async getAssignedProperty(propertyIdOrUnit = 'Flat 101', companyId = 'COMP_001') {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: null, error: 'Supabase client awaiting anon key or auth configuration.' };
    }

    try {
      let query = supabase.from('properties').select('*');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      // Check if querying by UUID or unit_number
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(propertyIdOrUnit);
      if (isUuid) {
        query = query.eq('id', propertyIdOrUnit);
      } else {
        query = query.eq('unit_number', propertyIdOrUnit);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        return { success: false, data: null, error: error.message };
      }

      return { success: true, data };
    } catch (err) {
      return { success: false, data: null, error: err.message };
    }
  }
};

