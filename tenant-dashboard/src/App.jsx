import React, { useState } from 'react';
import { useTenant, TenantProvider } from './context/TenantContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ConfirmDialog } from './components/layout/ConfirmDialog';
import { Dashboard } from './pages/Dashboard';
import { MyProperty } from './pages/MyProperty';
import { RentPayments } from './pages/RentPayments';
import { LeaseAgreements } from './pages/LeaseAgreements';
import { MaintenanceRequests } from './pages/MaintenanceRequests';
import { Notifications } from './pages/Notifications';
import { Documents } from './pages/Documents';
import { SupportCommunication } from './pages/SupportCommunication';
import { MyProfile } from './pages/MyProfile';
import { LogoutScreen } from './pages/LogoutScreen';
import { CheckCircle2, AlertCircle, RefreshCw, Database } from 'lucide-react';

const AppContent = () => {
  const {
    activeModule,
    setActiveModule,
    isSignedOut,
    setIsSignedOut,
    toast,
    supabaseStatus,
    isLoadingLive,
    refreshLiveData
  } = useTenant();

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // If activeModule is set to 'logout', trigger confirmation
  React.useEffect(() => {
    if (activeModule === 'logout') {
      setIsLogoutModalOpen(true);
    }
  }, [activeModule]);

  if (isSignedOut) {
    return <LogoutScreen />;
  }

  // Render module corresponding to activeModule
  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'property':
        return <MyProperty />;
      case 'rent-payments':
        return <RentPayments />;
      case 'lease':
        return <LeaseAgreements />;
      case 'maintenance':
        return <MaintenanceRequests />;
      case 'notifications':
        return <Notifications />;
      case 'documents':
        return <Documents />;
      case 'support':
        return <SupportCommunication />;
      case 'profile':
        return <MyProfile />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Topbar />

        {/* Global Supabase / Environment Status Banner */}
        <div className="demo-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color={supabaseStatus === 'connected' ? '#15803D' : '#D97706'} />
            <span>
              <strong>SUPABASE DATABASE:</strong>{' '}
              {supabaseStatus === 'connected' ? (
                <span style={{ color: '#15803D', fontWeight: 600 }}>Connected to PropertySE Supabase PostgreSQL (Project: oyjmdtngezoqvgkqfhay)</span>
              ) : (
                <span style={{ color: '#9A3412' }}>Awaiting Schema Migration Approval / Tenant Auth in Phase 2</span>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={refreshLiveData}
              disabled={isLoadingLive}
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#9A3412',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                background: 'transparent',
                border: 'none',
                padding: '2px 6px'
              }}
              title="Refresh data from Supabase"
            >
              <RefreshCw size={12} className={isLoadingLive ? 'spin' : ''} />
              {isLoadingLive ? 'Syncing...' : 'Sync Supabase'}
            </button>
            <span style={{ fontSize: '0.72rem', color: '#B45309' }}>
              Persistent LocalStorage Fallback Active
            </span>
          </div>
        </div>

        <main className="content-container">
          {renderActiveModule()}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => {
          setIsLogoutModalOpen(false);
          setActiveModule('dashboard');
        }}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          setIsSignedOut(true);
        }}
        title="Sign Out of Tenant Portal"
        message="Are you sure you want to end your current resident session? You can return to the demo at any time."
        confirmText="Confirm Sign Out"
        confirmVariant="danger"
      />

      {/* Global Toast Alert */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1E293B',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out',
            fontSize: '0.875rem',
            fontWeight: 600
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} color="var(--danger)" />
          ) : (
            <CheckCircle2 size={18} color="var(--success)" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export const App = () => {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
};

export default App;
