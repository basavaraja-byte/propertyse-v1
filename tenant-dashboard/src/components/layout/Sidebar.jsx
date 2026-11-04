import React from 'react';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  FileCheck,
  Wrench,
  Bell,
  FolderArchive,
  LifeBuoy,
  User,
  LogOut,
  X,
  ShieldCheck
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export const Sidebar = () => {
  const {
    activeModule,
    setActiveModule,
    sidebarOpen,
    setSidebarOpen,
    unreadNotificationsCount,
    maintenanceRequests,
    tenant,
    property
  } = useTenant();

  const openMaintenanceCount = maintenanceRequests.filter(
    (m) => m.status === 'Submitted' || m.status === 'Acknowledged' || m.status === 'In Progress'
  ).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'property', label: 'My Property', icon: Building2 },
    { id: 'rent-payments', label: 'Rent & Payments', icon: CreditCard },
    { id: 'lease', label: 'Lease & Agreements', icon: FileCheck },
    {
      id: 'maintenance',
      label: 'Maintenance',
      icon: Wrench,
      badge: openMaintenanceCount > 0 ? openMaintenanceCount : null,
      badgeType: 'warning'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,
      badgeType: 'danger'
    },
    { id: 'documents', label: 'Documents', icon: FolderArchive },
    { id: 'support', label: 'Support & Help', icon: LifeBuoy },
    { id: 'profile', label: 'My Profile', icon: User }
  ];

  const handleNavClick = (id) => {
    setActiveModule(id);
    if (sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 45
          }}
        />
      )}

      <aside
        style={{
          width: 'var(--sidebar-width)',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          transition: 'transform var(--transition-normal)',
          transform: sidebarOpen ? 'translateX(0)' : undefined
        }}
        className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '22px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4168DF 0%, #2544B3 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(65, 104, 223, 0.35)'
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  Property<span style={{ color: 'var(--primary)' }}>SE</span>
                </span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)'
                  }}
                >
                  TENANT
                </span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Resident Portal
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            className="mobile-close-btn"
            onClick={() => setSidebarOpen(false)}
            style={{
              display: 'none',
              padding: '6px',
              borderRadius: '6px',
              color: 'var(--text-secondary)'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Assigned Property Tag */}
        <div style={{ padding: '12px 18px', backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {property.unit} • {property.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Tenant: {tenant.name.split(' ')[0]} (Active)
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
            Main Menu
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--primary)' : 'var(--text-primary)',
                    backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                    transition: 'all var(--transition-fast)',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon
                      size={18}
                      color={isActive ? 'var(--primary)' : '#64748B'}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        padding: '2px 7px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-full)',
                        backgroundColor:
                          item.badgeType === 'danger'
                            ? 'var(--danger)'
                            : item.badgeType === 'warning'
                            ? 'var(--warning)'
                            : 'var(--primary)',
                        color: '#FFFFFF'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '15%',
                        height: '70%',
                        width: '3.5px',
                        backgroundColor: 'var(--primary)',
                        borderRadius: '0 4px 4px 0'
                      }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area with Tenant Profile & Logout */}
        <div style={{ padding: '14px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-subtle)' }}>
          {/* Tenant Mini Card */}
          <div
            onClick={() => handleNavClick('profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              marginBottom: '8px',
              transition: 'background-color var(--transition-fast)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <img
              src={tenant.avatarUrl}
              alt={tenant.name}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--border-color)'
              }}
            />
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tenant.name}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {tenant.id}
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <button
            onClick={() => handleNavClick('logout')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--danger)',
              transition: 'background-color var(--transition-fast)'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

