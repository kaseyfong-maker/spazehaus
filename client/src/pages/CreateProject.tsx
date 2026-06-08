/*
 * SPAZEHAUS CREATE PROJECT WIZARD
 * Multi-step form: Client Details → Project Details → Areas & Tasks → Review
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Check } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { useCreateProject } from "@/lib/queries";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Client Details", subtitle: "Who is this project for?" },
  { id: 2, title: "Project Details", subtitle: "What are we designing?" },
  { id: 3, title: "Areas & Tasks", subtitle: "Define scope of work" },
  { id: 4, title: "Review & Submit", subtitle: "Confirm everything" },
];

const projectTypes = ["Residential", "Commercial", "Community"];
const propertyTypes = {
  Residential: ["Condominium", "Apartment", "Landed", "Semi-D", "Bungalow"],
  Commercial: ["Office", "Retail", "F&B", "Hotel", "Clinic"],
  Community: ["Showroom", "Gallery", "Mixed-use", "Community Centre"],
};
const roomOptions = ["Living Room", "Master Bedroom", "Bedroom 2", "Bedroom 3", "Kitchen", "Dining Area", "Master Bathroom", "Bathroom 2", "Study Room", "Balcony", "Entrance/Foyer", "Utility Room", "Reception", "Meeting Room", "Open Office", "Pantry"];

export default function CreateProject() {
  const [, navigate] = useLocation();
  const createProject = useCreateProject();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    clientName: "", clientContact: "", clientEmail: "",
    projectName: "", projectType: "Residential", propertyType: "Condominium",
    location: "", size: "", budget: "", startDate: "", targetDate: "",
    selectedRooms: [] as string[],
    notes: "",
  });

  const update = (key: string, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }));

  const toggleRoom = (room: string) => {
    const rooms = form.selectedRooms.includes(room)
      ? form.selectedRooms.filter((r) => r !== room)
      : [...form.selectedRooms, room];
    update("selectedRooms", rooms);
  };

  const handleSubmit = async () => {
    // Required-field guard (mirrors the * markers in the wizard).
    const missing =
      !form.clientName.trim() ? "Client name" :
      !form.clientContact.trim() ? "Contact number" :
      !form.projectName.trim() ? "Project name" :
      !form.propertyType ? "Property type" :
      !form.location.trim() ? "Location" :
      form.selectedRooms.length === 0 ? "At least one area/room" :
      null;
    if (missing) {
      toast.error(`${missing} is required`);
      return;
    }
    try {
      const project = await createProject.mutateAsync({
        name: form.projectName.trim(),
        client: form.clientName.trim(),
        clientContact: form.clientContact.trim() || null,
        clientEmail: form.clientEmail.trim() || null,
        type: form.projectType,
        propertyType: form.propertyType,
        location: form.location.trim(),
        size: form.size ? Number(form.size) : 0,
        budget: form.budget ? Number(form.budget) : 0,
        startDate: form.startDate.trim() || null,
        targetDate: form.targetDate.trim() || null,
        areas: form.selectedRooms,
        description: form.notes.trim() || null,
      });
      toast.success("Project created successfully!", { description: `${project.name} (${project.id}) has been added.` });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      toast.error(`Could not create project: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const inputStyle = {
    background: "oklch(0.96 0.006 75)",
    border: "1px solid oklch(0.90 0.010 75)",
    color: "oklch(0.20 0.008 65)",
    borderRadius: "0.75rem",
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
  } as React.CSSProperties;

  const labelStyle = { color: "oklch(0.52 0.010 68)", fontSize: "0.75rem", marginBottom: "0.375rem", display: "block", fontFamily: "Raleway, sans-serif", letterSpacing: "0.04em" } as React.CSSProperties;

  return (
    <div className="mobile-container">
      <AppHeader title="New Project" subtitle="CREATE PROJECT" showBack compact />

      <div className="px-4 pb-32">
        {/* Step indicator */}
        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: step > s.id ? "oklch(0.72 0.09 68)" : step === s.id ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.96 0.006 75)",
                    border: step >= s.id ? "1px solid oklch(0.72 0.09 68)" : "1px solid oklch(0.90 0.010 75)",
                    color: step > s.id ? "oklch(1 0 0)" : step === s.id ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
                  }}
                >
                  {step > s.id ? <Check size={12} /> : s.id}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-8 h-0.5 mx-1" style={{ background: step > s.id ? "oklch(0.72 0.09 68)" : "oklch(0.90 0.010 75)" }} />
                )}
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-label" style={{ color: "oklch(0.52 0.09 68)", letterSpacing: "0.08em" }}>STEP {step} OF {steps.length}</p>
            <h2 className="font-display text-xl font-semibold text-neutral-900">{steps[step - 1].title}</h2>
            <p className="text-xs mt-0.5" style={{ color: "oklch(0.52 0.010 68)" }}>{steps[step - 1].subtitle}</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {step === 1 && (
              <>
                <div>
                  <label style={labelStyle}>CLIENT NAME *</label>
                  <input data-testid="cp-client-name" style={inputStyle} placeholder="e.g. Mr. & Mrs. Lim" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>CONTACT NUMBER *</label>
                  <input data-testid="cp-client-contact" style={inputStyle} placeholder="+60 12-345 6789" value={form.clientContact} onChange={(e) => update("clientContact", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>EMAIL ADDRESS</label>
                  <input style={inputStyle} placeholder="client@email.com" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label style={labelStyle}>PROJECT NAME *</label>
                  <input data-testid="cp-project-name" style={inputStyle} placeholder="e.g. The Paragon Residence" value={form.projectName} onChange={(e) => update("projectName", e.target.value)} />
                </div>
                <div>
                  <label style={labelStyle}>PROJECT TYPE *</label>
                  <div className="flex gap-2">
                    {projectTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => update("projectType", t)}
                        className="flex-1 py-2.5 rounded-xl text-xs font-label"
                        style={{
                          background: form.projectType === t ? "oklch(0.72 0.09 68)" : "oklch(0.96 0.006 75)",
                          color: form.projectType === t ? "oklch(1 0 0)" : "oklch(0.52 0.010 68)",
                          border: form.projectType === t ? "none" : "1px solid oklch(0.90 0.010 75)",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>PROPERTY TYPE *</label>
                  <div className="flex flex-wrap gap-2">
                    {(propertyTypes[form.projectType as keyof typeof propertyTypes] || []).map((t) => (
                      <button
                        key={t}
                        onClick={() => update("propertyType", t)}
                        className="px-3 py-1.5 rounded-full text-xs font-label"
                        style={{
                          background: form.propertyType === t ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.96 0.006 75)",
                          color: form.propertyType === t ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
                          border: form.propertyType === t ? "1px solid oklch(0.72 0.09 68 / 40%)" : "1px solid oklch(0.90 0.010 75)",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>LOCATION / ADDRESS *</label>
                  <input data-testid="cp-location" style={inputStyle} placeholder="e.g. Bukit Indah, Johor Bahru" value={form.location} onChange={(e) => update("location", e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>SIZE (SQFT)</label>
                    <input style={inputStyle} placeholder="1850" type="number" value={form.size} onChange={(e) => update("size", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>BUDGET (RM)</label>
                    <input style={inputStyle} placeholder="280000" type="number" value={form.budget} onChange={(e) => update("budget", e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label style={labelStyle}>START DATE</label>
                    <input style={inputStyle} placeholder="DD/MM/YYYY" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>TARGET DATE</label>
                    <input style={inputStyle} placeholder="DD/MM/YYYY" value={form.targetDate} onChange={(e) => update("targetDate", e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <label style={labelStyle}>SELECT AREAS / ROOMS *</label>
                  <div className="flex flex-wrap gap-2">
                    {roomOptions.map((room) => (
                      <button
                        key={room}
                        onClick={() => toggleRoom(room)}
                        className="px-3 py-1.5 rounded-full text-xs font-label"
                        style={{
                          background: form.selectedRooms.includes(room) ? "oklch(0.62 0.09 68 / 15%)" : "oklch(0.96 0.006 75)",
                          color: form.selectedRooms.includes(room) ? "oklch(0.42 0.09 68)" : "oklch(0.45 0.008 65)",
                          border: form.selectedRooms.includes(room) ? "1px solid oklch(0.72 0.09 68 / 40%)" : "1px solid oklch(0.90 0.010 75)",
                        }}
                      >
                        {form.selectedRooms.includes(room) ? "✓ " : ""}{room}
                      </button>
                    ))}
                  </div>
                  {form.selectedRooms.length > 0 && (
                    <p className="text-xs mt-2" style={{ color: "oklch(0.52 0.09 68)" }}>{form.selectedRooms.length} areas selected</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>ADDITIONAL NOTES</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: "100px", resize: "none" }}
                    placeholder="Special requirements, client preferences, style direction..."
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 4 && (
              <div className="space-y-3">
                {[
                  { title: "Client Details", fields: [{ label: "Client Name", value: form.clientName || "—" }, { label: "Contact", value: form.clientContact || "—" }, { label: "Email", value: form.clientEmail || "—" }] },
                  { title: "Project Details", fields: [{ label: "Project Name", value: form.projectName || "—" }, { label: "Type", value: `${form.projectType} · ${form.propertyType}` }, { label: "Location", value: form.location || "—" }, { label: "Size", value: form.size ? `${form.size} sqft` : "—" }, { label: "Budget", value: form.budget ? `RM ${Number(form.budget).toLocaleString()}` : "—" }] },
                  { title: "Areas & Scope", fields: [{ label: "Areas Selected", value: form.selectedRooms.length > 0 ? form.selectedRooms.join(", ") : "—" }] },
                ].map((section, si) => (
                  <div key={si} className="rounded-2xl p-4" style={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.90 0.010 75)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-display text-base font-semibold text-neutral-900">{section.title}</h4>
                      <button onClick={() => setStep(si + 1)} className="text-xs font-label" style={{ color: "oklch(0.52 0.09 68)" }}>Edit</button>
                    </div>
                    {section.fields.map((f) => (
                      <div key={f.label} className="flex items-start justify-between py-1.5" style={{ borderBottom: "1px solid oklch(0.93 0.008 75)" }}>
                        <span className="text-xs" style={{ color: "oklch(0.52 0.010 68)" }}>{f.label}</span>
                        <span className="text-xs font-medium text-right max-w-[55%]" style={{ color: "oklch(0.20 0.008 65)" }}>{f.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] px-4 py-4 flex gap-3 lg:static lg:translate-x-0 lg:max-w-none"
        style={{ background: "oklch(1 0 0)", borderTop: "1px solid oklch(0.90 0.010 75)", backdropFilter: "blur(16px)" }}
      >
        {step > 1 && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3.5 rounded-xl text-sm font-label"
            style={{ background: "oklch(0.96 0.006 75)", color: "oklch(0.35 0.008 65)", border: "1px solid oklch(0.90 0.010 75)", letterSpacing: "0.04em" }}
          >
            Back
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={step < 4 ? () => setStep((s) => s + 1) : handleSubmit}
          disabled={createProject.isPending}
          data-testid="cp-next"
          className="flex-1 py-3.5 rounded-xl text-sm font-label font-semibold"
          style={{ background: "linear-gradient(135deg, oklch(0.72 0.09 68), oklch(0.55 0.08 65))", color: "oklch(1 0 0)", letterSpacing: "0.04em", opacity: createProject.isPending ? 0.6 : 1 }}
        >
          {step < 4 ? "Continue" : createProject.isPending ? "Creating…" : "Create Project"}
        </motion.button>
      </div>
    </div>
  );
}
