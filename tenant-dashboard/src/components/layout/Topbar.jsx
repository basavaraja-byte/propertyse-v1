import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Bell,
  Search,
  User,
  Shield,
  RotateCcw,
  LogOut,
  ChevronDown,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export const Topbar = () => {
  const {
    tenant,
    property,
    unreadNotificationsCount,
    notifications,
    setActiveModule,
    setSidebarOpen,
    markAsRead,
    resetDemoData
  } = useTenant();

  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format current date
  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(new Date());

  // Time based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <header
      style={{
        height: 'var(--topbar-height)',
        backgroundColor: 'var(--bg-topbar)',
        borderBottom: '1px solid var(--border-color)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      {/* Left: Mobile hamburger & Greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            display: 'none',
            padding: '8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {getGreeting()}, {tenant.name.split(' ')[0]} 👋
            </span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CheckCircle2 size={12} /> Unit {property.unit}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{todayFormatted}</span>
            <span>•</span>
            <span style={{ color: 'var(--text-muted)' }}>{property.name}</span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Quick Demo Reset Pill */}
        <button
          onClick={resetDemoData}
          title="Reset sample state back to clean defaults"
          style={{
            fontSize: '0.75rem',
            padding: '5px 10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RotateCcw size={13} />
          <span className="hide-on-mobile">Reset Demo</span>
        </button>

        {/* Notifications Icon with Dropdown */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="btn-icon"
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            style={{ position: 'relative' }}
            aria-label="View notifications"
          >
            <Bell size={19} />
            {unreadNotificationsCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'var(--danger)',
                  borderRadius: '50%',
                  border: '2px solid #FFFFFF'
                }}
              />
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {notifDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '360px',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--border-color)',
                zIndex: 60,
                animation: 'scaleUp 0.15s ease-out'
              }}
            >
              <div
                style={{
                  padding: '14px 18px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  <span
                    style={{
                      marginLeft: '8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--danger-bg)',
                      color: 'var(--danger)'
                    }}
                  >
                    {unreadNotificationsCount} unread
                  </span>
                </div>
                <button
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    setActiveModule('notifications');
                  }}
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  View All
                </button>
              </div>

              {/* Notification list preview (top 4) */}
              <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markAsRead(n.id);
                      setNotifDropdownOpen(false);
                      if (n.targetModule) setActiveModule(n.targetModule);
                    }}
                    style={{
                      padding: '12px 18px',
                      borderBottom: '1px solid var(--border-light)',
                      cursor: 'pointer',
                      backgroundColor: n.isRead ? '#FFFFFF' : 'var(--primary-light)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '4px' }} />
                      )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.message.length > 70 ? `${n.message.substring(0, 70)}...` : n.message}
                    </p>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: '10px',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-subtle)',
                  borderTop: '1px solid var(--border-color)',
                  borderBottomLeftRadius: 'var(--radius-lg)',
                  borderBottomRightRadius: 'var(--radius-lg)'
                }}
              >
                <button
                  onClick={() => {
                    setNotifDropdownOpen(false);
                    setActiveModule('notifications');
                  }}
                  style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  Open Notification Center →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown Menu */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 8px 4px 4px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer'
            }}
          >
            <img
              src={tenant.avatarUrl}
              alt={tenant.name}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover'
              }}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }} className="hide-on-mobile">
              {tenant.name.split(' ')[0]}
            </span>
            <ChevronDown size={14} color="var(--text-secondary)" />
          </button>

          {profileDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 10px)',
                right: 0,
                width: '240px',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--border-color)',
                zIndex: 60,
                padding: '8px 0',
                animation: 'scaleUp 0.15s ease-out'
              }}
            >
              {/* Tenant info header */}
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                  {tenant.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {tenant.email}
                </div>
              </div>

              {/* Links */}
              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setActiveModule('profile');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <User size={16} color="var(--text-secondary)" />
                <span>My Profile</span>
              </button>

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setActiveModule('support');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Shield size={16} color="var(--text-secondary)" />
                <span>Emergency Help</span>
              </button>

              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '6px 0' }} />

              <button
                onClick={() => {
                  setProfileDropdownOpen(false);
                  setActiveModule('logout');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '9px 16px',
                  fontSize: '0.85rem',
                  color: 'var(--danger)'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--danger-bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

