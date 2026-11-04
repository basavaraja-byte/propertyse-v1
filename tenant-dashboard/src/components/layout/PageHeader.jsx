import React from 'react';

export const PageHeader = ({ title, subtitle, breadcrumb, children }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '16px',
      marginBottom: '28px'
    }}>
      <div>
        {breadcrumb && (
          <div style={{
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>PropertySE</span>
            <span>/</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{breadcrumb}</span>
          </div>
        )}
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          lineHeight: 1.2
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--text-secondary)',
            marginTop: '4px'
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {children}
        </div>
      )}
    </div>
  );
};

