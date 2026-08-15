// Mock data for the Super Admin → Reports prototype. Shaped so a future
// integration with real endpoints (report_builder /kpi, /aggregate, /run —
// see AttendanceReportsTab in pages/admin/attendance for the live pattern)
// can drop in without changing the page components' prop shapes.

export const DEPARTMENTS = ['Engineering', 'Marketing', 'Operations', 'Finance', 'HR', 'Sales', 'Customer Success'] as const;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

// ─── Attendance ─────────────────────────────────────────────────────────────

export interface AttendanceTrendPoint {
  date: string; // "01 Aug"
  present: number;
  absent: number;
  onLeave: number;
  late: number;
}

export interface AttendanceRow {
  id: string;
  employee: string;
  employeeId: string;
  department: string;
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | null;
  status: 'Present' | 'Absent' | 'On Leave' | 'Late';
  lateMins: number | null;
}

const FIRST_NAMES = ['Ali', 'Sana', 'Rizwan', 'Ayesha', 'Hamza', 'Zoya', 'Bilal', 'Mahnoor', 'Usman', 'Hira', 'Fahad', 'Saba', 'Omar', 'Nida', 'Kashif', 'Rabia', 'Tariq', 'Amna', 'Waqas', 'Iqra'];
const LAST_NAMES = ['Javed', 'Malik', 'Khan', 'Fatima', 'Mehmood', 'Ahmed', 'Raza', 'Iqbal', 'Farooq', 'Shah', 'Baig', 'Cheema', 'Butt', 'Qureshi', 'Siddiqui'];

export function generateAttendanceTrend(days: number): AttendanceTrendPoint[] {
  const rng = seededRandom(42);
  const points: AttendanceTrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const present = 190 + Math.floor(rng() * 25);
    const absent = 15 + Math.floor(rng() * 20);
    const onLeave = 8 + Math.floor(rng() * 15);
    const late = 10 + Math.floor(rng() * 18);
    points.push({
      date: `${pad(d.getDate())} ${d.toLocaleString('en-US', { month: 'short' })}`,
      present,
      absent,
      onLeave,
      late,
    });
  }
  return points;
}

export function generateAttendanceRows(count = 60): AttendanceRow[] {
  const rng = seededRandom(7);
  const rows: AttendanceRow[] = [];
  for (let i = 0; i < count; i++) {
    const status = pick(rng, ['Present', 'Present', 'Present', 'Late', 'Absent', 'On Leave'] as const);
    const inHour = 8 + Math.floor(rng() * 2);
    const inMin = Math.floor(rng() * 59);
    const lateMins = status === 'Late' ? 5 + Math.floor(rng() * 40) : null;
    const workHours = status === 'Present' || status === 'Late' ? `${7 + Math.floor(rng() * 2)}h ${Math.floor(rng() * 59)}m` : null;
    rows.push({
      id: `att-${i}`,
      employee: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      employeeId: `EMP-${1000 + i}`,
      department: pick(rng, DEPARTMENTS),
      checkIn: status === 'Absent' || status === 'On Leave' ? null : `${pad(inHour)}:${pad(inMin)} AM`,
      checkOut: status === 'Absent' || status === 'On Leave' ? null : `0${5 + Math.floor(rng() * 2)}:${pad(Math.floor(rng() * 59))} PM`,
      workHours,
      status,
      lateMins,
    });
  }
  return rows;
}

// ─── Assets ─────────────────────────────────────────────────────────────────

export interface AssetRow {
  id: string;
  asset: string;
  category: 'Laptop' | 'Monitor' | 'Mobile' | 'Accessories' | 'Other';
  assetCode: string;
  assignedTo: string | null;
  department: string | null;
  status: 'Assigned' | 'Available' | 'Maintenance' | 'Disposed';
  assignedDate: string | null;
}

const ASSET_MODELS: Record<AssetRow['category'], string[]> = {
  Laptop: ['MacBook Pro 14"', 'Dell XPS 15', 'ThinkPad X1 Carbon', 'MacBook Air M2'],
  Monitor: ['Dell UltraSharp 27"', 'LG 4K 32"', 'Samsung Curved 34"'],
  Mobile: ['iPhone 14', 'Samsung Galaxy S23', 'Pixel 7'],
  Accessories: ['Logitech MX Master 3', 'Keychron K8', 'Sony WH-1000XM5'],
  Other: ['Standing Desk', 'Webcam C920', 'Docking Station'],
};

export function generateAssetRows(count = 55): AssetRow[] {
  const rng = seededRandom(19);
  const rows: AssetRow[] = [];
  const categories: AssetRow['category'][] = ['Laptop', 'Monitor', 'Mobile', 'Accessories', 'Other'];
  for (let i = 0; i < count; i++) {
    const category = pick(rng, categories);
    const status = pick(rng, ['Assigned', 'Assigned', 'Assigned', 'Available', 'Maintenance', 'Disposed'] as const);
    const assigned = status === 'Assigned' || status === 'Maintenance';
    rows.push({
      id: `asset-${i}`,
      asset: pick(rng, ASSET_MODELS[category]),
      category,
      assetCode: `AST-${2000 + i}`,
      assignedTo: assigned ? `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}` : null,
      department: assigned ? pick(rng, DEPARTMENTS) : null,
      status,
      assignedDate: assigned ? `${pad(1 + Math.floor(rng() * 28))} ${pick(rng, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'])} 2026` : null,
    });
  }
  return rows;
}

// ─── Requisitions ───────────────────────────────────────────────────────────

export interface RequisitionTrendPoint {
  date: string;
  requisitions: number;
}

export interface RequisitionRow {
  id: string;
  title: string;
  type: 'Hardware' | 'Software' | 'Office Supplies' | 'Travel' | 'Other';
  requestedBy: string;
  department: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Fulfilled' | 'Closed';
}

const REQ_TITLES: Record<RequisitionRow['type'], string[]> = {
  Hardware: ['New laptop request', 'Additional monitor', 'Replacement keyboard', 'Docking station'],
  Software: ['Figma license', 'JetBrains license', 'Adobe Creative Cloud', 'Zoom Pro seat'],
  'Office Supplies': ['Stationery restock', 'Whiteboard markers', 'Desk organizer'],
  Travel: ['Client visit — Dubai', 'Conference travel', 'Team offsite booking'],
  Other: ['Ergonomic chair', 'Team lunch budget', 'Training course fee'],
};

export function generateRequisitionTrend(days: number): RequisitionTrendPoint[] {
  const rng = seededRandom(88);
  const points: RequisitionTrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    points.push({
      date: `${pad(d.getDate())} ${d.toLocaleString('en-US', { month: 'short' })}`,
      requisitions: 2 + Math.floor(rng() * 10),
    });
  }
  return points;
}

export function generateRequisitionRows(count = 48): RequisitionRow[] {
  const rng = seededRandom(31);
  const rows: RequisitionRow[] = [];
  const types: RequisitionRow['type'][] = ['Hardware', 'Software', 'Office Supplies', 'Travel', 'Other'];
  const statuses: RequisitionRow['status'][] = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Fulfilled', 'Closed'];
  for (let i = 0; i < count; i++) {
    const type = pick(rng, types);
    rows.push({
      id: `req-${i}`,
      title: pick(rng, REQ_TITLES[type]),
      type,
      requestedBy: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      department: pick(rng, DEPARTMENTS),
      date: `${pad(1 + Math.floor(rng() * 28))} ${pick(rng, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'])} 2026`,
      amount: 50 + Math.floor(rng() * 4500),
      status: pick(rng, statuses),
    });
  }
  return rows;
}

// ─── Tickets ────────────────────────────────────────────────────────────────

export interface TicketTrendPoint {
  date: string;
  created: number;
  resolved: number;
}

export interface TicketRow {
  id: string;
  ticket: string;
  subject: string;
  type: 'IT Support' | 'HR' | 'Facilities' | 'Finance' | 'Access Request';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  requester: string;
  department: string;
  assignedTo: string;
  created: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  resolutionHours: number | null;
}

const TICKET_SUBJECTS: Record<TicketRow['type'], string[]> = {
  'IT Support': ['VPN not connecting', 'Laptop running slow', 'Cannot access shared drive', 'Printer offline'],
  HR: ['Leave balance query', 'Payslip discrepancy', 'Update bank details'],
  Facilities: ['AC not working — 3rd floor', 'Broken chair', 'Parking access request'],
  Finance: ['Reimbursement pending', 'Invoice approval needed'],
  'Access Request': ['Access to Figma workspace', 'GitHub repo access', 'VPN credentials reset'],
};

export function generateTicketTrend(days: number): TicketTrendPoint[] {
  const rng = seededRandom(55);
  const points: TicketTrendPoint[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const created = 5 + Math.floor(rng() * 15);
    points.push({
      date: `${pad(d.getDate())} ${d.toLocaleString('en-US', { month: 'short' })}`,
      created,
      resolved: Math.max(0, created - Math.floor(rng() * 6)),
    });
  }
  return points;
}

export function generateTicketRows(count = 52): TicketRow[] {
  const rng = seededRandom(63);
  const rows: TicketRow[] = [];
  const types: TicketRow['type'][] = ['IT Support', 'HR', 'Facilities', 'Finance', 'Access Request'];
  const priorities: TicketRow['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
  const statuses: TicketRow['status'][] = ['Open', 'In Progress', 'Resolved', 'Closed'];
  for (let i = 0; i < count; i++) {
    const type = pick(rng, types);
    const status = pick(rng, statuses);
    rows.push({
      id: `tkt-${i}`,
      ticket: `TKT-${3000 + i}`,
      subject: pick(rng, TICKET_SUBJECTS[type]),
      type,
      priority: pick(rng, priorities),
      requester: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      department: pick(rng, DEPARTMENTS),
      assignedTo: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      created: `${pad(1 + Math.floor(rng() * 28))} ${pick(rng, ['Jun', 'Jul', 'Aug'])} 2026`,
      status,
      resolutionHours: status === 'Resolved' || status === 'Closed' ? 1 + Math.floor(rng() * 47) : null,
    });
  }
  return rows;
}

// ─── Expenses ───────────────────────────────────────────────────────────────
// Mirrors be-work's real `expense_transactions` / `expense_categories` model
// (prisma/schema.prisma): title, total_amount, category → expense_type
// ('MARKETING' | 'OPERATIONS' | 'BOTH'), date, paid_to. The real schema has
// NO status or department column — expenses there are a ledger of
// account transactions, not an approval workflow. Status/department below
// are prototype-only additions (flagged in the final report) since the
// task asks for an approval-style report and the real schema has nothing
// to conflict with on those two fields.

export type ExpenseCategoryType = 'Marketing' | 'Operations' | 'Both';

export interface ExpenseCategoryDef {
  name: string;
  expenseType: ExpenseCategoryType;
}

export const EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { name: 'Advertising', expenseType: 'Marketing' },
  { name: 'Client Events', expenseType: 'Marketing' },
  { name: 'Content & Design', expenseType: 'Marketing' },
  { name: 'Software & Tools', expenseType: 'Operations' },
  { name: 'Office Supplies', expenseType: 'Operations' },
  { name: 'Travel & Transport', expenseType: 'Operations' },
  { name: 'Utilities', expenseType: 'Operations' },
  { name: 'Team Meals', expenseType: 'Both' },
  { name: 'Miscellaneous', expenseType: 'Both' },
];

const EXPENSE_TITLES: Record<string, string[]> = {
  Advertising: ['LinkedIn Ads campaign', 'Google Ads top-up', 'Sponsored post boost'],
  'Client Events': ['Client dinner — Karachi', 'Trade show booth', 'Networking event tickets'],
  'Content & Design': ['Stock photography license', 'Freelance designer invoice', 'Video production'],
  'Software & Tools': ['Figma team seats', 'AWS monthly usage', 'Slack subscription'],
  'Office Supplies': ['Stationery restock', 'Printer toner', 'Pantry supplies'],
  'Travel & Transport': ['Client visit — Dubai', 'Airport transfer', 'Fuel reimbursement'],
  Utilities: ['Office internet bill', 'Electricity bill', 'Office rent installment'],
  'Team Meals': ['Team lunch', 'Late-night dinner order', 'Client lunch meeting'],
  Miscellaneous: ['Courier charges', 'Bank transfer fee', 'Misc. petty cash'],
};

export interface ExpenseTrendPoint {
  month: string; // "Mar 2026"
  total: number;
  approved: number;
  pending: number;
}

export interface ExpenseRow {
  id: string;
  employee: string;
  title: string;
  category: string;
  expenseType: ExpenseCategoryType;
  amount: number;
  department: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  submittedDate: string;
  approvedDate: string | null;
}

export function generateExpenseTrend(months: number): ExpenseTrendPoint[] {
  const rng = seededRandom(101);
  const points: ExpenseTrendPoint[] = [];
  const today = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const total = 8000 + Math.floor(rng() * 12000);
    const approved = Math.round(total * (0.6 + rng() * 0.25));
    const pending = Math.max(0, Math.round((total - approved) * (0.4 + rng() * 0.5)));
    points.push({
      month: d.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
      total,
      approved,
      pending,
    });
  }
  return points;
}

export function generateExpenseRows(count = 58): ExpenseRow[] {
  const rng = seededRandom(74);
  const statuses: ExpenseRow['status'][] = ['Pending', 'Approved', 'Approved', 'Approved', 'Rejected'];
  const rows: ExpenseRow[] = [];
  for (let i = 0; i < count; i++) {
    const cat = pick(rng, EXPENSE_CATEGORIES);
    const status = pick(rng, statuses);
    const day = 1 + Math.floor(rng() * 28);
    const month = pick(rng, ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug']);
    const date = `${pad(day)} ${month} 2026`;
    rows.push({
      id: `exp-${i}`,
      employee: `${pick(rng, FIRST_NAMES)} ${pick(rng, LAST_NAMES)}`,
      title: pick(rng, EXPENSE_TITLES[cat.name]),
      category: cat.name,
      expenseType: cat.expenseType,
      amount: 25 + Math.floor(rng() * 2475),
      department: pick(rng, DEPARTMENTS),
      date,
      status,
      submittedDate: date,
      approvedDate: status === 'Approved' ? `${pad(Math.min(28, day + 1 + Math.floor(rng() * 3)))} ${month} 2026` : null,
    });
  }
  return rows;
}
