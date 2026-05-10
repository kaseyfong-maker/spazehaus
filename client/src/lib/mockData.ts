/*
 * SPAZEHAUS MOCK DATA
 * Realistic data for Johor Bahru interior design company
 */

export const currentUser = {
  id: "SH001",
  name: "Grace Tan",
  role: "Principal Designer",
  department: "Design",
  avatar: "GT",
  email: "grace@spazehaus.com",
  phone: "+60 12-345 6789",
};

export const staffMembers = [
  { id: "SH001", name: "Grace Tan", role: "Principal Designer", dept: "Design", avatar: "GT", status: "active", joinDate: "15/03/2019", leaveBalance: { annual: 12, medical: 14 }, kpi: "A" },
  { id: "SH002", name: "Wilson Lee", role: "Senior Designer", dept: "Design", avatar: "WL", status: "active", joinDate: "01/07/2020", leaveBalance: { annual: 8, medical: 14 }, kpi: "A" },
  { id: "SH003", name: "Jackson Low", role: "Interior Designer", dept: "Design", avatar: "JL", status: "active", joinDate: "12/01/2021", leaveBalance: { annual: 10, medical: 14 }, kpi: "B" },
  { id: "SH004", name: "Wai Hong", role: "Project Manager", dept: "Operations", avatar: "WH", status: "active", joinDate: "05/09/2020", leaveBalance: { annual: 9, medical: 14 }, kpi: "A" },
  { id: "SH005", name: "Hong Li", role: "Sales Consultant", dept: "Sales", avatar: "HL", status: "active", joinDate: "20/02/2022", leaveBalance: { annual: 6, medical: 14 }, kpi: "B" },
  { id: "SH006", name: "Darerca Chaw", role: "3D Visualizer", dept: "Design", avatar: "DC", status: "active", joinDate: "08/06/2021", leaveBalance: { annual: 7, medical: 14 }, kpi: "B" },
  { id: "SH007", name: "Denise Ng", role: "Admin Executive", dept: "Admin", avatar: "DN", status: "active", joinDate: "14/11/2020", leaveBalance: { annual: 11, medical: 14 }, kpi: "A" },
  { id: "SH008", name: "Vinson Tan", role: "Interior Designer", dept: "Design", avatar: "VT", status: "on-leave", joinDate: "03/04/2022", leaveBalance: { annual: 5, medical: 12 }, kpi: "B" },
  { id: "SH009", name: "Leong Hui", role: "Site Supervisor", dept: "Operations", avatar: "LH", status: "on-project", joinDate: "22/08/2019", leaveBalance: { annual: 14, medical: 14 }, kpi: "A" },
  { id: "SH010", name: "Chiou Ying", role: "Sales Consultant", dept: "Sales", avatar: "CY", status: "active", joinDate: "17/05/2023", leaveBalance: { annual: 4, medical: 14 }, kpi: "B" },
];

/** Project record shape — kept open so the conversion flow can push new entries. */
export type Project = {
  id: string;
  name: string;
  client: string;
  clientContact: string;
  type: string;             // "Residential" | "Commercial"
  propertyType: string;
  location: string;
  size: number;
  budget: number;
  startDate: string;        // DD/MM/YYYY
  targetDate: string;
  status: string;           // "active" | "assigned" | "under-review" | "completed" | "on-hold"
  priority: string;         // "high" | "medium" | "low"
  progress: number;
  designer: string;
  pm: string;
  team: string[];
  photoCount: number;
  taskCount: number;
  tasksCompleted: number;
  areas: string[];
  description: string;
};

export const projects: Project[] = [
  {
    id: "PRJ001",
    name: "The Paragon Residence",
    client: "Mr. & Mrs. Lim",
    clientContact: "+60 11-234 5678",
    type: "Residential",
    propertyType: "Condominium",
    location: "Bukit Indah, Johor Bahru",
    size: 1850,
    budget: 280000,
    startDate: "05/01/2026",
    targetDate: "30/04/2026",
    status: "active",
    priority: "high",
    progress: 65,
    designer: "Wilson Lee",
    pm: "Wai Hong",
    team: ["WL", "JL", "DC"],
    photoCount: 24,
    taskCount: 12,
    tasksCompleted: 8,
    areas: ["Living Room", "Master Bedroom", "Bedroom 2", "Kitchen", "Dining Area", "Master Bathroom"],
    description: "Full renovation of a 1,850 sqft condominium unit with a modern luxury aesthetic. Dark tones with warm gold accents throughout.",
  },
  {
    id: "PRJ002",
    name: "Eco Botanic Office Suite",
    client: "TechVenture Sdn Bhd",
    clientContact: "+60 7-456 7890",
    type: "Commercial",
    propertyType: "Office",
    location: "Eco Botanic, Iskandar Puteri",
    size: 3200,
    budget: 520000,
    startDate: "15/11/2025",
    targetDate: "28/02/2026",
    status: "under-review",
    priority: "high",
    progress: 92,
    designer: "Grace Tan",
    pm: "Wai Hong",
    team: ["GT", "WL", "LH"],
    photoCount: 48,
    taskCount: 18,
    tasksCompleted: 17,
    areas: ["Reception", "Open Office", "Meeting Room A", "Meeting Room B", "Pantry", "Director's Office"],
    description: "Contemporary open-plan office design for a tech startup. Biophilic design elements with natural materials and smart lighting.",
  },
  {
    id: "PRJ003",
    name: "Setia Indah Landed Home",
    client: "Dato' Ahmad Razif",
    clientContact: "+60 12-678 9012",
    type: "Residential",
    propertyType: "Landed",
    location: "Setia Indah, Johor Bahru",
    size: 4200,
    budget: 650000,
    startDate: "10/02/2026",
    targetDate: "31/07/2026",
    status: "assigned",
    priority: "medium",
    progress: 15,
    designer: "Jackson Low",
    pm: "Wai Hong",
    team: ["JL", "DC", "VT"],
    photoCount: 6,
    taskCount: 22,
    tasksCompleted: 3,
    areas: ["Living Room", "Dining Room", "Kitchen", "Master Suite", "Bedroom 2", "Bedroom 3", "Study", "Garden Lounge"],
    description: "Luxury landed property renovation with a blend of contemporary and traditional Malaysian design elements.",
  },
  {
    id: "PRJ004",
    name: "Paradigm Mall F&B Outlet",
    client: "Saveur Group",
    clientContact: "+60 7-890 1234",
    type: "Commercial",
    propertyType: "F&B",
    location: "Paradigm Mall, Johor Bahru",
    size: 1200,
    budget: 380000,
    startDate: "20/01/2026",
    targetDate: "15/03/2026",
    status: "completed",
    priority: "medium",
    progress: 100,
    designer: "Grace Tan",
    pm: "Wai Hong",
    team: ["GT", "DC"],
    photoCount: 32,
    taskCount: 14,
    tasksCompleted: 14,
    areas: ["Dining Area", "Bar Counter", "Kitchen", "Entrance", "Private Dining"],
    description: "Upscale restaurant interior with a Japanese-inspired minimalist aesthetic. Warm timber, stone, and curated lighting.",
  },
  {
    id: "PRJ005",
    name: "Austin Heights Condo",
    client: "Ms. Tan Wei Lin",
    clientContact: "+60 16-345 6789",
    type: "Residential",
    propertyType: "Condominium",
    location: "Austin Heights, Johor Bahru",
    size: 980,
    budget: 120000,
    startDate: "01/03/2026",
    targetDate: "31/05/2026",
    status: "active",
    priority: "low",
    progress: 30,
    designer: "Darerca Chaw",
    pm: "Jackson Low",
    team: ["DC", "JL"],
    photoCount: 8,
    taskCount: 9,
    tasksCompleted: 3,
    areas: ["Living Room", "Master Bedroom", "Kitchen", "Bathroom"],
    description: "Compact but elegant studio-style renovation with smart storage solutions and a neutral palette.",
  },
];

export const leaveRequests = [
  { id: "LV001", staffId: "SH008", staffName: "Vinson Tan", type: "Annual Leave", startDate: "24/02/2026", endDate: "26/02/2026", days: 3, reason: "Family vacation", status: "approved", appliedDate: "18/02/2026" },
  { id: "LV002", staffId: "SH003", staffName: "Jackson Low", type: "Medical Leave", startDate: "21/02/2026", endDate: "21/02/2026", days: 1, reason: "Fever and flu", status: "approved", appliedDate: "21/02/2026" },
  { id: "LV003", staffId: "SH005", staffName: "Hong Li", type: "Annual Leave", startDate: "03/03/2026", endDate: "05/03/2026", days: 3, reason: "Personal matters", status: "pending", appliedDate: "22/02/2026" },
  { id: "LV004", staffId: "SH010", staffName: "Chiou Ying", type: "Replacement Leave", startDate: "28/02/2026", endDate: "28/02/2026", days: 1, reason: "Replacement for weekend work", status: "pending", appliedDate: "23/02/2026" },
];

export const candidates = [
  { id: "C001", name: "Amirah Binti Zulkifli", role: "Interior Designer", source: "LinkedIn", stage: "2nd Interview", appliedDate: "10/02/2026", experience: "3 years", portfolio: "behance.net/amirahdesign" },
  { id: "C002", name: "Kevin Chong", role: "3D Visualizer", source: "Referral", stage: "Shortlisted", appliedDate: "15/02/2026", experience: "2 years", portfolio: "artstation.com/kevinchong" },
  { id: "C003", name: "Priya Nair", role: "Sales Consultant", source: "JobStreet", stage: "Interview", appliedDate: "18/02/2026", experience: "4 years", portfolio: null },
  { id: "C004", name: "Muhammad Haziq", role: "Site Supervisor", source: "Walk-in", stage: "Sourced", appliedDate: "20/02/2026", experience: "5 years", portfolio: null },
  { id: "C005", name: "Stephanie Lim", role: "Interior Designer", source: "Instagram", stage: "Onboarded", appliedDate: "01/02/2026", experience: "1 year", portfolio: "instagram.com/stephanieinteriors" },
];

export const announcements = [
  { id: "A001", title: "CNY Office Closure", content: "The office will be closed from 28 Jan to 3 Feb 2026 for Chinese New Year. Emergency contacts remain active.", date: "20/01/2026", priority: "high", author: "Grace Tan" },
  { id: "A002", title: "New Project Management SOP", content: "Please review the updated project documentation guidelines uploaded to the shared drive. All new projects from March onwards must follow the new SOP.", date: "15/02/2026", priority: "medium", author: "Wai Hong" },
  { id: "A003", title: "Team Lunch — March 2026", content: "Monthly team lunch will be held at Spazehaus Showroom on 7 March 2026 at 12:30pm. Attendance is mandatory.", date: "22/02/2026", priority: "low", author: "Denise Ng" },
];

export const kpiData = {
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  scores: [88, 91, 85, 92, 89, 94, 87, 90, 93, 88, null, null],
  rating: "A",
  parts: [
    { name: "Part A — Attendance & Leave", weight: 30, score: 28, max: 30 },
    { name: "Part B — Task Performance", weight: 50, score: 44, max: 50 },
    { name: "Part C — Attitude & Initiative", weight: 20, score: 17, max: 20 },
  ],
};

export const calendarEvents = [
  { id: "E001", title: "Site Visit — Paragon Residence", date: "2026-02-24", type: "project", color: "#C9A96E", projectId: "PRJ001" },
  { id: "E002", title: "Client Meeting — Setia Indah", date: "2026-02-25", type: "meeting", color: "#5B7FA6", projectId: "PRJ003" },
  { id: "E003", title: "Vinson — Annual Leave", date: "2026-02-24", type: "leave", color: "#C0614A" },
  { id: "E004", title: "Design Presentation — Eco Botanic", date: "2026-02-26", type: "meeting", color: "#5B7FA6", projectId: "PRJ002" },
  { id: "E005", title: "Material Sourcing — Austin Heights", date: "2026-02-27", type: "project", color: "#C9A96E", projectId: "PRJ005" },
  { id: "E006", title: "Team Lunch", date: "2026-03-07", type: "event", color: "#6B9E6B" },
];

export const statusConfig = {
  "active": { label: "Active", bg: "oklch(0.55 0.07 240 / 20%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.55 0.07 240 / 30%)" },
  "assigned": { label: "Assigned", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  "under-review": { label: "Under Review", bg: "oklch(0.75 0.12 68 / 15%)", color: "oklch(0.80 0.12 68)", border: "oklch(0.75 0.12 68 / 25%)" },
  "completed": { label: "Completed", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
  "on-hold": { label: "On Hold", bg: "oklch(0.55 0.006 80 / 15%)", color: "oklch(0.65 0.006 80)", border: "oklch(0.55 0.006 80 / 25%)" },
  "pending": { label: "Pending", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  "approved": { label: "Approved", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
  "rejected": { label: "Rejected", bg: "oklch(0.58 0.12 25 / 20%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 30%)" },
  "on-leave": { label: "On Leave", bg: "oklch(0.58 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 25%)" },
  "on-project": { label: "On Project", bg: "oklch(0.55 0.07 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.55 0.07 240 / 25%)" },
};

export const priorityConfig = {
  "high": { label: "High", color: "oklch(0.68 0.12 25)" },
  "medium": { label: "Medium", color: "oklch(0.72 0.09 68)" },
  "low": { label: "Low", color: "oklch(0.60 0.07 145)" },
};
