import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Search,
  Filter,
  Info,
  Smartphone,
  Building,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/layout/StatCard';
import { StatusBadge } from '../components/layout/StatusBadge';
import { Modal } from '../components/layout/Modal';
import { ReceiptModal } from '../components/common/ReceiptModal';
import { EmptyState } from '../components/layout/EmptyState';

export const RentPayments = () => {
  const { payments, tenant, property, submitPayment } = useTenant();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Receipt Modal State
  const [selectedTxnForReceipt, setSelectedTxnForReceipt] = useState(null);

  // Online Payment Flow Modal State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState('December 2026');
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [upiApp, setUpiApp] = useState('Google Pay');
  const [cardDetails, setCardDetails] = useState({ number: '•••• •••• •••• 4242', expiry: '08/28', cvv: '•••' });
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filter transactions
  const filteredTransactions = payments.transactions.filter((txn) => {
    const matchesSearch =
      txn.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.period.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.method.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || txn.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Calculate total paid across history
  const totalPaidSum = payments.transactions
    .filter((t) => t.status === 'Paid')
    .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

  // Chart data: 6-month rent history
  const chartData = [
    { month: 'Jun', rent: 18000, maintenance: 2000 },
    { month: 'Jul', rent: 18000, maintenance: 2000 },
    { month: 'Aug', rent: 18000, maintenance: 2000 },
    { month: 'Sep', rent: 18000, maintenance: 2000 },
    { month: 'Oct', rent: 18000, maintenance: 2000 },
    { month: 'Nov', rent: 18000, maintenance: 2000 }
  ];

  // Handle demo payment submission
  const handleCompleteDemoPayment = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(() => {
      let methodLabel = 'UPI (Instant Demo)';
      if (selectedMethod === 'upi') methodLabel = `UPI (${upiApp})`;
      else if (selectedMethod === 'card') methodLabel = `Credit Card (Visa ending 4242)`;
      else if (selectedMethod === 'netbanking') methodLabel = `Net Banking (${selectedBank})`;

      submitPayment({
        amount: payments.monthlyRent + payments.maintenanceFee,
        period: paymentPeriod,
        method: methodLabel,
        referenceNumber: `DEMO-GATEWAY-${Date.now().toString().slice(-6)}`,
        notes: `Demo online payment simulation for ${paymentPeriod}.`
      });

      setIsProcessing(false);
      setIsPayModalOpen(false);
    }, 1000);
  };

  return (
    <div>
      <PageHeader
        title="Rent & Payments"
        subtitle="Manage rental invoices, complete online rent payments, and view verified payment receipts."
        breadcrumb="Rent & Payments"
      >
        <button
          className="btn btn-primary"
          onClick={() => setIsPayModalOpen(true)}
        >
          <CreditCard size={16} /> Pay Rent Online
        </button>
      </PageHeader>

      {/* Demo Disclaimer Banner */}
      <div
        style={{
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 'var(--radius-md)',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          color: '#92400E',
          fontSize: '0.85rem'
        }}
      >
        <Info size={20} color="#D97706" style={{ flexShrink: 0 }} />
        <div>
          <strong>Demo Payment Interface:</strong> This module illustrates future Razorpay gateway workflow. No real bank accounts or financial transactions are charged during this standalone frontend stage.
        </div>
      </div>

      {/* Stat Cards Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '18px',
          marginBottom: '28px'
        }}
      >
        <StatCard
          icon={DollarSign}
          title="Current Monthly Rent"
          value={`₹${payments.monthlyRent.toLocaleString('en-IN')}`}
          subtext={`+ ₹${payments.maintenanceFee} maintenance`}
        />
        <StatCard
          icon={Calendar}
          title="Next Due Date"
          value={new Date(payments.nextDueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          subtext="Standard 5th cycle"
        />
        <StatCard
          icon={ShieldCheck}
          title="Security Deposit"
          value={`₹${payments.securityDeposit.toLocaleString('en-IN')}`}
          subtext="Held in Escrow"
          badgeText="Active"
          badgeType="paid"
        />
        <StatCard
          icon={CheckCircle2}
          title="Total Paid (2026)"
          value={`₹${totalPaidSum.toLocaleString('en-IN')}`}
          subtext={`${payments.transactions.length} recorded payments`}
        />
        <StatCard
          icon={CreditCard}
          title="Outstanding Amount"
          value={`₹${payments.outstandingAmount.toLocaleString('en-IN')}`}
          subtext={payments.lateFee > 0 ? `Late fee: ₹${payments.lateFee}` : 'Zero late fee penalty'}
          badgeText={payments.outstandingAmount === 0 ? 'Clear' : 'Pending'}
          badgeType={payments.outstandingAmount === 0 ? 'paid' : 'pending'}
        />
      </div>

      {/* Chart & Quick Action Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', marginBottom: '28px' }}>
        {/* Payment History Chart */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                Payment Trends (Last 6 Months)
              </h2>
              <p className="card-subtitle">Breakdown of rent and society maintenance</p>
            </div>
            <span className="badge badge-paid">100% On-Time Record</span>
          </div>

          <div style={{ width: '100%', height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, '']}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    border: '1px solid #E2E8F0'
                  }}
                />
                <Bar dataKey="rent" name="Base Rent" fill="#4168DF" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="maintenance" name="Maintenance" fill="#93C5FD" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Due & Online Pay Quick Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  Next Rent Payment
                </h2>
                <p className="card-subtitle">Upcoming rental invoice details</p>
              </div>
              <StatusBadge status={payments.currentMonthStatus} />
            </div>

            <div style={{ background: 'var(--bg-subtle)', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Invoice Period:</span>
                <strong>December 2026</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Base Rent ({property.unit}):</span>
                <span>₹{payments.monthlyRent.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Society Maintenance:</span>
                <span>₹{payments.maintenanceFee.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                <span>Total Amount Due:</span>
                <span>₹{(payments.monthlyRent + payments.maintenanceFee).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={() => setIsPayModalOpen(true)}
            style={{ width: '100%' }}
          >
            <CreditCard size={18} /> Proceed to Pay (Demo Gateway)
          </button>
        </div>
      </div>

      {/* Payment History Table Card */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <h2 className="card-title">
              Payment Transaction History
            </h2>
            <p className="card-subtitle">Complete ledger of recorded tenancy payments</p>
          </div>

          {/* Search & Filter Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search transaction..."
                className="form-input"
                style={{ paddingLeft: '36px', height: '38px', width: '210px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <select
              className="form-select"
              style={{ height: '38px', width: '130px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Period</th>
                <th>Rent Amount</th>
                <th>Maintenance</th>
                <th>Total Paid</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Receipt</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--primary)' }}>
                      {txn.id}
                    </td>
                    <td>{txn.date}</td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{txn.period}</span>
                    </td>
                    <td>₹{Number(txn.rentAmount || 18000).toLocaleString('en-IN')}</td>
                    <td>₹{Number(txn.maintenanceAmount || 0).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(txn.totalAmount).toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {txn.method}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={txn.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedTxnForReceipt(txn)}
                        title="View & Download Receipt"
                      >
                        <FileText size={14} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      title="No transactions match your criteria"
                      description="Try clearing your search query or switching your status filter to 'All'."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Online Payment Interface Modal (Razorpay Demo Flow) */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={() => !isProcessing && setIsPayModalOpen(false)}
        title="Pay Rent Online (Demo Simulation)"
        maxWidth="600px"
      >
        <form onSubmit={handleCompleteDemoPayment}>
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              fontSize: '0.825rem',
              color: '#1E40AF',
              marginBottom: '20px'
            }}
          >
            <strong>Simulated Payment Gateway:</strong> Choose a payment mode to test immediate ledger confirmation and receipt creation.
          </div>

          {/* Billing Breakdown */}
          <div style={{ background: 'var(--bg-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Payment For Month / Cycle</label>
              <select
                className="form-select"
                value={paymentPeriod}
                onChange={(e) => setPaymentPeriod(e.target.value)}
              >
                <option value="December 2026">December 2026</option>
                <option value="January 2027">January 2027 (Advance)</option>
                <option value="November 2026">November 2026</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Base Rent ({property.unit}):</span>
              <span>₹{payments.monthlyRent.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Society Maintenance:</span>
              <span>₹{payments.maintenanceFee.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
              <span>Total Payable:</span>
              <span>₹{(payments.monthlyRent + payments.maintenanceFee).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '10px' }}>Select Payment Method</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedMethod === 'upi' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: selectedMethod === 'upi' ? 'var(--primary-light)' : '#FFFFFF',
                  color: selectedMethod === 'upi' ? 'var(--primary)' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Smartphone size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Instant UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedMethod === 'card' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: selectedMethod === 'card' ? 'var(--primary-light)' : '#FFFFFF',
                  color: selectedMethod === 'card' ? 'var(--primary)' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <CreditCard size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('netbanking')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${selectedMethod === 'netbanking' ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: selectedMethod === 'netbanking' ? 'var(--primary-light)' : '#FFFFFF',
                  color: selectedMethod === 'netbanking' ? 'var(--primary)' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer'
                }}
              >
                <Building size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Net Banking</span>
              </button>
            </div>
          </div>

          {/* Conditional Method Details */}
          {selectedMethod === 'upi' && (
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <label className="form-label">Choose UPI App</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI'].map((app) => (
                  <label
                    key={app}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    <input
                      type="radio"
                      name="upiApp"
                      checked={upiApp === app}
                      onChange={() => setUpiApp(app)}
                    />
                    <span>{app}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedMethod === 'card' && (
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Demo Card Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={cardDetails.number}
                  disabled
                  readOnly
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label">Expiry</label>
                  <input type="text" className="form-input" value={cardDetails.expiry} disabled readOnly />
                </div>
                <div>
                  <label className="form-label">CVV</label>
                  <input type="text" className="form-input" value={cardDetails.cvv} disabled readOnly />
                </div>
              </div>
            </div>
          )}

          {selectedMethod === 'netbanking' && (
            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
              <label className="form-label">Select Bank</label>
              <select
                className="form-select"
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                style={{ marginTop: '6px' }}
              >
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsPayModalOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing Transaction...' : `Confirm Demo Payment (₹20,000)`}
            </button>
          </div>
        </form>
      </Modal>

      {/* Digital Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(selectedTxnForReceipt)}
        onClose={() => setSelectedTxnForReceipt(null)}
        transaction={selectedTxnForReceipt}
      />
    </div>
  );
};

