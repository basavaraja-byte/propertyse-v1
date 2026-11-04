import React from 'react';
import { Building2, LogIn, CheckCircle2, Shield } from 'lucide-react';
import { useTenant } from '../context/TenantContext';

export const LogoutScreen = () => {
  const { setIsSignedOut, setActiveModule, tenant } = useTenant();

  const handleReturn = () => {
    setIsSignedOut(false);
    setActiveModule('dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          padding: '40px 32px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #4168DF 0%, #2544B3 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 20px rgba(65, 104, 223, 0.35)'
          }}
        >
          <Building2 size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Signed Out of PropertySE
        </h1>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          Your demo session for <strong>{tenant.name}</strong> has been safely concluded. No changes were sent to external production systems.
        </p>

        <div
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '14px',
            fontSize: '0.8rem',
            color: 'var(--text-secondary)',
            marginBottom: '28px',
            textAlign: 'left'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>
            <Shield size={16} color="var(--primary)" /> Future Single Sign-On (SSO) Integration
          </div>
          <div>
            In production, authentication will be connected directly to the PropertySE unified backend using JWT and Supabase Auth.
          </div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          onClick={handleReturn}
          style={{ width: '100%' }}
        >
          <LogIn size={18} /> Return to Tenant Dashboard Demo
        </button>
      </div>
    </div>
  );
};

