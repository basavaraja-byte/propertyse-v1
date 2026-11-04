export const initialPaymentsData = {
  monthlyRent: 18000,
  maintenanceFee: 2000,
  waterCharges: 0,
  securityDeposit: 50000,
  securityDepositStatus: "Paid (Held in Escrow)",
  rentDueDate: "5th of every month",
  nextDueDate: "2026-12-05",
  currentMonthStatus: "Paid", // or "Pending" / "Overdue"
  outstandingAmount: 0,
  lateFee: 0,
  transactions: [
    {
      id: "TXN-2026-1101",
      period: "November 2026",
      date: "2026-11-02",
      rentAmount: 18000,
      maintenanceAmount: 2000,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 20000,
      method: "UPI (Google Pay)",
      referenceNumber: "UPI/331902847192",
      status: "Paid",
      notes: "Monthly rent & society maintenance paid on time."
    },
    {
      id: "TXN-2026-1002",
      period: "October 2026",
      date: "2026-10-04",
      rentAmount: 18000,
      maintenanceAmount: 2000,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 20000,
      method: "Net Banking (HDFC Bank)",
      referenceNumber: "NEFT-HDFC000129-8819",
      status: "Paid",
      notes: "Monthly rent transfer."
    },
    {
      id: "TXN-2026-0903",
      period: "September 2026",
      date: "2026-09-03",
      rentAmount: 18000,
      maintenanceAmount: 2000,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 20000,
      method: "UPI (PhonePe)",
      referenceNumber: "UPI/229018471923",
      status: "Paid",
      notes: "On-time payment."
    },
    {
      id: "TXN-2026-0804",
      period: "August 2026",
      date: "2026-08-05",
      rentAmount: 18000,
      maintenanceAmount: 2000,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 20000,
      method: "Credit Card (HDFC Regalia)",
      referenceNumber: "CARD-AUTH-991823",
      status: "Paid",
      notes: "Card payment processed."
    },
    {
      id: "TXN-2026-0705",
      period: "July 2026",
      date: "2026-07-04",
      rentAmount: 18000,
      maintenanceAmount: 2000,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 20000,
      method: "UPI (Google Pay)",
      referenceNumber: "UPI/219847102948",
      status: "Paid",
      notes: "Standard monthly transfer."
    },
    {
      id: "TXN-2026-0100",
      period: "January 2026",
      date: "2026-01-01",
      rentAmount: 18000,
      maintenanceAmount: 0,
      utilityAmount: 0,
      lateFee: 0,
      totalAmount: 68000,
      method: "Net Banking (HDFC Bank)",
      referenceNumber: "IMPS-60019284710",
      status: "Paid",
      notes: "Security deposit (₹50,000) + First month rent (₹18,000)."
    }
  ]
};

