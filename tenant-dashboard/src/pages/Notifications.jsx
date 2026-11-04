import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Trash2,
  Filter,
  CheckCheck,
  CreditCard,
  Wrench,
  FileText,
  AlertCircle,
  Megaphone,
  Info,
  ArrowRight
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/layout/EmptyState';

export const Notifications = () => {
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    unreadNotificationsCount,
    setActiveModule
  } = useTenant();

  const [categoryFilter, setCategoryFilter] = useState('All');
  const [readFilter, setReadFilter] = useState('All'); // 'All', 'Unread', 'Read'

  // Filtered notifications
  const filteredNotifications = notifications.filter((notif) => {
    const matchesCategory = categoryFilter === 'All' || notif.category === categoryFilter;
    const matchesRead =
      readFilter === 'All' ||
      (readFilter === 'Unread' && !notif.isRead) ||
      (readFilter === 'Read' && notif.isRead);
    return matchesCategory && matchesRead;
  });

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={18} color="var(--success)" />;
      case 'maintenance':
        return <Wrench size={18} color="var(--warning)" />;
      case 'lease':
        return <FileText size={18} color="var(--info)" />;
      case 'notice':
        return <AlertCircle size={18} color="#D97706" />;
      case 'announcement':
        return <Megaphone size={18} color="var(--primary)" />;
      default:
        return <Bell size={18} color="var(--primary)" />;
    }
  };

  const categories = [
    'All',
    'Payment Confirmations',
    'Maintenance Updates',
    'Lease Updates',
    'Property Notices',
    'Owner Announcements',
    'General Updates'
  ];

  return (
    <div>
      <PageHeader
        title="Notification Center"
        subtitle="Real-time alerts, payment confirmations, maintenance status updates, and community notices."
        breadcrumb="Notifications"
      >
        <button
          className="btn btn-secondary"
          onClick={markAllAsRead}
          disabled={unreadNotificationsCount === 0}
        >
          <CheckCheck size={16} /> Mark All as Read
        </button>
      </PageHeader>

      {/* Future Integration Disclaimer */}
      <div
        style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          fontSize: '0.825rem',
          color: 'var(--text-secondary)'
        }}
      >
        <Info size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Automated Delivery Channels:</strong> In-app notifications are live in this demo. SMS gateway and Email dispatch will be enabled upon PropertySE backend integration.
        </span>
      </div>

      {/* Filter Toolbar Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Read / Unread Filter Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setReadFilter('All')}
              className={`btn btn-sm ${readFilter === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setReadFilter('Unread')}
              className={`btn btn-sm ${readFilter === 'Unread' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Unread ({unreadNotificationsCount})
            </button>
            <button
              onClick={() => setReadFilter('Read')}
              className={`btn btn-sm ${readFilter === 'Read' ? 'btn-primary' : 'btn-secondary'}`}
            >
              Read ({notifications.length - unreadNotificationsCount})
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Category:
            </span>
            <select
              className="form-select"
              style={{ width: '220px', height: '36px', fontSize: '0.85rem' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="card"
              style={{
                padding: '18px 20px',
                borderLeft: !notif.isRead ? '4px solid var(--primary)' : '1px solid var(--border-color)',
                backgroundColor: !notif.isRead ? '#FBFDFF' : '#FFFFFF',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all var(--transition-fast)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1 }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {getNotificationIcon(notif.type)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {notif.title}
                    </h3>
                    <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                      {notif.category}
                    </span>
                    {!notif.isRead && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--danger-bg)',
                          color: 'var(--danger)',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                    {notif.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{new Date(notif.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>

                    {notif.targetModule && (
                      <button
                        onClick={() => {
                          markAsRead(notif.id);
                          setActiveModule(notif.targetModule);
                        }}
                        style={{
                          color: 'var(--primary)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {notif.actionLabel || 'Go to Module'} <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!notif.isRead && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => markAsRead(notif.id)}
                    title="Mark as read"
                  >
                    <CheckCircle2 size={14} /> Mark Read
                  </button>
                )}
                <button
                  className="btn-icon"
                  style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }}
                  onClick={() => deleteNotification(notif.id)}
                  title="Delete notification"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications found"
            description="You are all caught up! New alerts regarding rent deadlines, repairs, and community announcements will appear here."
          />
        )}
      </div>
    </div>
  );
};

