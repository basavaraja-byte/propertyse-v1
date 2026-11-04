import React from 'react';
import { Modal } from '../layout/Modal';
import { Printer, Download, CheckCircle, Building } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export const ReceiptModal = ({ isOpen, onClose, transaction }) => {
  const { tenant, property } = useTenant();

  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadDemo = () => {
    // Generate clean text-based receipt or HTML blob for download
    const receiptContent = `
==================================================
              PROPERTYSE RENT RECEIPT
==================================================
Receipt No:      ${transaction.id}
Date of Payment: ${transaction.date}
Payment Period:  ${transaction.period}
Reference:       ${transaction.referenceNumber || 'N/A'}
Status:          ${transaction.status}

--------------------------------------------------
TENANT DETAILS:
Name:            ${tenant.name}
Tenant ID:       ${tenant.id}
Email:           ${tenant.email}
Phone:           ${tenant.phone}

PROPERTY DETAILS:
Property:        ${property.name}
Unit:            ${property.unit} (${property.floor})
Address:         ${property.address}, ${property.city} - ${property.pincode}
Landlord/Owner:  ${property.owner.name}

--------------------------------------------------
BREAKDOWN OF CHARGES:
Monthly Rent:        INR ${Number(transaction.rentAmount || 18000).toLocaleString('en-IN')}.00
Society Maintenance: INR ${Number(transaction.maintenanceAmount || 2000).toLocaleString('en-IN')}.00
Utility Charges:     INR ${Number(transaction.utilityAmount || 0).toLocaleString('en-IN')}.00
Late Fee:            INR ${Number(transaction.lateFee || 0).toLocaleString('en-IN')}.00
--------------------------------------------------
TOTAL PAID:          INR ${Number(transaction.totalAmount || 20000).toLocaleString('en-IN')}.00
Payment Method:      ${transaction.method}
--------------------------------------------------
Notes: ${transaction.notes || 'Payment acknowledged and recorded.'}

This is a computer-generated digital receipt issued by PropertySE.
==================================================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PropertySE_Receipt_${transaction.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Digital Rent Receipt"
      maxWidth="620px"
      footer={
        <>
          <button className="btn btn-secondary" onClick={handlePrint}>
            <Printer size={16} /> Print Receipt
          </button>
          <button className="btn btn-primary" onClick={handleDownloadDemo}>
            <Download size={16} /> Download File
          </button>
        </>
      }
    >
      <div className="receipt-view" style={{
        background: '#FFFFFF',
        border: '1.5px dashed var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px'
      }}>
        {/* Receipt Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 800, fontSize: '1.25rem' }}>
              <Building size={22} /> PropertySE
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Tenant Rental Ledger & Receipt
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-paid" style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              <CheckCircle size={12} /> {transaction.status}
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Receipt #{transaction.id}
            </p>
          </div>
        </div>

        {/* Tenant & Property Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', fontSize: '0.85rem' }}>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Tenant</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{tenant.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>ID: {tenant.id}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{tenant.email}</div>
          </div>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>Rental Unit</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{property.name}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Unit {property.unit} • {property.floor}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Owner: {property.owner.name}</div>
          </div>
        </div>

        {/* Transaction Summary */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem', marginBottom: '12px' }}>
            <div><span style={{ color: 'var(--text-secondary)' }}>Payment Period:</span> <strong>{transaction.period}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Payment Date:</span> <strong>{transaction.date}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Method:</span> <strong>{transaction.method}</strong></div>
            <div><span style={{ color: 'var(--text-secondary)' }}>Ref No:</span> <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{transaction.referenceNumber || 'N/A'}</span></div>
          </div>

          {/* Breakdown Table */}
          <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>Item</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '8px 12px' }}>Monthly Apartment Rent ({property.unit})</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                    ₹{Number(transaction.rentAmount || 18000).toLocaleString('en-IN')}
                  </td>
                </tr>
                {transaction.maintenanceAmount > 0 && (
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px 12px' }}>Society Maintenance Charges</td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                      ₹{Number(transaction.maintenanceAmount).toLocaleString('en-IN')}
                    </td>
                  </tr>
                )}
                <tr style={{ background: 'var(--primary-light)', fontWeight: 800 }}>
                  <td style={{ padding: '10px 12px', color: 'var(--primary)' }}>Total Amount Paid</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--primary)', fontSize: '1rem' }}>
                    ₹{Number(transaction.totalAmount || 20000).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Notes */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>PropertySE Digital Verification Seal</span>
          <span>Verified Demo Transaction</span>
        </div>
      </div>
    </Modal>
  );
};

