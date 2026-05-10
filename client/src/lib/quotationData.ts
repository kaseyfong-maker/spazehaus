/*
 * SPAZEHAUS QUOTATION & INVOICE DATA
 * Mock data for the Quotation/Invoice module
 */

export type LineItem = {
  id: string;
  area: string;
  description: string;
  category: "Design" | "Material" | "Labour" | "Furniture" | "Electrical" | "Plumbing" | "Others";
  qty: number;
  unit: string;
  unitPrice: number;
  discount: number; // percentage
};

export type Quotation = {
  id: string;
  projectId: string;
  projectName: string;
  client: string;
  clientContact: string;
  clientEmail: string;
  clientAddress: string;
  type: "Quotation" | "Invoice" | "Proforma Invoice";
  status: "draft" | "sent" | "accepted" | "rejected" | "invoiced" | "paid";
  issueDate: string;
  validUntil?: string;
  dueDate?: string;
  items: LineItem[];
  taxRate: number; // percentage
  notes: string;
  terms: string;
  revision: number;
};

export const quotations: Quotation[] = [
  {
    id: "QT-2026-001",
    projectId: "PRJ001",
    projectName: "The Paragon Residence",
    client: "Mr. & Mrs. Lim",
    clientContact: "+60 11-234 5678",
    clientEmail: "lim.family@gmail.com",
    clientAddress: "Unit 12-3, The Paragon, Bukit Indah, 81200 Johor Bahru, Johor",
    type: "Quotation",
    status: "accepted",
    issueDate: "02/01/2026",
    validUntil: "02/02/2026",
    revision: 2,
    taxRate: 0,
    notes: "Prices quoted are inclusive of all materials, labour, and project management fees unless otherwise stated. All custom furniture lead time is 6–8 weeks.",
    terms: "50% deposit upon acceptance. 30% upon commencement of works. 20% upon completion and handover. All payments via bank transfer to Spazehaus Design Sdn Bhd.",
    items: [
      { id: "I001", area: "Living Room", description: "Feature TV Console — Walnut veneer with LED strip lighting, 3m span", category: "Furniture", qty: 1, unit: "set", unitPrice: 12500, discount: 0 },
      { id: "I002", area: "Living Room", description: "Plaster ceiling with cove lighting, 280 sqft", category: "Labour", qty: 280, unit: "sqft", unitPrice: 18, discount: 0 },
      { id: "I003", area: "Living Room", description: "Engineered timber flooring — Herringbone pattern, 280 sqft", category: "Material", qty: 280, unit: "sqft", unitPrice: 22, discount: 5 },
      { id: "I004", area: "Master Bedroom", description: "Full carpentry wardrobe — 3.6m, swing door with mirror panel", category: "Furniture", qty: 1, unit: "set", unitPrice: 9800, discount: 0 },
      { id: "I005", area: "Master Bedroom", description: "Bed frame — upholstered headboard, queen size", category: "Furniture", qty: 1, unit: "unit", unitPrice: 4200, discount: 0 },
      { id: "I006", area: "Master Bedroom", description: "Plaster ceiling with indirect lighting, 180 sqft", category: "Labour", qty: 180, unit: "sqft", unitPrice: 18, discount: 0 },
      { id: "I007", area: "Kitchen", description: "Kitchen cabinet — upper & lower, lacquer finish, 12ft run", category: "Furniture", qty: 12, unit: "ft", unitPrice: 680, discount: 0 },
      { id: "I008", area: "Kitchen", description: "Quartz countertop — Calacatta white, 12ft", category: "Material", qty: 12, unit: "ft", unitPrice: 380, discount: 0 },
      { id: "I009", area: "Dining Area", description: "Dining table — solid oak, 6-seater custom made", category: "Furniture", qty: 1, unit: "set", unitPrice: 6800, discount: 0 },
      { id: "I010", area: "All Areas", description: "Interior design & project management fee", category: "Design", qty: 1, unit: "lump sum", unitPrice: 18000, discount: 0 },
      { id: "I011", area: "All Areas", description: "Electrical works — lighting points, switches, sockets", category: "Electrical", qty: 1, unit: "lump sum", unitPrice: 12000, discount: 0 },
      { id: "I012", area: "Master Bathroom", description: "Bathroom renovation — tiles, sanitary, accessories", category: "Material", qty: 1, unit: "lump sum", unitPrice: 22000, discount: 0 },
    ],
  },
  {
    id: "QT-2026-002",
    projectId: "PRJ002",
    projectName: "Eco Botanic Office Suite",
    client: "TechVenture Sdn Bhd",
    clientContact: "+60 7-456 7890",
    clientEmail: "admin@techventure.com.my",
    clientAddress: "Level 8, Eco Botanic Tower, Iskandar Puteri, 79100 Johor Bahru, Johor",
    type: "Invoice",
    status: "paid",
    issueDate: "15/11/2025",
    dueDate: "30/11/2025",
    revision: 1,
    taxRate: 8,
    notes: "Final invoice upon project completion. All works have been completed and accepted by client on 20/02/2026.",
    terms: "Payment due within 14 days of invoice date. Late payment subject to 1.5% monthly interest charge.",
    items: [
      { id: "J001", area: "Reception", description: "Reception counter — custom curved design, stone cladding", category: "Furniture", qty: 1, unit: "set", unitPrice: 28000, discount: 0 },
      { id: "J002", area: "Open Office", description: "Workstation system — 20 units, sit-stand desks", category: "Furniture", qty: 20, unit: "unit", unitPrice: 3200, discount: 10 },
      { id: "J003", area: "Meeting Room A", description: "Conference table — 10-seater, solid walnut", category: "Furniture", qty: 1, unit: "unit", unitPrice: 18000, discount: 0 },
      { id: "J004", area: "Meeting Room B", description: "Collaboration table — 6-seater with whiteboard wall", category: "Furniture", qty: 1, unit: "set", unitPrice: 12000, discount: 0 },
      { id: "J005", area: "All Areas", description: "Biophilic wall installation — preserved moss & plants", category: "Material", qty: 1, unit: "lump sum", unitPrice: 35000, discount: 0 },
      { id: "J006", area: "All Areas", description: "Smart lighting system — Philips Hue commercial", category: "Electrical", qty: 1, unit: "lump sum", unitPrice: 42000, discount: 5 },
      { id: "J007", area: "All Areas", description: "Interior design & project management fee", category: "Design", qty: 1, unit: "lump sum", unitPrice: 52000, discount: 0 },
      { id: "J008", area: "Pantry", description: "Pantry cabinet & countertop, full fit-out", category: "Furniture", qty: 1, unit: "lump sum", unitPrice: 18000, discount: 0 },
    ],
  },
  {
    id: "QT-2026-003",
    projectId: "PRJ003",
    projectName: "Setia Indah Landed Home",
    client: "Dato' Ahmad Razif",
    clientContact: "+60 12-678 9012",
    clientEmail: "dato.razif@gmail.com",
    clientAddress: "No. 12, Jalan Setia Murni 2, Setia Indah, 81100 Johor Bahru, Johor",
    type: "Quotation",
    status: "sent",
    issueDate: "08/02/2026",
    validUntil: "08/03/2026",
    revision: 1,
    taxRate: 0,
    notes: "This quotation covers full renovation works for the 4,200 sqft landed property. Phased payment schedule available upon request.",
    terms: "50% deposit upon acceptance. 25% upon commencement. 25% upon completion. All custom items are non-refundable once ordered.",
    items: [
      { id: "K001", area: "Living Room", description: "Feature wall — Venetian plaster finish with gold inlay", category: "Labour", qty: 1, unit: "lump sum", unitPrice: 18000, discount: 0 },
      { id: "K002", area: "Living Room", description: "Marble flooring — Statuario marble, 400 sqft", category: "Material", qty: 400, unit: "sqft", unitPrice: 85, discount: 0 },
      { id: "K003", area: "Master Suite", description: "Full master suite carpentry — wardrobe, dressing table, bedframe", category: "Furniture", qty: 1, unit: "set", unitPrice: 45000, discount: 0 },
      { id: "K004", area: "Kitchen", description: "Full kitchen renovation — island, cabinets, countertop, appliances", category: "Furniture", qty: 1, unit: "lump sum", unitPrice: 85000, discount: 5 },
      { id: "K005", area: "All Areas", description: "Interior design & project management fee", category: "Design", qty: 1, unit: "lump sum", unitPrice: 65000, discount: 0 },
      { id: "K006", area: "All Areas", description: "Electrical & smart home system", category: "Electrical", qty: 1, unit: "lump sum", unitPrice: 55000, discount: 0 },
      { id: "K007", area: "Garden Lounge", description: "Outdoor deck & landscaping", category: "Others", qty: 1, unit: "lump sum", unitPrice: 38000, discount: 0 },
    ],
  },
  {
    id: "QT-2026-004",
    projectId: "PRJ005",
    projectName: "Austin Heights Condo",
    client: "Ms. Tan Wei Lin",
    clientContact: "+60 16-345 6789",
    clientEmail: "tanweilin@gmail.com",
    clientAddress: "Unit 8-12, Austin Heights Sky, Jalan Austin Heights 8, 81100 Johor Bahru, Johor",
    type: "Quotation",
    status: "draft",
    issueDate: "20/02/2026",
    validUntil: "20/03/2026",
    revision: 1,
    taxRate: 0,
    notes: "Compact renovation package for 980 sqft condominium. Smart storage solutions included.",
    terms: "50% deposit upon acceptance. 50% upon completion.",
    items: [
      { id: "L001", area: "Living Room", description: "TV feature wall with storage, laminate finish", category: "Furniture", qty: 1, unit: "set", unitPrice: 6800, discount: 0 },
      { id: "L002", area: "Living Room", description: "Vinyl plank flooring, 280 sqft", category: "Material", qty: 280, unit: "sqft", unitPrice: 12, discount: 0 },
      { id: "L003", area: "Master Bedroom", description: "Built-in wardrobe — 2.4m, 4 panel", category: "Furniture", qty: 1, unit: "set", unitPrice: 5200, discount: 0 },
      { id: "L004", area: "Kitchen", description: "Kitchen cabinet — upper & lower, 8ft run", category: "Furniture", qty: 8, unit: "ft", unitPrice: 580, discount: 0 },
      { id: "L005", area: "All Areas", description: "Interior design fee", category: "Design", qty: 1, unit: "lump sum", unitPrice: 8000, discount: 0 },
      { id: "L006", area: "All Areas", description: "Electrical minor works", category: "Electrical", qty: 1, unit: "lump sum", unitPrice: 4500, discount: 0 },
    ],
  },
];

export const statusConfig: Record<string, { label: string; bg: string; color: string; border: string }> = {
  draft: { label: "Draft", bg: "oklch(0.55 0.006 80 / 15%)", color: "oklch(0.65 0.006 80)", border: "oklch(0.55 0.006 80 / 25%)" },
  sent: { label: "Sent", bg: "oklch(0.70 0.09 240 / 15%)", color: "oklch(0.70 0.09 240)", border: "oklch(0.70 0.09 240 / 25%)" },
  accepted: { label: "Accepted", bg: "oklch(0.60 0.07 145 / 15%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 25%)" },
  rejected: { label: "Rejected", bg: "oklch(0.58 0.12 25 / 15%)", color: "oklch(0.68 0.12 25)", border: "oklch(0.58 0.12 25 / 25%)" },
  invoiced: { label: "Invoiced", bg: "oklch(0.72 0.09 68 / 15%)", color: "oklch(0.72 0.09 68)", border: "oklch(0.72 0.09 68 / 25%)" },
  paid: { label: "Paid", bg: "oklch(0.60 0.07 145 / 20%)", color: "oklch(0.70 0.09 145)", border: "oklch(0.60 0.07 145 / 30%)" },
};

export const categoryColors: Record<string, string> = {
  Design: "oklch(0.72 0.09 68)",
  Material: "oklch(0.70 0.09 240)",
  Labour: "oklch(0.80 0.12 68)",
  Furniture: "oklch(0.60 0.07 145)",
  Electrical: "oklch(0.68 0.12 25)",
  Plumbing: "oklch(0.58 0.12 25)",
  Others: "oklch(0.55 0.006 80)",
};

// Utility: compute totals
export function computeTotals(items: LineItem[], taxRate: number) {
  const subtotal = items.reduce((sum, item) => {
    const lineTotal = item.qty * item.unitPrice * (1 - item.discount / 100);
    return sum + lineTotal;
  }, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;
  return { subtotal, taxAmount, total };
}

export function formatRM(value: number) {
  return `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
