import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  confirmVariant = "primary",
  isLoading = false
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="460px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          backgroundColor: confirmVariant === 'danger' ? 'var(--danger-bg)' : 'var(--primary-light)',
          color: confirmVariant === 'danger' ? 'var(--danger)' : 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <AlertTriangle size={22} />
        </div>
        <div>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
            {message}
          </p>
        </div>
      </div>
    </Modal>
  );
};

