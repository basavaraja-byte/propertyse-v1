export const initialMaintenanceRequests = [
  {
    id: "MNT-2026-089",
    title: "Kitchen Sink Drain Slow Drainage",
    category: "Plumbing",
    location: "Kitchen",
    priority: "Medium",
    status: "In Progress", // "Submitted" | "Acknowledged" | "In Progress" | "Resolved"
    submittedDate: "2026-11-02",
    preferredVisitDate: "2026-11-04 (10:00 AM - 1:00 PM)",
    description: "The kitchen sink water drains very slowly after washing dishes, possibly grease accumulation or pipe blockage.",
    images: [
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80"
    ],
    timeline: [
      { step: "Submitted", date: "02 Nov 2026, 11:30 AM", notes: "Request registered by tenant.", completed: true },
      { step: "Acknowledged", date: "02 Nov 2026, 02:15 PM", notes: "Reviewed by PropertySE facility desk.", completed: true },
      { step: "In Progress", date: "03 Nov 2026, 09:30 AM", notes: "Technician assigned (Santosh - Plumber). Visit confirmed.", completed: true },
      { step: "Resolved", date: "Pending completion", notes: "Final inspection after work done.", completed: false }
    ],
    comments: [
      {
        id: "c1",
        author: "Santosh (PropertySE Plumber)",
        role: "Technician",
        timestamp: "03 Nov 2026, 10:00 AM",
        text: "I will visit your unit on 4th Nov around 11:30 AM with drain snake equipment."
      },
      {
        id: "c2",
        author: "Rahul Sharma",
        role: "Tenant",
        timestamp: "03 Nov 2026, 10:15 AM",
        text: "Thanks Santosh, I will be home during that slot."
      }
    ]
  },
  {
    id: "MNT-2026-074",
    title: "Master Bedroom AC Filter Cleaning & Gas Check",
    category: "Air Conditioning",
    location: "Master Bedroom",
    priority: "Low",
    status: "Resolved",
    submittedDate: "2026-10-14",
    preferredVisitDate: "2026-10-16 (02:00 PM - 05:00 PM)",
    description: "AC cooling felt slightly reduced. Requested routine filter clean and refrigerant pressure verification.",
    images: [],
    timeline: [
      { step: "Submitted", date: "14 Oct 2026, 09:10 AM", notes: "Ticket submitted by Rahul.", completed: true },
      { step: "Acknowledged", date: "14 Oct 2026, 11:00 AM", notes: "Approved by Rajesh Verma (Owner).", completed: true },
      { step: "In Progress", date: "16 Oct 2026, 02:30 PM", notes: "UrbanClap technician serviced the split unit.", completed: true },
      { step: "Resolved", date: "16 Oct 2026, 04:00 PM", notes: "Cooling restored to 18°C. Tenant verified satisfactory.", completed: true }
    ],
    comments: [
      {
        id: "c3",
        author: "Vikram Singh",
        role: "Property Manager",
        timestamp: "16 Oct 2026, 04:15 PM",
        text: "Maintenance charge covered under quarterly owner preventive maintenance plan."
      }
    ]
  },
  {
    id: "MNT-2026-061",
    title: "Balcony Sliding Door Latch Loose",
    category: "Furniture",
    location: "Living Room Balcony",
    priority: "Low",
    status: "Resolved",
    submittedDate: "2026-09-08",
    preferredVisitDate: "2026-09-10 (11:00 AM - 02:00 PM)",
    description: "The sliding glass door lock latch was misaligned and hard to snap shut.",
    images: [],
    timeline: [
      { step: "Submitted", date: "08 Sep 2026, 04:20 PM", notes: "Logged in dashboard.", completed: true },
      { step: "Acknowledged", date: "09 Sep 2026, 10:00 AM", notes: "Carpenter dispatched.", completed: true },
      { step: "In Progress", date: "10 Sep 2026, 11:45 AM", notes: "Replaced lock screws and adjusted track.", completed: true },
      { step: "Resolved", date: "10 Sep 2026, 12:30 PM", notes: "Tested smooth closing and locking.", completed: true }
    ],
    comments: []
  }
];

