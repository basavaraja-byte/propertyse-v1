import React, { useState } from 'react';
import {
  FolderArchive,
  Search,
  Filter,
  Download,
  Eye,
  FileText,
  Calendar,
  Building,
  CheckCircle2,
  ArrowUpDown
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Modal } from '../components/layout/Modal';
import { EmptyState } from '../components/layout/EmptyState';

export const Documents = () => {
  const { documents, tenant, property } = useTenant();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (newest) or 'asc' (oldest)

  // Document Preview State
  const [previewDoc, setPreviewDoc] = useState(null);

  const categories = [
    'All',
    'Lease Agreements',
    'Rent Receipts',
    'Invoices',
    'Payment Records',
    'Move-in Documents',
    'Property Notices',
    'Maintenance Documents',
    'Other Authorized Documents'
  ];

  // Filtering & Sorting
  const filteredDocuments = documents
    .filter((doc) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || doc.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.uploadedDate);
      const dateB = new Date(b.uploadedDate);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  const handleDownload = (doc) => {
    const fileText = `
============================================================
              PROPERTYSE OFFICIAL TENANCY REPOSITORY
============================================================
Document Name:   ${doc.name}
Category:        ${doc.category}
Property:        ${doc.property}
Uploaded Date:   ${doc.uploadedDate}
File Format:     ${doc.fileFormat}
File Size:       ${doc.fileSize}
Description:     ${doc.description}

Authorized For:  ${tenant.name} (${tenant.id})
Verification:    Signed and authenticated by PropertySE Portal.
============================================================
    `;

    const blob = new Blob([fileText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.name.replace(/\s+/g, '_')}.${doc.fileFormat.toLowerCase() === 'pdf' ? 'txt' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="Document Repository"
        subtitle="Centralized digital records of agreements, tax receipts, move-in checklists, and community by-laws."
        breadcrumb="Documents"
      />

      {/* Filter & Search Bar Card */}
      <div className="card" style={{ marginBottom: '24px', padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
            <Search
              size={16}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search document name, category or description..."
              className="form-input"
              style={{ paddingLeft: '36px', height: '40px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Category Filter */}
            <select
              className="form-select"
              style={{ height: '40px', width: '220px', fontSize: '0.875rem' }}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <button
              className="btn btn-secondary"
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              style={{ height: '40px', fontSize: '0.85rem' }}
            >
              <ArrowUpDown size={15} />
              <span>{sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              Available Records ({filteredDocuments.length})
            </h2>
            <p className="card-subtitle">Encrypted, tenant-scoped document vault</p>
          </div>
          <span className="badge badge-paid">Verified Tenant Vault</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document Name</th>
                <th>Category</th>
                <th>Uploaded Date</th>
                <th>Format</th>
                <th>Size</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--primary-light)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <FileText size={17} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {doc.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
                        {doc.category}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        <Calendar size={13} color="var(--text-muted)" />
                        <span>{doc.uploadedDate}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--primary)' }}>
                        {doc.fileFormat}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                        {doc.fileSize}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview Document Details"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleDownload(doc)}
                          title="Download Demo File"
                        >
                          <Download size={14} /> Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={FolderArchive}
                      title="No documents match your query"
                      description="Try adjusting your search keywords or resetting the category dropdown."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={`Document Preview: ${previewDoc.name}`}
          maxWidth="600px"
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                Close
              </button>
              <button className="btn btn-primary" onClick={() => handleDownload(previewDoc)}>
                <Download size={15} /> Download Document
              </button>
            </>
          }
        >
          <div style={{ background: 'var(--bg-subtle)', padding: '20px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <FileText size={24} color="var(--primary)" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{previewDoc.name}</h3>
                <span className="badge badge-paid" style={{ marginTop: '4px' }}>{previewDoc.category}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div><span style={{ color: 'var(--text-secondary)' }}>Associated Property:</span> <strong>{previewDoc.property}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Upload Timestamp:</span> <strong>{previewDoc.uploadedDate}</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Format & Size:</span> <strong>{previewDoc.fileFormat} ({previewDoc.fileSize})</strong></div>
              <div><span style={{ color: 'var(--text-secondary)' }}>Description:</span> {previewDoc.description}</div>
            </div>

            <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This record is officially linked to Tenant #{tenant.id} ({tenant.name}). All rights and confidentiality obligations remain protected under the Master Tenancy Agreement for {property.name}.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

