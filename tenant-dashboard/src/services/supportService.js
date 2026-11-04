import { supabase, isSupabaseConfigured } from './supabaseClient';

export const supportService = {
  /**
   * Fetch support tickets for a property
   */
  async getSupportTickets(propertyId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [], error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, data: [], error: err.message };
    }
  },

  /**
   * Submit new support inquiry
   */
  async createSupportTicket({
    propertyId,
    companyId,
    tenantName,
    tenantEmail,
    tenantPhone,
    subject,
    category,
    description,
    priority = 'Medium'
  }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          property_id: propertyId,
          company_id: companyId || 'COMP_001',
          tenant_name: tenantName,
          tenant_email: tenantEmail,
          tenant_phone: tenantPhone,
          subject,
          category,
          description,
          priority,
          status: 'Open'
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

