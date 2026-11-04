import React from 'react';
import { FolderSearch } from 'lucide-react';

export const EmptyState = ({ icon: Icon = FolderSearch, title = "No records found", description, actionButton }) => {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        backgroundColor: '#F1F5F9',
        color: '#94A3B8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <Icon size={32} />
      </div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: 1.5, marginBottom: '20px' }}>
          {description}
        </p>
      )}
      {actionButton}
    </div>
  );
};

