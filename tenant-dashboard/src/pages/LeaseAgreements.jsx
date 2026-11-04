import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Send,
  AlertCircle,
  Shield,
  FileCheck,
  Building,
  UserCheck,
  Check
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Modal } from '../components/layout/Modal';

export const LeaseAgreements = () => {
  const { lease, property, tenant, submitLeaseRenewal } = useTenant();

  // Renewal Modal State
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [preferredDuration, setPreferredDuration] = useState('12');
  const [renewalMessage, setRenewalMessage] = useState(
    'Dear Mr. Rajesh Verma, I would like to extend my tenancy for another 12-month term under standard terms. Please let me know your thoughts.'
  );

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState(null);

  // Calculate days remaining
  const today = new Date();
  const leaseEndDate = new Date(lease.endDate);
  const daysRemaining = Math.max(0, Math.ceil((leaseEndDate - today) / (1000 * 60 * 60 * 24)));

  const handleRenewalSubmit = (e) => {
    e.preventDefault();
    submitLeaseRenewal({
      durationMonths: Number(preferredDuration),
      message: renewalMessage
    });
    setIsRenewalModalOpen(false);
  };

  const handleDownloadDoc = (doc) => {
    const sampleContent = `
============================================================
              PROPERTYSE LEASE RECORD DOCUMENT
============================================================
Document: ${doc.title}
Agreement Number: ${lease.agreementNumber}
Tenant: ${tenant.name} (ID: ${tenant.id})
Owner: ${property.owner.name}
Property: ${property.name}, Unit ${property.unit}
Term: ${lease.startDate} to ${lease.endDate}
Rent: INR ${lease.monthlyRent.toLocaleString('en-IN')}/month
Security Deposit: INR ${lease.securityDeposit.toLocaleString('en-IN')}

Certified copy retrieved from PropertySE Tenant Portal.
============================================================
    `;
    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Lease & Agreements"
        subtitle="Review your registered residential agreement, track lease milestones, and manage renewal options."
        breadcrumb="Lease & Agreements"
      >
        <button
          className="btn btn-primary"
          onClick={() => setIsRenewalModalOpen(true)}
          disabled={lease.renewalStatus === 'Pending Owner Approval' || lease.renewalStatus === 'Approved'}
        >
          <FileCheck size={16} />
          {lease.renewalStatus === 'Pending Owner Approval'
            ? 'Renewal Request Pending'
            : lease.renewalStatus === 'Approved'
            ? 'Lease Renewed'
            : 'Request Lease Renewal'}
        </button>
      </PageHeader>

      {/* Renewal Status Alert if already submitted */}
      {lease.renewalStatus !== 'Not Requested' && (
        <div
          style={{
            background: lease.renewalStatus === 'Approved' ? 'var(--success-bg)' : 'var(--warning-bg)',
            border: `1px solid ${lease.renewalStatus === 'Approved' ? 'var(--success)' : 'var(--warning)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle
              size={22}
              color={lease.renewalStatus === 'Approved' ? 'var(--success)' : 'var(--warning)'}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Renewal Status: {lease.renewalStatus}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {lease.renewalStatus === 'Pending Owner Approval'
                  ? 'Your request for a 12-month extension has been forwarded to owner Rajesh Verma. You will be notified as soon as it is reviewed.'
                  : 'Your renewal has been approved! The updated agreement will take effect starting 01 January 2027.'}
              </div>
            </div>
          </div>
          <StatusBadge status={lease.renewalStatus} />
        </div>
      )}

      {/* Main Grid: Left Overview & Documents, Right Timeline & Expiry alert */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left Column: Agreement Terms & Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Lease Overview Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Shield size={19} color="var(--primary)" /> Agreement Overview
                </h2>
                <p className="card-subtitle">Registered Tenancy Agreement Summary</p>
              </div>
              <StatusBadge status={lease.status} />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '14px',
                padding: '16px',
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '20px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Agreement No</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'monospace' }}>
                  {lease.agreementNumber}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Term Duration</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{lease.durationMonths} Months</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Monthly Rent</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{lease.monthlyRent.toLocaleString('en-IN')}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Security Deposit</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>₹{lease.securityDeposit.toLocaleString('en-IN')}</div>
              </div>
            </div>

            {/* Terms List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Agreement Start Date:</span>
                <strong>{lease.startDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Agreement Expiry Date:</span>
                <strong>{lease.endDate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Notice Period:</span>
                <strong>{lease.noticePeriodDays} Days written notice</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Lock-in Period:</span>
                <strong>{lease.lockInPeriodMonths} Months (Completed)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Rent Escalation Clause:</span>
                <span>{lease.escalationClause}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Permitted Occupants:</span>
                <span>{lease.permittedOccupants}</span>
              </div>
            </div>
          </div>

          {/* Agreement Documents List */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <FileText size={19} color="var(--primary)" /> Executed Lease Documents
                </h2>
                <p className="card-subtitle">Digital signed copies of legal tenancy records</p>
              </div>
              <span className="badge badge-paid">4 Documents</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lease.documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    transition: 'border-color var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {doc.format} • {doc.size} • Signed by {doc.signedBy}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPreviewDoc(doc)}
                      title="Preview Document"
                    >
                      <Eye size={14} /> Preview
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleDownloadDoc(doc)}
                      title="Download Demo File"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Visual Timeline & Expiry Notification */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Expiry Reminder Box */}
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
              border: '1px solid #FCD34D'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Clock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#92400E', marginBottom: '4px' }}>
                  Lease Concluding in {daysRemaining} Days
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#B45309', lineHeight: 1.5, marginBottom: '14px' }}>
                  Your tenancy concludes on <strong>31 December 2026</strong>. If you intend to renew or vacate, please submit your renewal request or 30-day notice prior to <strong>01 December 2026</strong>.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setIsRenewalModalOpen(true)}
                  disabled={lease.renewalStatus === 'Pending Owner Approval'}
                >
                  {lease.renewalStatus === 'Pending Owner Approval' ? 'Renewal Pending' : 'Initiate Renewal Now'}
                </button>
              </div>
            </div>
          </div>

          {/* Visual Lease Progress Timeline */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '20px' }}>
              <Clock size={19} color="var(--primary)" /> Tenancy Milestone Timeline
            </h2>

            <div style={{ position: 'relative', paddingLeft: '32px' }}>
              {/* Vertical line connecting stages */}
              <div
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '12px',
                  bottom: '12px',
                  width: '2px',
                  backgroundColor: 'var(--border-color)'
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {lease.timeline.map((stage) => {
                  const isCompleted = stage.status === 'completed';
                  const isCurrent = stage.status === 'current';

                  return (
                    <div key={stage.id} style={{ position: 'relative' }}>
                      {/* Node Dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-32px',
                          top: '2px',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: isCompleted
                            ? 'var(--success)'
                            : isCurrent
                            ? 'var(--primary)'
                            : '#E2E8F0',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isCurrent ? '0 0 0 4px var(--primary-light)' : 'none'
                        }}
                      >
                        {isCompleted ? <Check size={14} /> : <span style={{ fontSize: '0.7rem' }}>●</span>}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {stage.title}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: isCompleted
                                ? 'var(--success-bg)'
                                : isCurrent
                                ? 'var(--primary-light)'
                                : 'var(--bg-subtle)',
                              color: isCompleted
                                ? 'var(--success)'
                                : isCurrent
                                ? 'var(--primary)'
                                : 'var(--text-muted)'
                            }}
                          >
                            {stage.date}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Landlord Renewal Authority Disclaimer Card */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}
          >
            <strong>Note on Lease Extensions:</strong> Final renewal authorization remains with landlord <strong>{property.owner.name}</strong>. Submission of a renewal request creates a formal proposal for mutual agreement and revised stamp paper execution.
          </div>
        </div>
      </div>

      {/* Renewal Request Modal */}
      <Modal
        isOpen={isRenewalModalOpen}
        onClose={() => setIsRenewalModalOpen(false)}
        title="Submit Lease Renewal Request"
        maxWidth="540px"
      >
        <form onSubmit={handleRenewalSubmit}>
          <div style={{ marginBottom: '18px' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Propose an agreement extension for <strong>{property.name}, Unit {property.unit}</strong>. Your landlord will receive this request immediately.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">
              Requested Extension Duration <span className="required">*</span>
            </label>
            <select
              className="form-select"
              value={preferredDuration}
              onChange={(e) => setPreferredDuration(e.target.value)}
              required
            >
              <option value="12">12 Months (01 Jan 2027 – 31 Dec 2027) — Recommended</option>
              <option value="6">6 Months (01 Jan 2027 – 30 Jun 2027)</option>
              <option value="24">24 Months (01 Jan 2027 – 31 Dec 2028)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Message to Property Owner <span className="required">*</span>
            </label>
            <textarea
              className="form-textarea"
              rows={4}
              value={renewalMessage}
              onChange={(e) => setRenewalMessage(e.target.value)}
              required
            />
            <span className="form-helper">
              Include any remarks regarding tenancy terms or planned upgrades.
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsRenewalModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Send size={15} /> Submit Renewal Request
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.title}`}
          maxWidth="640px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
              <button className="btn btn-primary" onClick={() => handleDownloadDoc(previewDoc)}>
                <Download size={15} /> Download Document
              </button>
            </>
          }
        >
          <div style={{ background: 'var(--bg-subtle)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>
                {previewDoc.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Agreement Record ID: {previewDoc.id} • Registered State: Karnataka
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>
              <p style={{ marginBottom: '12px' }}>
                This document certifies the legally registered residential lease agreement entered between <strong>{property.owner.name}</strong> (Lessor) and <strong>{tenant.name}</strong> (Lessee) for Unit {property.unit}, Green Valley Residency, Bengaluru.
              </p>
              <p style={{ marginBottom: '12px' }}>
                <strong>Key Clauses Verified:</strong>
              </p>
              <ul style={{ paddingLeft: '20px', marginBottom: '12px' }}>
                <li>Tenancy Period: 12 Calendar Months (Jan 01, 2026 - Dec 31, 2026)</li>
                <li>Monthly Rent: INR 18,000.00 payable before the 5th of each month</li>
                <li>Refundable Security Deposit: INR 50,000.00 held in Escrow</li>
                <li>Notice Period for Vacation: 30 Calendar Days</li>
              </ul>
              <div style={{ marginTop: '16px', padding: '10px 14px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Digital signature authenticated by PropertySE Trust Network. Hash: #SHA256-49201948102
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

