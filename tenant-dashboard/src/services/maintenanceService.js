import { supabase, isSupabaseConfigured } from './supabaseClient';

export const maintenanceService = {
  /**
   * Fetch tickets from existing public.maintenance_tickets table
   * @param {string} propertyId - UUID of property
   */
  async getTickets(propertyId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [], error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_tickets')
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
   * Submit maintenance request into existing public.maintenance_tickets table
   * Mappings applied:
   * - Priority 'Emergency' -> mapped to 'Urgent' for Owner backend compatibility
   * - Category 'Water Supply' -> 'Plumbing', 'Internet' -> 'Electrical', 'Furniture' -> 'Structural'
   * - Status is strictly 'Open' (displayed in Tenant UI as 'Submitted')
   */
  async createTicket({
    companyId,
    propertyId,
    tenantId,
    unitNumber,
    tenantName,
    category,
    description,
    priority = 'Medium',
    preferredVisitDate,
    preferredTimeSlot = 'Morning (10:00 AM – 1:00 PM)',
    imageUrls = []
  }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      // Map category safely to existing Owner Dashboard categories
      const categoryMapping = {
        'Water Supply': 'Plumbing',
        'Internet': 'Electrical',
        'Furniture': 'Structural',
        'Plumbing': 'Plumbing',
        'Electrical': 'Electrical',
        'Air Conditioning': 'Air Conditioning',
        'Appliance': 'Appliance',
        'Cleaning': 'Cleaning',
        'Structural': 'Structural',
        'Other': 'Other'
      };
      const validCategory = categoryMapping[category] || 'Other';

      // Map Emergency priority to Urgent
      const validPriority = priority === 'Emergency' ? 'Urgent' : (['Low', 'Medium', 'High', 'Urgent'].includes(priority) ? priority : 'Medium');

      // Format date for date column
      const validDate = preferredVisitDate && /^\d{4}-\d{2}-\d{2}$/.test(preferredVisitDate)
        ? preferredVisitDate
        : null;

      const row = {
        company_id: companyId || 'COMP_001',
        property_id: propertyId,
        unit_number: unitNumber,
        tenant_name: tenantName,
        category: validCategory,
        description: category !== validCategory ? `[${category}] ${description}` : description,
        priority: validPriority,
        status: 'Open',
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(validDate ? { preferred_visit_date: validDate } : {}),
        preferred_time_slot: preferredTimeSlot,
        image_urls: imageUrls || []
      };

      const { data, error } = await supabase
        .from('maintenance_tickets')
        .insert(row)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Fetch notes/comments from existing public.maintenance_ticket_notes
   * @param {string} ticketId - UUID of ticket
   */
  async getTicketNotes(ticketId) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, data: [] };
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_ticket_notes')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) return { success: false, data: [], error: error.message };
      return { success: true, data: data || [] };
    } catch (err) {
      return { success: false, data: [], error: err.message };
    }
  },

  /**
   * Add note/comment to existing public.maintenance_ticket_notes
   */
  async addTicketNote({ ticketId, companyId, authorName, authorRole = 'Tenant', note }) {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Awaiting Supabase configuration.' };
    }

    try {
      const { data, error } = await supabase
        .from('maintenance_ticket_notes')
        .insert({
          ticket_id: ticketId,
          company_id: companyId || 'COMP_001',
          worker_name: authorName,
          author_name: authorName,
          author_role: authorRole,
          note
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
