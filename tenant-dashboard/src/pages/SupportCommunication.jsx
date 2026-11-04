import React, { useState } from 'react';
import {
  LifeBuoy,
  MessageSquare,
  Phone,
  Mail,
  Clock,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Send,
  PlusCircle,
  ShieldAlert,
  FileText,
  UserCheck
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Modal } from '../components/layout/Modal';
import { faqs, emergencyContacts } from '../data/mockSupport';

export const SupportCommunication = () => {
  const { property, supportTickets, submitSupportTicket } = useTenant();

  // Support ticket form modal state
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Rent-related query',
    priority: 'Medium',
    description: '',
    attachmentName: ''
  });

  // FAQ accordion open states
  const [openFaqId, setOpenFaqId] = useState(1);

  const toggleFaq = (id) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) return;

    submitSupportTicket(ticketForm);

    setTicketForm({
      subject: '',
      category: 'Rent-related query',
      priority: 'Medium',
      description: '',
      attachmentName: ''
    });
    setIsTicketModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Support & Communication"
        subtitle="Direct channel to landlord, property managers, community emergency desk, and resident FAQs."
        breadcrumb="Support & Communication"
      >
        <button
          className="btn btn-primary"
          onClick={() => setIsTicketModalOpen(true)}
        >
          <PlusCircle size={16} /> Open Support Ticket
        </button>
      </PageHeader>

      {/* Emergency Contacts Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
          border: '1.5px solid #FCA5A5',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 24px',
          marginBottom: '28px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <ShieldAlert size={22} color="var(--danger)" />
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991B1B' }}>
            Emergency & Urgent Campus Assistance (Demo Data)
          </h2>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '14px'
          }}
        >
          {emergencyContacts.map((contact, i) => (
            <div
              key={i}
              style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                border: '1px solid #FECACA',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {contact.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {contact.type} • {contact.note}
                </div>
              </div>
              <a
                href={`tel:${contact.phone}`}
                className="btn btn-danger-outline btn-sm"
                style={{ flexShrink: 0 }}
              >
                <Phone size={13} /> {contact.phone}
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Owner & Manager Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Landlord Card */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              src={property.owner.avatar}
              alt={property.owner.name}
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{property.owner.name}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {property.owner.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                ● {property.owner.responseRate}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={15} color="var(--primary)" />
              <span>{property.owner.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={15} color="var(--primary)" />
              <span>{property.owner.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="var(--primary)" />
              <span>Calling Hours: {property.owner.preferredContactHours}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={`tel:${property.owner.phone}`} className="btn btn-primary" style={{ flex: 1 }}>
              <Phone size={15} /> Call Landlord
            </a>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsTicketModalOpen(true)}
            >
              <MessageSquare size={15} /> Open Inquiry
            </button>
          </div>
        </div>

        {/* Property Facility Manager */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <img
              src={property.manager.avatar}
              alt={property.manager.name}
              style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }}
            />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{property.manager.name}</h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {property.manager.role}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {property.manager.company}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Phone size={15} color="var(--primary)" />
              <span>{property.manager.phone}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={15} color="var(--primary)" />
              <span>{property.manager.email}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={15} color="var(--primary)" />
              <span>Desk Hours: {property.manager.officeHours}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <a href={`tel:${property.manager.phone}`} className="btn btn-outline" style={{ flex: 1 }}>
              <Phone size={15} /> Call Desk
            </a>
            <button
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={() => setIsTicketModalOpen(true)}
            >
              <MessageSquare size={15} /> Message Manager
            </button>
          </div>
        </div>
      </div>

      {/* Support Tickets History Table */}
      <div className="card" style={{ marginBottom: '28px' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <MessageSquare size={19} color="var(--primary)" /> Submitted Inquiries & Support Tickets
            </h2>
            <p className="card-subtitle">Official records of queries raised with management</p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setIsTicketModalOpen(true)}
          >
            <PlusCircle size={14} /> New Query
          </button>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Subject</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Date</th>
                <th>Status</th>
                <th>Latest Resolution / Reply</th>
              </tr>
            </thead>
            <tbody>
              {supportTickets.map((tkt) => (
                <tr key={tkt.id}>
                  <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                    {tkt.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{tkt.subject}</td>
                  <td>
                    <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                      {tkt.category}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${tkt.priority?.toLowerCase() || 'medium'}`} style={{ fontSize: '0.72rem' }}>
                      {tkt.priority}
                    </span>
                  </td>
                  <td>{tkt.submittedDate}</td>
                  <td>
                    <StatusBadge status={tkt.status} />
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                    {tkt.latestResponse}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resident FAQs Accordion */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <HelpCircle size={19} color="var(--primary)" /> Frequently Asked Questions
            </h2>
            <p className="card-subtitle">Helpful answers regarding payments, maintenance, and tenancy rules</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isOpen ? 'var(--bg-subtle)' : '#FFFFFF',
                    textAlign: 'left',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    color: 'var(--text-primary)'
                  }}
                >
                  <span>{faq.question}</span>
                  {isOpen ? <ChevronUp size={18} color="var(--primary)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '16px 20px',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.875rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.6,
                      borderTop: '1px solid var(--border-light)'
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Ticket Modal */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Open Support Inquiry"
        maxWidth="580px"
      >
        <form onSubmit={handleTicketSubmit}>
          <div className="form-group">
            <label className="form-label">
              Subject <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Question regarding rent receipt stamp or parking slot"
              value={ticketForm.subject}
              onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                required
              >
                <option value="Rent-related query">Rent-related query</option>
                <option value="Property-related query">Property-related query</option>
                <option value="Lease-related query">Lease-related query</option>
                <option value="Payment-related query">Payment-related query</option>
                <option value="Maintenance-related query">Maintenance-related query</option>
                <option value="General enquiry">General enquiry</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Description <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              placeholder="Explain your inquiry in detail..."
              value={ticketForm.description}
              onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsTicketModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={15} /> Submit Inquiry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

