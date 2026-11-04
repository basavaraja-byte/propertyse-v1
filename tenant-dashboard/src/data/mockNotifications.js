export const initialNotifications = [
  {
    id: "NOTIF-001",
    title: "Rent Payment Received for November 2026",
    category: "Payment Confirmations",
    type: "payment",
    message: "Your payment of ₹20,000 for November rent and maintenance was successfully processed. Receipt #REC-2026-1101 is available for download.",
    timestamp: "2026-11-02T11:45:00",
    isRead: false,
    targetModule: "rent-payments",
    actionLabel: "View Receipt"
  },
  {
    id: "NOTIF-002",
    title: "Maintenance Visit Scheduled: Kitchen Drain",
    category: "Maintenance Updates",
    type: "maintenance",
    message: "Technician Santosh is assigned to ticket #MNT-2026-089. Visit scheduled for Nov 04 between 10:00 AM - 1:00 PM.",
    timestamp: "2026-11-03T09:30:00",
    isRead: false,
    targetModule: "maintenance",
    actionLabel: "Track Request"
  },
  {
    id: "NOTIF-003",
    title: "Annual Lease Renewal Window Opened",
    category: "Lease Updates",
    type: "lease",
    message: "Your current lease agreement is set to conclude on 31 Dec 2026. You can submit your renewal preference directly through the Lease module.",
    timestamp: "2026-11-01T10:00:00",
    isRead: false,
    targetModule: "lease",
    actionLabel: "Review Lease"
  },
  {
    id: "NOTIF-004",
    title: "Scheduled Water Tank Cleaning Notice",
    category: "Property Notices",
    type: "notice",
    message: "Society management will conduct overhead water tank cleaning on Sunday, 08 Nov from 9:00 AM to 1:00 PM. Please store required water in advance.",
    timestamp: "2026-10-30T16:20:00",
    isRead: true,
    targetModule: "property",
    actionLabel: "View Property"
  },
  {
    id: "NOTIF-005",
    title: "Diwali Community Celebration & Lighting",
    category: "Owner Announcements",
    type: "announcement",
    message: "Green Valley Residents Association invites all residents to the Diwali cultural evening and sweets exchange at the Clubhouse on Nov 12 at 6:30 PM.",
    timestamp: "2026-10-25T14:10:00",
    isRead: true,
    targetModule: "support",
    actionLabel: "View Info"
  },
  {
    id: "NOTIF-006",
    title: "Maintenance Completed: AC Filter Service",
    category: "Maintenance Updates",
    type: "maintenance",
    message: "Ticket #MNT-2026-074 (Master Bedroom AC servicing) was marked as resolved. Please submit feedback if needed.",
    timestamp: "2026-10-16T16:05:00",
    isRead: true,
    targetModule: "maintenance",
    actionLabel: "View History"
  },
  {
    id: "NOTIF-007",
    title: "Payment Received for October 2026",
    category: "Payment Confirmations",
    type: "payment",
    message: "Payment of ₹20,000 for October rent has been confirmed by owner Rajesh Verma.",
    timestamp: "2026-10-04T12:00:00",
    isRead: true,
    targetModule: "rent-payments",
    actionLabel: "View Statement"
  }
];

