import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Maximize2,
  BedDouble,
  Bath,
  Compass,
  Calendar,
  ShieldCheck,
  Phone,
  Mail,
  Car,
  Wifi,
  ChevronsUp,
  Camera,
  Dumbbell,
  Waves,
  Zap,
  Droplets,
  Trees,
  Flame,
  Info,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useTenant } from '../context/TenantContext';
import { PageHeader } from '../components/layout/PageHeader';
import { Modal } from '../components/layout/Modal';

// Icon mapper for dynamic amenity icons
const amenityIconMap = {
  Wifi: Wifi,
  Car: Car,
  ChevronsUp: ChevronsUp,
  ShieldCheck: ShieldCheck,
  Camera: Camera,
  Dumbbell: Dumbbell,
  Waves: Waves,
  Zap: Zap,
  Droplets: Droplets,
  Building: Building2,
  Trees: Trees,
  Flame: Flame
};

export const MyProperty = () => {
  const { property, setActiveModule } = useTenant();
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const openLightbox = (index) => setSelectedImageIndex(index);
  const closeLightbox = () => setSelectedImageIndex(null);

  const prevImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : property.images.length - 1));
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setSelectedImageIndex((prev) => (prev < property.images.length - 1 ? prev + 1 : 0));
  };

  return (
    <div>
      <PageHeader
        title="My Property & Unit"
        subtitle="Detailed apartment specifications, visual gallery, amenities, and management contacts."
        breadcrumb="My Property"
      >
        <button
          className="btn btn-secondary"
          onClick={() => setActiveModule('maintenance')}
        >
          Report Property Issue
        </button>
      </PageHeader>

      {/* Main Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        {/* Top Summary Card */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {property.name}
                </h2>
                <span className="badge badge-paid" style={{ fontSize: '0.8rem' }}>
                  Unit {property.unit}
                </span>
                <span className="badge badge-info" style={{ fontSize: '0.8rem' }}>
                  {property.floor}
                </span>
              </div>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin size={16} color="var(--primary)" />
                {property.address}, {property.city}, {property.state} - {property.pincode}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Property ID</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{property.id}</div>
              </div>
            </div>
          </div>

          {/* Quick Specifications Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px',
              padding: '16px',
              background: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Type</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.type}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Carpet Area</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.carpetArea}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bedrooms</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.bedrooms} BHK</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Bathrooms</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.bathrooms} Baths</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Balconies</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.balconies} Balconies</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Furnishing</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{property.furnishingStatus}</div>
            </div>
          </div>

          {/* Description */}
          <div style={{ marginTop: '18px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '6px' }}>Property Overview</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {property.description}
            </p>
          </div>
        </div>

        {/* Property Gallery Section with Lightbox */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Camera size={19} color="var(--primary)" /> Unit Photo Gallery
              </h2>
              <p className="card-subtitle">Click any image to enlarge in full resolution</p>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {property.images.length} verified photos
            </span>
          </div>

          {/* Image Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '16px'
            }}
          >
            {property.images.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => openLightbox(idx)}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  group: 'gallery-item',
                  boxShadow: 'var(--shadow-sm)',
                  aspectRatio: '16/10'
                }}
              >
                <img
                  src={img.url}
                  alt={img.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.04)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: '12px',
                    color: '#FFFFFF'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{img.title}</span>
                    <Maximize2 size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lightbox Modal */}
        {selectedImageIndex !== null && (
          <div
            className="modal-overlay"
            onClick={closeLightbox}
            style={{ zIndex: 2000, backgroundColor: 'rgba(10, 15, 29, 0.92)' }}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '900px',
                width: '95%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={closeLightbox}
                style={{
                  position: 'absolute',
                  top: '-45px',
                  right: 0,
                  color: '#FFFFFF',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '50%',
                  padding: '8px'
                }}
              >
                <X size={20} />
              </button>

              {/* Prev / Next buttons */}
              <button
                onClick={prevImage}
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  padding: '10px',
                  zIndex: 10
                }}
              >
                <ChevronLeft size={24} />
              </button>

              <button
                onClick={nextImage}
                style={{
                  position: 'absolute',
                  right: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.3)',
                  color: '#FFFFFF',
                  borderRadius: '50%',
                  padding: '10px',
                  zIndex: 10
                }}
              >
                <ChevronRight size={24} />
              </button>

              {/* Image */}
              <img
                src={property.images[selectedImageIndex].url}
                alt={property.images[selectedImageIndex].title}
                style={{
                  maxHeight: '75vh',
                  width: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--radius-lg)'
                }}
              />

              <div style={{ marginTop: '14px', textAlign: 'center', color: '#FFFFFF' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                  {property.images[selectedImageIndex].title}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '2px' }}>
                  {property.images[selectedImageIndex].caption}
                </p>
                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px', display: 'inline-block' }}>
                  Image {selectedImageIndex + 1} of {property.images.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Amenities Grid */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <ShieldCheck size={19} color="var(--primary)" /> Society & Unit Amenities
              </h2>
              <p className="card-subtitle">Included facilities under your current lease agreement</p>
            </div>
            <span className="badge badge-paid">12 Amenities Included</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '14px'
            }}
          >
            {property.amenities.map((item) => {
              const IconComp = amenityIconMap[item.icon] || Building2;
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    background: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)'
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <IconComp size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {item.category}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Parking, Move-in & Community Rules */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
          {/* Parking & Move-In Specifications */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>
              <Car size={19} color="var(--primary)" /> Parking & Vehicle Allocation
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Designated Car Slot:</span>
                <strong style={{ color: 'var(--primary)' }}>{property.parkingDetails.slotNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Parking Type:</span>
                <strong>{property.parkingDetails.type}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Registered Car:</span>
                <strong>{property.parkingDetails.registeredVehicle}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Two-Wheeler Slot:</span>
                <strong>{property.parkingDetails.twoWheelerSlot}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Initial Move-in Date:</span>
                <strong>{property.moveInDate}</strong>
              </div>
            </div>
          </div>

          {/* Important Property Instructions */}
          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '16px' }}>
              <Info size={19} color="var(--primary)" /> Important Property Instructions
            </h2>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {property.propertyInstructions.map((instruction, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      marginTop: '7px',
                      flexShrink: 0
                    }}
                  />
                  <span>{instruction}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Owner & Facility Manager Cards */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                Owner & Management Contacts
              </h2>
              <p className="card-subtitle">Verified point of contacts for tenancy affairs</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Owner Contact Card */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                background: 'var(--bg-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <img
                  src={property.owner.avatar}
                  alt={property.owner.name}
                  style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.owner.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{property.owner.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>
                    ● {property.owner.responseRate}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> <strong>{property.owner.phone}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{property.owner.email}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Calling Hours:</span> {property.owner.preferredContactHours}</div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a href={`tel:${property.owner.phone}`} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                  <Phone size={14} /> Call Owner
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setActiveModule('support')}
                >
                  <Mail size={14} /> Send Message
                </button>
              </div>
            </div>

            {/* Facility Manager Contact Card */}
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                background: 'var(--bg-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                <img
                  src={property.manager.avatar}
                  alt={property.manager.name}
                  style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>{property.manager.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{property.manager.role}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {property.manager.company}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '16px' }}>
                <div><span style={{ color: 'var(--text-secondary)' }}>Phone:</span> <strong>{property.manager.phone}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Email:</span> <strong>{property.manager.email}</strong></div>
                <div><span style={{ color: 'var(--text-secondary)' }}>Office Hours:</span> {property.manager.officeHours}</div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <a href={`tel:${property.manager.phone}`} className="btn btn-outline btn-sm" style={{ flex: 1 }}>
                  <Phone size={14} /> Call Desk
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                  onClick={() => setActiveModule('maintenance')}
                >
                  Log Maintenance
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

