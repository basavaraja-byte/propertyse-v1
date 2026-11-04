import { supabase, isSupabaseConfigured } from './supabaseClient';

export const documentService = {
  /**
   * Fetch document records for a property
   */
  async getDocuments(propertyId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [], error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('tenant_documents')
        .select('*')
        .eq('property_id', propertyId)
        .eq('access_status', 'Active')
        .order('created_at', { ascending: false });

      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, data: [], error: err.message };
    }
  }
};

