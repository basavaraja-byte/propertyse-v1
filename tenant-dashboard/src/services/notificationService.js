import { supabase, isSupabaseConfigured } from './supabaseClient';

export const notificationService = {
  /**
   * Fetch notifications for a property/tenant
   */
  async getNotifications(propertyId, tenantEmail) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [], error: 'Awaiting Supabase configuration.' };
    }

    try {
      let query = supabase.from('tenant_notifications').select('*');
      if (propertyId) query = query.eq('property_id', propertyId);
      if (tenantEmail) query = query.eq('tenant_email', tenantEmail);

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, data: [], error: err.message };
    }
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(notificationId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('tenant_notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(propertyId, tenantEmail) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      let query = supabase.from('tenant_notifications').update({
        is_read: true,
        read_at: new Date().toISOString()
      });

      if (propertyId) query = query.eq('property_id', propertyId);
      if (tenantEmail) query = query.eq('tenant_email', tenantEmail);

      const { data, error } = await query;
      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

