import React from 'react';

export const StatusBadge = ({ status, type = 'status' }) => {
  if (!status) return null;

  const normalized = status.toString().toLowerCase().replace(/\s+/g, '-');

  // Map status to badge class
  let badgeClass = 'badge-neutral';

  if (['paid', 'resolved', 'approved', 'completed', 'active', 'verified'].includes(normalized)) {
    badgeClass = 'badge-paid';
  } else if (['pending', 'in-progress', 'acknowledged', 'pending-owner-approval', 'open'].includes(normalized)) {
    badgeClass = 'badge-pending';
  } else if (['overdue', 'failed', 'emergency', 'urgent', 'rejected', 'terminated'].includes(normalized)) {
    badgeClass = 'badge-overdue';
  } else if (['submitted', 'medium', 'expiring-soon', 'current'].includes(normalized)) {
    badgeClass = 'badge-info';
  } else if (['low', 'not-requested'].includes(normalized)) {
    badgeClass = 'badge-neutral';
  }

  return (
    <span className={`badge ${badgeClass}`}>
      <span className="badge-dot" style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'currentColor',
        display: 'inline-block'
      }}></span>
      {status}
    </span>
  );
};

