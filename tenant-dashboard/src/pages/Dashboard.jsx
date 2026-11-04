import React from 'react';
import {
  DollarSign,
  Calendar,
  ShieldCheck,
  Clock,
  Wrench,
  Bell,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  FileText,
  MessageSquare,
  Home,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { StatCard } from '../components/layout/StatCard';
import { StatusBadge } from '../components/layout/StatusBadge';

export const Dashboard = () => {
  const {
    tenant,
    property,
    payments,
    lease,
    maintenanceRequests,
    notifications,
    unreadNotificationsCount,
    setActiveModule
  } = useTenant();

  // Metrics calculation
  const openMaintenance = maintenanceRequests.filter(
    (m) => m.status === 'Submitted' || m.status === 'Acknowledged' || m.status === 'In Progress'
  );
  const resolvedMaintenance = maintenanceRequests.filter((m) => m.status === 'Resolved');
  const latestMaintenance = maintenanceRequests[0];
  const latestPayment = payments.transactions[0];

  // Days remaining on lease
  const today = new Date();
  const leaseEndDate = new Date(lease.endDate);
  const daysRemaining = Math.max(0, Math.ceil((leaseEndDate - today) / (1000 * 60 * 60 * 24)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* 1. Welcome Section */}
      <div
        className="card welcome-banner"
        style={{
          background: 'linear-gradient(135deg, #1D2940 0%, #293B5C 100%)',
          color: '#FFFFFF',
          padding: '28px 32px',
          border: 'none',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '720px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(65, 104, 223, 0.35)',
                color: '#93C5FD',
                letterSpacing: '0.04em'
              }}
            >
              TENANT PORTAL • {tenant.id}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
              Unit {property.unit}
            </span>
          </div>

          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            Welcome back, {tenant.name}!
          </h1>

          <p style={{ fontSize: '0.95rem', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '20px' }}>
            Manage your tenancy at <strong>{property.name}</strong>, track maintenance status, view verified payment history, and connect directly with your landlord.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              className="btn btn-primary"
              onClick={() => setActiveModule('rent-payments')}
              style={{ backgroundColor: '#4168DF', border: 'none' }}
            >
              <DollarSign size={16} /> Pay Rent / View Ledger
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setActiveModule('maintenance')}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)', color: '#FFFFFF', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              <PlusCircle size={16} /> Raise Maintenance Request
            </button>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            bottom: '-50px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(65, 104, 223, 0.25) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}
        />
      </div>

      {/* 2. Overview Stat Cards (6 Key Metrics) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '18px'
        }}
      >
        <StatCard
          icon={DollarSign}
          title="Monthly Rent"
          value={`₹${payments.monthlyRent.toLocaleString('en-IN')}`}
          subtext={`Due: ${payments.rentDueDate}`}
          onClick={() => setActiveModule('rent-payments')}
          actionLabel="Details"
        />

        <StatCard
          icon={Calendar}
          title="Next Due Date"
          value={new Date(payments.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
          subtext="December Cycle"
          onClick={() => setActiveModule('rent-payments')}
          actionLabel="Pay"
        />

        <StatCard
          icon={CheckCircle2}
          title="Payment Status"
          value={payments.currentMonthStatus}
          badgeText={payments.currentMonthStatus === 'Paid' ? 'On Time' : 'Action Needed'}
          badgeType={payments.currentMonthStatus === 'Paid' ? 'paid' : 'pending'}
          subtext={payments.outstandingAmount === 0 ? 'No outstanding dues' : `Due: ₹${payments.outstandingAmount}`}
          onClick={() => setActiveModule('rent-payments')}
        />

        <StatCard
          icon={Clock}
          title="Lease Expiry"
          value={`${daysRemaining} Days`}
          subtext={`Ends ${new Date(lease.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          badgeText={lease.renewalStatus !== 'Not Requested' ? lease.renewalStatus : 'Renewal Open'}
          badgeType={lease.renewalStatus === 'Approved' ? 'paid' : 'info'}
          onClick={() => setActiveModule('lease')}
          actionLabel="Lease"
        />

        <StatCard
          icon={Wrench}
          title="Active Requests"
          value={openMaintenance.length}
          subtext={`${resolvedMaintenance.length} resolved to date`}
          badgeText={openMaintenance.length > 0 ? 'In Progress' : 'All Clear'}
          badgeType={openMaintenance.length > 0 ? 'pending' : 'paid'}
          onClick={() => setActiveModule('maintenance')}
          actionLabel="View"
        />

        <StatCard
          icon={Bell}
          title="Unread Notices"
          value={unreadNotificationsCount}
          subtext={`${notifications.length} total updates`}
          badgeText={unreadNotificationsCount > 0 ? 'Unread' : 'Caught Up'}
          badgeType={unreadNotificationsCount > 0 ? 'overdue' : 'neutral'}
          onClick={() => setActiveModule('notifications')}
          actionLabel="Notices"
        />
      </div>

      {/* 3. Main Dashboard Grid: Left 2 Cols (Property & Summaries), Right 1 Col (Activity & Actions) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '24px'
        }}
      >
        {/* Left Column: Property Overview & Financial Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Property Overview Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <Home size={19} color="var(--primary)" /> Assigned Property
                </h2>
                <p className="card-subtitle">Verified tenancy record</p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setActiveModule('property')}
              >
                View Full Property <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '18px', alignItems: 'center' }}>
              <img
                src={property.images[0].url}
                alt={property.name}
                style={{
                  width: '100%',
                  height: '115px',
                  borderRadius: 'var(--radius-md)',
                  objectFit: 'cover'
                }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {property.name}
                  </h3>
                  <span className="badge badge-info">Unit {property.unit}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {property.address}, {property.city}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                  <span><strong>Type:</strong> {property.type}</span>
                  <span>•</span>
                  <span><strong>Area:</strong> {property.carpetArea}</span>
                  <span>•</span>
                  <span><strong>Move-in:</strong> {property.moveInDate}</span>
                </div>
              </div>
            </div>

            {/* Landlord Contact Bar */}
            <div
              style={{
                marginTop: '18px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img
                  src={property.owner.avatar}
                  alt={property.owner.name}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{property.owner.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Property Owner (Landlord)</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <a
                  href={`tel:${property.owner.phone}`}
                  className="btn btn-secondary btn-sm"
                  title="Call owner"
                >
                  Call: {property.owner.phone}
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveModule('support')}
                >
                  Message
                </button>
              </div>
            </div>
          </div>

          {/* Rent & Financial Summary Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  <DollarSign size={19} color="var(--primary)" /> Rent & Payment Summary
                </h2>
                <p className="card-subtitle">Current billing cycle and ledger</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setActiveModule('rent-payments')}
              >
                Payment Center
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '14px',
                marginBottom: '18px'
              }}
            >
              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Base Rent</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>₹{payments.monthlyRent.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+ ₹2,000 maintenance</div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Security Deposit</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>₹{payments.securityDeposit.toLocaleString('en-IN')}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600 }}>Held in Escrow</div>
              </div>
              <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Outstanding</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: payments.outstandingAmount > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  ₹{payments.outstandingAmount.toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Current balance</div>
              </div>
            </div>

            {/* Last Transaction Bar */}
            {latestPayment && (
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem'
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Last Paid:</span>{' '}
                  <strong>₹{latestPayment.totalAmount.toLocaleString('en-IN')}</strong> ({latestPayment.period})
                  <span style={{ color: 'var(--text-muted)', marginLeft: '8px', fontSize: '0.78rem' }}>
                    on {latestPayment.date}
                  </span>
                </div>
                <StatusBadge status={latestPayment.status} />
              </div>
            )}
          </div>

          {/* Maintenance & Lease Overview Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            {/* Maintenance Summary Box */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Wrench size={16} color="var(--primary)" /> Maintenance
                </h3>
                <button
                  onClick={() => setActiveModule('maintenance')}
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  View All ({maintenanceRequests.length})
                </button>
              </div>

              {latestMaintenance ? (
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '4px' }}>
                    {latestMaintenance.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <StatusBadge status={latestMaintenance.status} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {latestMaintenance.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {latestMaintenance.description}
                  </p>
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  No maintenance requests lodged.
                </div>
              )}
            </div>

            {/* Lease Summary Box */}
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} color="var(--primary)" /> Lease Status
                </h3>
                <button
                  onClick={() => setActiveModule('lease')}
                  style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}
                >
                  Manage
                </button>
              </div>

              <div style={{ fontSize: '0.85rem', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Term:</span>{' '}
                <strong>01 Jan 2026 – 31 Dec 2026</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <StatusBadge status={lease.renewalStatus === 'Not Requested' ? 'Active' : lease.renewalStatus} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {daysRemaining} days left
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {lease.renewalStatus === 'Pending Owner Approval'
                  ? 'Renewal request pending owner response.'
                  : 'Eligible for 12-month agreement extension.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Recent Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Quick Actions Card */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '14px' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setActiveModule('rent-payments')}
                style={{ justifyContent: 'flex-start', padding: '12px 14px', textAlign: 'left' }}
              >
                <DollarSign size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.825rem' }}>Pay Rent</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setActiveModule('maintenance')}
                style={{ justifyContent: 'flex-start', padding: '12px 14px', textAlign: 'left' }}
              >
                <Wrench size={16} color="var(--warning)" />
                <span style={{ fontSize: '0.825rem' }}>Raise Request</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setActiveModule('lease')}
                style={{ justifyContent: 'flex-start', padding: '12px 14px', textAlign: 'left' }}
              >
                <FileText size={16} color="var(--info)" />
                <span style={{ fontSize: '0.825rem' }}>View Lease</span>
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => setActiveModule('support')}
                style={{ justifyContent: 'flex-start', padding: '12px 14px', textAlign: 'left' }}
              >
                <MessageSquare size={16} color="var(--success)" />
                <span style={{ fontSize: '0.825rem' }}>Contact Owner</span>
              </button>
            </div>
          </div>

          {/* Recent Chronological Activity Feed */}
          <div className="card" style={{ flex: 1 }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  Recent Activity
                </h2>
                <p className="card-subtitle">Real-time tenancy event feed</p>
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setActiveModule('notifications')}
              >
                All Notices
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {notifications.slice(0, 5).map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => {
                    if (activity.targetModule) setActiveModule(activity.targetModule);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor:
                        activity.type === 'payment'
                          ? 'var(--success-bg)'
                          : activity.type === 'maintenance'
                          ? 'var(--warning-bg)'
                          : activity.type === 'lease'
                          ? 'var(--info-bg)'
                          : 'var(--primary-light)',
                      color:
                        activity.type === 'payment'
                          ? 'var(--success)'
                          : activity.type === 'maintenance'
                          ? 'var(--warning)'
                          : activity.type === 'lease'
                          ? 'var(--info)'
                          : 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    {activity.type === 'payment' && <CheckCircle2 size={16} />}
                    {activity.type === 'maintenance' && <Wrench size={16} />}
                    {activity.type === 'lease' && <FileText size={16} />}
                    {activity.type === 'notice' && <AlertCircle size={16} />}
                    {activity.type === 'announcement' && <Bell size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {activity.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {new Date(activity.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                      {activity.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

