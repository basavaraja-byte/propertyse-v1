import React, { useState } from 'react';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ShieldCheck,
  Camera,
  Lock,
  Save,
  X,
  CheckCircle2,
  Building,
  KeyRound,
  AlertCircle
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/layout/StatusBadge';

export const MyProfile = () => {
  const { tenant, property, updateProfile, showToast } = useTenant();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: tenant.name,
    email: tenant.email,
    phone: tenant.phone,
    dateOfBirth: tenant.dateOfBirth,
    permanentAddress: tenant.permanentAddress,
    avatarUrl: tenant.avatarUrl,
    emergencyName: tenant.emergencyContact.name,
    emergencyRelation: tenant.emergencyContact.relation,
    emergencyPhone: tenant.emergencyContact.phone
  });

  // Password demo state
  const [passwordState, setPasswordState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, avatarUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      permanentAddress: formData.permanentAddress,
      avatarUrl: formData.avatarUrl,
      emergencyContact: {
        name: formData.emergencyName,
        relation: formData.emergencyRelation,
        phone: formData.emergencyPhone
      }
    });
    setIsEditing(false);
  };

  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault();
    if (!passwordState.currentPassword || !passwordState.newPassword) {
      showToast('Please fill all password fields', 'error');
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      showToast('New passwords do not match!', 'error');
      return;
    }
    setPasswordState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    showToast('Password updated successfully (Demo simulation)!');
  };

  return (
    <div>
      <PageHeader
        title="My Profile & Settings"
        subtitle="Manage your personal details, emergency contacts, profile photo, and security preferences."
        breadcrumb="My Profile"
      >
        {!isEditing ? (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Edit Profile Details
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFormData({
                  name: tenant.name,
                  email: tenant.email,
                  phone: tenant.phone,
                  dateOfBirth: tenant.dateOfBirth,
                  permanentAddress: tenant.permanentAddress,
                  avatarUrl: tenant.avatarUrl,
                  emergencyName: tenant.emergencyContact.name,
                  emergencyRelation: tenant.emergencyContact.relation,
                  emergencyPhone: tenant.emergencyContact.phone
                });
                setIsEditing(false);
              }}
            >
              <X size={15} /> Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveProfile}>
              <Save size={15} /> Save Changes
            </button>
          </div>
        )}
      </PageHeader>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Left Column: Profile Card & Assigned Unit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Main Profile Info Card */}
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 16px' }}>
              <img
                src={isEditing ? formData.avatarUrl : tenant.avatarUrl}
                alt={tenant.name}
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #FFFFFF',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
                }}
              />
              {isEditing && (
                <label
                  htmlFor="avatar-upload-input"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    background: 'var(--primary)',
                    color: '#FFFFFF',
                    borderRadius: '50%',
                    padding: '8px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Upload profile photo"
                >
                  <Camera size={14} />
                  <input
                    id="avatar-upload-input"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {tenant.name}
            </h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {tenant.occupation} • {tenant.employer}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
              <span className="badge badge-paid">
                <ShieldCheck size={12} /> KYC Verified
              </span>
              <span className="badge badge-info">Tenant ID: {tenant.id}</span>
            </div>

            {/* Quick Specs */}
            <div
              style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                textAlign: 'left',
                fontSize: '0.875rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>{tenant.email}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>{tenant.phone}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building size={16} color="var(--primary)" />
                <span style={{ color: 'var(--text-secondary)' }}>
                  Unit {property.unit}, {property.name}
                </span>
              </div>
            </div>
          </div>

          {/* Tenancy Relationship Details */}
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '14px' }}>
              Assigned Lease Relationship
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Property:</span>
                <strong>{property.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Assigned Unit:</span>
                <strong>Unit {property.unit} ({property.floor})</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Move-In Date:</span>
                <span>{property.moveInDate}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Landlord:</span>
                <span>{property.owner.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Personal Information & Security */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Personal Information Form */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  Personal & Emergency Information
                </h3>
                <p className="card-subtitle">Verified tenancy profile records</p>
              </div>
              {isEditing && (
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                  Editing Mode Active
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.phone}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateOfBirth}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Permanent Address</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formData.permanentAddress}
                  disabled={!isEditing}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                />
              </div>

              {/* Emergency Contact Group */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.925rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                  Emergency Contact Details
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Contact Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.emergencyName}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Relationship</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.emergencyRelation}
                      disabled={!isEditing}
                      onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Emergency Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.emergencyPhone}
                    disabled={!isEditing}
                    onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  />
                </div>
              </div>

              {isEditing && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary">
                    <Save size={15} /> Save Changes
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Security & Authentication Section (Demo Ready) */}
          <div className="card">
            <div className="card-header">
              <div>
                <h3 className="card-title">
                  <Lock size={19} color="var(--primary)" /> Security & Password
                </h3>
                <p className="card-subtitle">Future-ready security credentials interface</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChangeSubmit}>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="form-input"
                  value={passwordState.currentPassword}
                  onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="form-input"
                    value={passwordState.newPassword}
                    onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    className="form-input"
                    value={passwordState.confirmPassword}
                    onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Demo mode: Authenticated via simulated session.
                </span>
                <button type="submit" className="btn btn-secondary btn-sm">
                  <KeyRound size={14} /> Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

