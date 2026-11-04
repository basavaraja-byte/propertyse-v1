import React from 'react';

export const StatCard = ({ icon: Icon, title, value, subtext, badgeText, badgeType = 'info', onClick, actionLabel }) => {
  return (
    <div 
      className={`card stat-card ${onClick ? 'stat-card-clickable' : ''}`}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={20} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {value}
        </span>
        {badgeText && (
          <span className={`badge badge-${badgeType}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
            {badgeText}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        {subtext && (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {subtext}
          </span>
        )}
        {actionLabel && (
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
            {actionLabel} →
          </span>
        )}
      </div>
    </div>
  );
};

