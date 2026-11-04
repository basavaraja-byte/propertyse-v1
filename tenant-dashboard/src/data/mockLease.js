export const initialLeaseData = {
  agreementNumber: "LEA-2026-BLR-0492",
  status: "Active", // Active, Expiring Soon, Renewed, Terminated
  propertyName: "Green Valley Residency",
  unit: "B-204",
  leaseType: "Residential Rental Agreement (Registered)",
  startDate: "2026-01-01",
  endDate: "2026-12-31",
  durationMonths: 12,
  noticePeriodDays: 30,
  lockInPeriodMonths: 6,
  monthlyRent: 18000,
  securityDeposit: 50000,
  rentDueDate: "5th of each calendar month",
  escalationClause: "5% annual increase upon mutual renewal agreement",
  permittedOccupants: "2 Adults (Family / Single Professionals)",
  petPolicy: "Small domestic pets permitted with prior written approval",
  sublettingAllowed: false,
  renewalStatus: "Not Requested", // "Not Requested" | "Pending Owner Approval" | "Approved" | "Rejected"
  renewalRequest: null,
  timeline: [
    {
      id: "stage-1",
      title: "Lease Commencement",
      date: "01 Jan 2026",
      status: "completed",
      description: "Agreement executed and keys handed over."
    },
    {
      id: "stage-2",
      title: "Mid-Term Review",
      date: "15 Jun 2026",
      status: "completed",
      description: "6-month routine property inspection cleared."
    },
    {
      id: "stage-3",
      title: "Renewal Window Opened",
      date: "01 Nov 2026",
      status: "current",
      description: "Eligible for 6-12 month lease extension."
    },
    {
      id: "stage-4",
      title: "Lease Expiry",
      date: "31 Dec 2026",
      status: "upcoming",
      description: "Original agreement concludes."
    }
  ],
  documents: [
    {
      id: "DOC-LEA-01",
      title: "Registered Rental Agreement (2026)",
      type: "Agreement",
      format: "PDF",
      size: "3.4 MB",
      uploadDate: "02 Jan 2026",
      signedBy: "Rahul Sharma & Rajesh Verma",
      downloadUrl: "#"
    },
    {
      id: "DOC-LEA-02",
      title: "Karnataka E-Stamp Duty Certificate",
      type: "Legal Certificate",
      format: "PDF",
      size: "820 KB",
      uploadDate: "01 Jan 2026",
      signedBy: "Govt. of Karnataka",
      downloadUrl: "#"
    },
    {
      id: "DOC-LEA-03",
      title: "Move-In Inventory & Condition Checklist",
      type: "Inspection Report",
      format: "PDF",
      size: "2.1 MB",
      uploadDate: "01 Jan 2026",
      signedBy: "PropertySE Facility Team",
      downloadUrl: "#"
    },
    {
      id: "DOC-LEA-04",
      title: "Green Valley Residency Society By-laws",
      type: "Community Guidelines",
      format: "PDF",
      size: "1.2 MB",
      uploadDate: "01 Jan 2026",
      signedBy: "Society Association",
      downloadUrl: "#"
    }
  ]
};

