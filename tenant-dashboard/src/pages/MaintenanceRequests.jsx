import React, { useState } from 'react';
import {
  Wrench,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Calendar,
  MapPin,
  MessageSquare,
  Search,
  Filter,
  Image as ImageIcon,
  Send,
  Eye,
  X
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/layout/StatCard';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Modal } from '../components/layout/Modal';
import { EmptyState } from '../components/layout/EmptyState';

export const MaintenanceRequests = () => {
  const {
    maintenanceRequests,
    addMaintenanceRequest,
    addMaintenanceComment,
    tenant,
    property
  } = useTenant();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Submit Modal State
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Plumbing',
    location: 'Kitchen',
    priority: 'Medium',
    preferredVisitDate: '',
    preferredTimeSlot: 'Morning (10:00 AM – 1:00 PM)',
    description: '',
    images: []
  });

  // Image Upload Preview State
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);

  // Detail / Timeline Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newCommentText, setNewCommentText] = useState('');

  // Overview Counts
  const totalCount = maintenanceRequests.length;
  const openCount = maintenanceRequests.filter((m) => m.status === 'Submitted').length;
  const inProgressCount = maintenanceRequests.filter((m) => m.status === 'In Progress' || m.status === 'Acknowledged').length;
  const resolvedCount = maintenanceRequests.filter((m) => m.status === 'Resolved').length;

  // Filtered requests
  const filteredRequests = maintenanceRequests.filter((req) => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || req.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Open' && (req.status === 'Submitted' || req.status === 'Acknowledged')) ||
      (statusFilter === 'In Progress' && req.status === 'In Progress') ||
      (statusFilter === 'Resolved' && req.status === 'Resolved');
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Handle local image file upload & preview
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviewUrls((prev) => [...prev, reader.result]);
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (indexToRemove) => {
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== indexToRemove));
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== indexToRemove)
    }));
  };

  // Handle form submission
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) return;

    const fullVisitDate = `${formData.preferredVisitDate || 'As soon as possible'} (${formData.preferredTimeSlot})`;

    addMaintenanceRequest({
      title: formData.title,
      category: formData.category,
      location: formData.location,
      priority: formData.priority,
      preferredVisitDate: fullVisitDate,
      description: formData.description,
      images: formData.images
    });

    // Reset
    setFormData({
      title: '',
      category: 'Plumbing',
      location: 'Kitchen',
      priority: 'Medium',
      preferredVisitDate: '',
      preferredTimeSlot: 'Morning (10:00 AM – 1:00 PM)',
      description: '',
      images: []
    });
    setImagePreviewUrls([]);
    setIsSubmitModalOpen(false);
  };

  // Handle adding comment
  const handlePostComment = (e) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTicket) return;

    addMaintenanceComment(selectedTicket.id, newCommentText);
    setNewCommentText('');

    // Update locally viewed ticket
    setSelectedTicket((prev) => ({
      ...prev,
      comments: [
        ...(prev.comments || []),
        {
          id: `cmt-${Date.now()}`,
          author: tenant.name,
          role: 'Tenant',
          timestamp: 'Just now',
          text: newCommentText
        }
      ]
    }));
  };

  return (
    <div>
      <PageHeader
        title="Maintenance Requests"
        subtitle="Report property repairs, track technician resolution progress, and coordinate directly with property staff."
        breadcrumb="Maintenance"
      >
        <button
          className="btn btn-primary"
          onClick={() => setIsSubmitModalOpen(true)}
        >
          <PlusCircle size={16} /> Raise Maintenance Request
        </button>
      </PageHeader>

      {/* Overview Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '18px',
          marginBottom: '28px'
        }}
      >
        <StatCard
          icon={Wrench}
          title="Total Requests"
          value={totalCount}
          subtext="Lifetime tickets recorded"
        />
        <StatCard
          icon={Clock}
          title="Submitted / Open"
          value={openCount}
          subtext="Under facility review"
          badgeText={openCount > 0 ? 'Pending' : 'Zero'}
          badgeType={openCount > 0 ? 'pending' : 'paid'}
        />
        <StatCard
          icon={AlertTriangle}
          title="In Progress"
          value={inProgressCount}
          subtext="Technician active"
          badgeText={inProgressCount > 0 ? 'Active' : 'None'}
          badgeType={inProgressCount > 0 ? 'pending' : 'neutral'}
        />
        <StatCard
          icon={CheckCircle2}
          title="Resolved"
          value={resolvedCount}
          subtext="Successfully closed"
          badgeText="Completed"
          badgeType="paid"
        />
      </div>

      {/* Main Request History Card */}
      <div className="card">
        {/* Header with Search and Category filters */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 className="card-title">
              Maintenance Ticket History
            </h2>
            <p className="card-subtitle">All repair requests for Unit {property.unit}</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search ticket title or ID..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px', width: '220px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <select
              className="form-select"
              style={{ height: '38px', width: '150px' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Electrical">Electrical</option>
              <option value="Air Conditioning">Air Conditioning</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Furniture">Furniture</option>
              <option value="Appliances">Appliances</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Structural Issues">Structural</option>
              <option value="Other">Other</option>
            </select>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ height: '38px', width: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Requests List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredRequests.length > 0 ? (
            filteredRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px',
                  background: '#FFFFFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '16px',
                  transition: 'box-shadow var(--transition-fast)'
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)', fontSize: '0.85rem' }}>
                      {req.id}
                    </span>
                    <StatusBadge status={req.status} />
                    <span className={`badge badge-${req.priority?.toLowerCase() || 'medium'}`} style={{ fontSize: '0.7rem' }}>
                      {req.priority} Priority
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {req.title}
                  </h3>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                    {req.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span><strong>Category:</strong> {req.category}</span>
                    <span>•</span>
                    <span><strong>Location:</strong> {req.location}</span>
                    <span>•</span>
                    <span><strong>Submitted:</strong> {req.submittedDate}</span>
                    {req.preferredVisitDate && (
                      <>
                        <span>•</span>
                        <span><strong>Visit Slot:</strong> {req.preferredVisitDate}</span>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Previews if images attached */}
                  {req.images && req.images.length > 0 && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      {req.images.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt="Attached problem preview"
                          style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: 'var(--radius-sm)',
                            objectFit: 'cover',
                            border: '1px solid var(--border-color)'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Action buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedTicket(req)}
                  >
                    <Eye size={14} /> View Timeline & Details
                  </button>
                  {req.comments && req.comments.length > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MessageSquare size={13} /> {req.comments.length} updates/messages
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No maintenance requests match your filters"
              description="Click 'Raise Maintenance Request' above if you need any property fixtures repaired or serviced."
              actionButton={
                <button className="btn btn-primary btn-sm" onClick={() => setIsSubmitModalOpen(true)}>
                  <PlusCircle size={15} /> Raise Request
                </button>
              }
            />
          )}
        </div>
      </div>

      {/* Submit Maintenance Request Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Raise Maintenance Request"
        maxWidth="620px"
      >
        <form onSubmit={handleSubmitRequest}>
          <div className="form-group">
            <label className="form-label">
              Issue Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Master Bedroom Geyser Not Heating"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">
                Issue Category <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
              >
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Air Conditioning">Air Conditioning</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Internet">Internet</option>
                <option value="Furniture">Furniture</option>
                <option value="Appliances">Appliances</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Structural Issues">Structural Issues</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                Location within Property <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              >
                <option value="Kitchen">Kitchen</option>
                <option value="Master Bedroom">Master Bedroom</option>
                <option value="Second Bedroom">Second Bedroom</option>
                <option value="Living Room">Living Room</option>
                <option value="Balcony">Balcony</option>
                <option value="Attached Bathroom">Attached Bathroom</option>
                <option value="Common Bathroom">Common Bathroom</option>
                <option value="Parking Slot P-24">Parking Slot P-24</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Priority Level</label>
              <select
                className="form-select"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="Low">Low (Within 72 hours)</option>
                <option value="Medium">Medium (Within 24-48 hours)</option>
                <option value="High">High (Within 12 hours)</option>
                <option value="Emergency">Emergency (Immediate)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Preferred Visit Date</label>
              <input
                type="date"
                className="form-input"
                value={formData.preferredVisitDate}
                onChange={(e) => setFormData({ ...formData, preferredVisitDate: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Time Slot</label>
            <select
              className="form-select"
              value={formData.preferredTimeSlot}
              onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
            >
              <option value="Morning (10:00 AM – 1:00 PM)">Morning (10:00 AM – 1:00 PM)</option>
              <option value="Afternoon (1:00 PM – 4:00 PM)">Afternoon (1:00 PM – 4:00 PM)</option>
              <option value="Evening (4:00 PM – 7:00 PM)">Evening (4:00 PM – 7:00 PM)</option>
              <option value="Anytime">Anytime during facility hours</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Detailed Description <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Describe what is malfunctioning, strange noises, leaks, or required replacements..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>

          {/* Image Upload Area */}
          <div className="form-group">
            <label className="form-label">Attach Photos of the Issue (Optional)</label>
            <div
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('maintenance-file-input').click()}
            >
              <Upload size={24} color="var(--primary)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Click to browse photos</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>JPG, PNG up to 10MB</div>
              <input
                id="maintenance-file-input"
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleImageChange}
              />
            </div>

            {/* Uploaded Previews */}
            {imagePreviewUrls.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                {imagePreviewUrls.map((url, idx) => (
                  <div key={idx} style={{ position: 'relative', width: '60px', height: '60px' }}>
                    <img
                      src={url}
                      alt="Uploaded preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-xs)' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeUploadedImage(idx)}
                      style={{
                        position: 'absolute',
                        top: '-4px',
                        right: '-4px',
                        background: 'var(--danger)',
                        color: '#FFFFFF',
                        borderRadius: '50%',
                        padding: '2px',
                        lineHeight: 1
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={15} /> Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* Ticket Details & Timeline Tracking Modal */}
      {selectedTicket && (
        <Modal
          isOpen={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          title={`Ticket #${selectedTicket.id}: ${selectedTicket.title}`}
          maxWidth="640px"
        >
          <div>
            {/* Badges strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <StatusBadge status={selectedTicket.status} />
              <span className={`badge badge-${selectedTicket.priority?.toLowerCase() || 'medium'}`}>
                {selectedTicket.priority} Priority
              </span>
              <span className="badge badge-info">{selectedTicket.category}</span>
              <span className="badge badge-neutral">{selectedTicket.location}</span>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '20px' }}>
              {selectedTicket.description}
            </p>

            {/* 4-Step Resolution Timeline */}
            <div style={{ background: 'var(--bg-subtle)', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '14px' }}>
                Resolution Progress Timeline
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {selectedTicket.timeline.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: step.completed ? 'var(--success)' : '#CBD5E1',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {step.completed ? '✓' : idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: step.completed ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {step.step}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {step.date}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {step.notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Discussion / Comments Section */}
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>
                Updates & Technician Notes
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px', maxHeight: '180px', overflowY: 'auto' }}>
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment) => (
                    <div
                      key={comment.id}
                      style={{
                        padding: '10px 12px',
                        background: comment.role === 'Tenant' ? 'var(--primary-light)' : '#FFFFFF',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.825rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {comment.author} ({comment.role})
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {comment.timestamp}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {comment.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No messages yet.</p>
                )}
              </div>

              {/* Add Comment Input */}
              <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Type an update or instruction for the technician..."
                  className="form-input"
                  style={{ height: '38px', fontSize: '0.85rem' }}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  Send
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

