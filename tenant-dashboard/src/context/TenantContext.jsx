import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initialTenantData } from '../data/mockTenant';
import { mockPropertyData } from '../data/mockProperty';
import { initialPaymentsData } from '../data/mockPayments';
import { initialLeaseData } from '../data/mockLease';
import { initialMaintenanceRequests } from '../data/mockMaintenance';
import { initialNotifications } from '../data/mockNotifications';
import { initialDocuments } from '../data/mockDocuments';
import { initialSupportTickets } from '../data/mockSupport';

// Supabase services
import { isSupabaseConfigured } from '../services/supabaseClient';
import { propertyService } from '../services/propertyService';
import { maintenanceService } from '../services/maintenanceService';
import { leaseService } from '../services/leaseService';
import { paymentService } from '../services/paymentService';
import { notificationService } from '../services/notificationService';
import { documentService } from '../services/documentService';
import { supportService } from '../services/supportService';

const TenantContext = createContext(null);

export const TenantProvider = ({ children }) => {
  // Active Navigation
  const [activeModule, setActiveModule] = useState('dashboard');
  const [isSignedOut, setIsSignedOut] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Supabase sync states
  const [supabaseStatus, setSupabaseStatus] = useState(
    isSupabaseConfigured ? 'connected' : 'awaiting_auth'
  );
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [liveSyncError, setLiveSyncError] = useState(null);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((prev) => (prev?.id ? null : prev));
    }, 4000);
  };

  // State with LocalStorage persistence fallback
  const [tenant, setTenant] = useState(() => {
    const saved = localStorage.getItem('propertyse_tenant');
    return saved ? JSON.parse(saved) : initialTenantData;
  });

  const [property, setProperty] = useState(mockPropertyData);

  const [payments, setPayments] = useState(() => {
    const saved = localStorage.getItem('propertyse_payments');
    return saved ? JSON.parse(saved) : initialPaymentsData;
  });

  const [lease, setLease] = useState(() => {
    const saved = localStorage.getItem('propertyse_lease');
    return saved ? JSON.parse(saved) : initialLeaseData;
  });

  const [maintenanceRequests, setMaintenanceRequests] = useState(() => {
    const saved = localStorage.getItem('propertyse_maintenance');
    return saved ? JSON.parse(saved) : initialMaintenanceRequests;
  });

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('propertyse_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [documents, setDocuments] = useState(() => {
    const saved = localStorage.getItem('propertyse_documents');
    return saved ? JSON.parse(saved) : initialDocuments;
  });

  const [supportTickets, setSupportTickets] = useState(() => {
    const saved = localStorage.getItem('propertyse_support');
    return saved ? JSON.parse(saved) : initialSupportTickets;
  });

  // Save to LocalStorage whenever states update
  useEffect(() => {
    localStorage.setItem('propertyse_tenant', JSON.stringify(tenant));
  }, [tenant]);

  useEffect(() => {
    localStorage.setItem('propertyse_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('propertyse_lease', JSON.stringify(lease));
  }, [lease]);

  useEffect(() => {
    localStorage.setItem('propertyse_maintenance', JSON.stringify(maintenanceRequests));
  }, [maintenanceRequests]);

  useEffect(() => {
    localStorage.setItem('propertyse_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('propertyse_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('propertyse_support', JSON.stringify(supportTickets));
  }, [supportTickets]);

  // Load and refresh live data from Supabase
  const refreshLiveData = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setSupabaseStatus('awaiting_auth');
      return;
    }

    setIsLoadingLive(true);
    setLiveSyncError(null);

    try {
      // 1. Fetch live assigned property
      const propResult = await propertyService.getAssignedProperty('Flat 101', 'COMP_001');
      if (propResult.success && propResult.data) {
        const liveProp = propResult.data;
        setProperty((prev) => ({
          ...prev,
          id: liveProp.id,
          name: liveProp.property_name || prev.name,
          unit: liveProp.unit_number || prev.unit,
          address: `${liveProp.building_number || ''}, ${liveProp.property_name || ''}`.trim()
        }));

        // If assigned tenant exists in property row
        if (liveProp.tenant_full_name) {
          setTenant((prev) => ({
            ...prev,
            name: liveProp.tenant_full_name || prev.name,
            phone: liveProp.tenant_phone || prev.phone,
            email: liveProp.tenant_email || prev.email
          }));
        }

        // 2. Fetch live maintenance tickets for this property
        const ticketsResult = await maintenanceService.getTickets(liveProp.id);
        if (ticketsResult.success && ticketsResult.data?.length) {
          setMaintenanceRequests(ticketsResult.data.map((t) => ({
            id: t.id,
            title: `${t.category} Issue (${t.unit_number})`,
            category: t.category,
            location: `Unit ${t.unit_number}`,
            priority: t.priority || 'Medium',
            status: t.status || 'Submitted',
            submittedDate: t.created_at ? t.created_at.split('T')[0] : 'Recent',
            preferredVisitDate: t.preferred_visit_date || 'Flexible',
            description: t.description,
            images: t.image_url ? [t.image_url] : [],
            timeline: [
              { step: 'Submitted', date: t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Yes', notes: 'Logged in Supabase.', completed: true },
              { step: 'Acknowledged', date: t.accepted_at ? new Date(t.accepted_at).toLocaleDateString() : 'Pending', notes: 'Facility desk review.', completed: Boolean(t.accepted_at) },
              { step: 'In Progress', date: t.status === 'In Progress' ? 'Active' : 'Pending', notes: 'Assigned specialist.', completed: t.status === 'In Progress' || t.status === 'Resolved' },
              { step: 'Resolved', date: t.completed_at ? new Date(t.completed_at).toLocaleDateString() : 'Pending', notes: 'Ticket closed.', completed: t.status === 'Resolved' }
            ],
            comments: []
          })));
        }

        // 3. Fetch live leases if table exists
        const leaseResult = await leaseService.getLeaseByProperty(liveProp.id);
        if (leaseResult.success && leaseResult.data) {
          const l = leaseResult.data;
          setLease((prev) => ({
            ...prev,
            agreementNumber: l.agreement_number || prev.agreementNumber,
            startDate: l.start_date || prev.startDate,
            endDate: l.end_date || prev.endDate,
            monthlyRent: Number(l.monthly_rent || prev.monthlyRent),
            securityDeposit: Number(l.security_deposit || prev.securityDeposit),
            renewalStatus: l.renewal_status || prev.renewalStatus,
            status: l.status || prev.status
          }));
        }

        // 4. Fetch live payments if table exists
        const paymentsResult = await paymentService.getPaymentHistory(liveProp.id);
        if (paymentsResult.success && paymentsResult.data?.length) {
          setPayments((prev) => ({
            ...prev,
            transactions: paymentsResult.data.map((p) => ({
              id: p.id,
              period: p.payment_period,
              date: p.payment_date,
              rentAmount: Number(p.rent_amount),
              maintenanceAmount: Number(p.additional_charges || 0),
              lateFee: Number(p.late_fees || 0),
              totalAmount: Number(p.total_amount),
              method: p.payment_method,
              referenceNumber: p.transaction_reference,
              status: p.status,
              notes: p.notes
            }))
          }));
        }

        // 5. Fetch live notifications if table exists
        const notifsResult = await notificationService.getNotifications(liveProp.id, tenant.email);
        if (notifsResult.success && notifsResult.data?.length) {
          setNotifications(notifsResult.data.map((n) => ({
            id: n.id,
            title: n.title,
            category: n.category,
            type: n.category.toLowerCase().includes('payment') ? 'payment' : n.category.toLowerCase().includes('maintenance') ? 'maintenance' : 'notice',
            message: n.message,
            timestamp: n.created_at,
            isRead: Boolean(n.is_read),
            targetModule: n.target_module || 'notifications'
          })));
        }
      }
      setSupabaseStatus('connected');
    } catch (err) {
      console.warn('Supabase sync notice:', err.message);
      setLiveSyncError(err.message);
      setSupabaseStatus('awaiting_auth');
    } finally {
      setIsLoadingLive(false);
    }
  }, [tenant.email]);

  useEffect(() => {
    refreshLiveData();
  }, [refreshLiveData]);

  // Actions

  // 1. Update Profile
  const updateProfile = (updatedFields) => {
    setTenant((prev) => ({
      ...prev,
      ...updatedFields,
      emergencyContact: {
        ...prev.emergencyContact,
        ...(updatedFields.emergencyContact || {})
      }
    }));
    showToast('Profile information updated successfully!');
  };

  // 2. Submit Online Payment (Demo / Read-only in this phase)
  const submitPayment = ({ amount, period, method, referenceNumber, notes }) => {
    const newTxnId = `TXN-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const newTxn = {
      id: newTxnId,
      period: period || 'November 2026',
      date: today,
      rentAmount: payments.monthlyRent,
      maintenanceAmount: payments.maintenanceFee,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: amount || (payments.monthlyRent + payments.maintenanceFee),
      method: method || 'UPI (Instant Demo)',
      referenceNumber: referenceNumber || `REF-${Math.floor(100000000 + Math.random() * 900000000)}`,
      status: 'Paid',
      notes: notes || 'Demo payment processed successfully.'
    };

    setPayments((prev) => ({
      ...prev,
      currentMonthStatus: 'Paid',
      outstandingAmount: 0,
      transactions: [newTxn, ...prev.transactions]
    }));

    // Add generated receipt to documents list
    const newDoc = {
      id: `DOC-REC-${newTxnId}`,
      name: `Rent Receipt — ${newTxn.period}`,
      category: 'Rent Receipts',
      property: `${property.name}, Unit ${property.unit}`,
      uploadedDate: today,
      fileFormat: 'PDF',
      fileSize: '240 KB',
      description: `Receipt for ₹${newTxn.totalAmount.toLocaleString('en-IN')} paid via ${newTxn.method}.`
    };
    setDocuments((prev) => [newDoc, ...prev]);

    // Add notification
    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title: `Payment Received: ₹${newTxn.totalAmount.toLocaleString('en-IN')}`,
      category: 'Payment Confirmations',
      type: 'payment',
      message: `Your payment of ₹${newTxn.totalAmount.toLocaleString('en-IN')} for ${newTxn.period} was completed. Transaction: ${newTxn.id}.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetModule: 'rent-payments',
      actionLabel: 'View Receipt'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Payment of ₹${newTxn.totalAmount.toLocaleString('en-IN')} completed successfully!`);
    return newTxn;
  };

  // 3. Submit Lease Renewal
  const submitLeaseRenewal = async ({ durationMonths, message }) => {
    const renewalRecord = {
      submittedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      durationMonths,
      message,
      requestedStatus: 'Pending Owner Approval'
    };

    setLease((prev) => ({
      ...prev,
      renewalStatus: 'Pending Owner Approval',
      renewalRequest: renewalRecord
    }));

    if (isSupabaseConfigured && lease?.id) {
      leaseService.requestRenewal(lease.id, { durationMonths, message });
    }

    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title: 'Lease Renewal Request Submitted',
      category: 'Lease Updates',
      type: 'lease',
      message: `Renewal request for ${durationMonths} months submitted to property owner. Awaiting approval.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetModule: 'lease',
      actionLabel: 'View Status'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast('Lease renewal request sent to property owner!');
  };

  // 4. Add Maintenance Request (Connected to Supabase maintenance_tickets)
  const addMaintenanceRequest = async (requestData) => {
    const nextNum = 90 + maintenanceRequests.length;
    const newId = `MNT-2026-0${nextNum}`;
    const today = new Date().toISOString().split('T')[0];

    const newRequest = {
      id: newId,
      title: requestData.title,
      category: requestData.category,
      location: requestData.location || `Unit ${property.unit}`,
      priority: requestData.priority || 'Medium',
      status: 'Submitted',
      submittedDate: today,
      preferredVisitDate: requestData.preferredVisitDate || 'Flexible timing',
      description: requestData.description,
      images: requestData.images || [],
      timeline: [
        { step: 'Submitted', date: `${today}, Just now`, notes: 'Request lodged by tenant.', completed: true },
        { step: 'Acknowledged', date: 'Pending', notes: 'Facility desk will review within 2 hours.', completed: false },
        { step: 'In Progress', date: 'Pending', notes: 'Technician assignment.', completed: false },
        { step: 'Resolved', date: 'Pending', notes: 'Inspection & closure.', completed: false }
      ],
      comments: [
        {
          id: `cmt-${Date.now()}`,
          author: tenant.name,
          role: 'Tenant',
          timestamp: 'Just now',
          text: requestData.description
        }
      ]
    };

    // Optimistic UI update
    setMaintenanceRequests((prev) => [newRequest, ...prev]);

    // Send to Supabase if configured
    if (isSupabaseConfigured) {
      maintenanceService.createTicket({
        companyId: property.companyId || 'COMP_001',
        propertyId: property.id,
        unitNumber: property.unit,
        tenantName: tenant.name,
        category: requestData.category,
        description: requestData.description,
        priority: requestData.priority,
        preferredVisitDate: requestData.preferredVisitDate,
        imageUrl: requestData.images?.[0]
      });
    }

    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title: `Maintenance Request Registered`,
      category: 'Maintenance Updates',
      type: 'maintenance',
      message: `Your request "${requestData.title}" has been registered. Our property desk will assign a technician shortly.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetModule: 'maintenance',
      actionLabel: 'Track Ticket'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Maintenance ticket submitted successfully!`);
    return newRequest;
  };

  // 5. Add Maintenance Comment
  const addMaintenanceComment = (requestId, commentText) => {
    setMaintenanceRequests((prev) =>
      prev.map((req) => {
        if (req.id === requestId) {
          const newComment = {
            id: `cmt-${Date.now()}`,
            author: tenant.name,
            role: 'Tenant',
            timestamp: 'Just now',
            text: commentText
          };
          return {
            ...req,
            comments: [...(req.comments || []), newComment]
          };
        }
        return req;
      })
    );

    if (isSupabaseConfigured) {
      maintenanceService.addTicketNote({
        ticketId: requestId,
        companyId: property.companyId || 'COMP_001',
        authorName: tenant.name,
        note: commentText
      });
    }

    showToast('Comment added to ticket.');
  };

  // 6. Notification helpers
  const markAsRead = (notifId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
    );
    if (isSupabaseConfigured) {
      notificationService.markAsRead(notifId);
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (isSupabaseConfigured) {
      notificationService.markAllAsRead(property.id, tenant.email);
    }
    showToast('All notifications marked as read.');
  };

  const deleteNotification = (notifId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    showToast('Notification removed.');
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.isRead).length;

  // 7. Support Ticket Submission
  const submitSupportTicket = async ({ subject, category, priority, description, attachmentName }) => {
    const newId = `TKT-2026-0${35 + supportTickets.length}`;
    const today = new Date().toISOString().split('T')[0];

    const newTicket = {
      id: newId,
      subject,
      category,
      priority,
      status: 'Open',
      submittedDate: today,
      description,
      attachmentName,
      latestResponse: 'Assigned to Property Desk. Typical response time is under 4 business hours.',
      responseDate: `${today} (System Ack)`
    };

    setSupportTickets((prev) => [newTicket, ...prev]);

    if (isSupabaseConfigured) {
      supportService.createSupportTicket({
        propertyId: property.id,
        companyId: property.companyId || 'COMP_001',
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        tenantPhone: tenant.phone,
        subject,
        category,
        description,
        priority
      });
    }

    const newNotif = {
      id: `NOTIF-${Date.now()}`,
      title: `Support Ticket Created`,
      category: 'General Updates',
      type: 'support',
      message: `Your inquiry "${subject}" has been queued. Our property team will follow up shortly.`,
      timestamp: new Date().toISOString(),
      isRead: false,
      targetModule: 'support',
      actionLabel: 'View Ticket'
    };
    setNotifications((prev) => [newNotif, ...prev]);

    showToast(`Support ticket logged successfully!`);
    return newTicket;
  };

  // Reset Demo Data
  const resetDemoData = () => {
    localStorage.removeItem('propertyse_tenant');
    localStorage.removeItem('propertyse_payments');
    localStorage.removeItem('propertyse_lease');
    localStorage.removeItem('propertyse_maintenance');
    localStorage.removeItem('propertyse_notifications');
    localStorage.removeItem('propertyse_documents');
    localStorage.removeItem('propertyse_support');

    setTenant(initialTenantData);
    setProperty(mockPropertyData);
    setPayments(initialPaymentsData);
    setLease(initialLeaseData);
    setMaintenanceRequests(initialMaintenanceRequests);
    setNotifications(initialNotifications);
    setDocuments(initialDocuments);
    setSupportTickets(initialSupportTickets);
    setIsSignedOut(false);
    setActiveModule('dashboard');
    showToast('Demo data reset to initial values.');
  };

  return (
    <TenantContext.Provider
      value={{
        activeModule,
        setActiveModule,
        isSignedOut,
        setIsSignedOut,
        sidebarOpen,
        setSidebarOpen,
        toast,
        showToast,
        supabaseStatus,
        isLoadingLive,
        liveSyncError,
        refreshLiveData,
        tenant,
        property,
        payments,
        lease,
        maintenanceRequests,
        notifications,
        documents,
        supportTickets,
        unreadNotificationsCount,
        updateProfile,
        submitPayment,
        submitLeaseRenewal,
        addMaintenanceRequest,
        addMaintenanceComment,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        submitSupportTicket,
        resetDemoData
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
