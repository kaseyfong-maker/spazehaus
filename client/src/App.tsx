/*
 * SPAZEHAUS MANAGEMENT APP — MAIN ROUTER
 * Design: Dark premium mobile app with bottom navigation
 * Routes: Dashboard, Projects, Company, Calendar, Profile + sub-pages + Quotations
 */
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import BottomNav from "./components/BottomNav";

// Main tabs
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Company from "./pages/Company";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";

// Project sub-pages
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";

// Company sub-pages
import StaffDirectory from "./pages/StaffDirectory";
import StaffProfile from "./pages/StaffProfile";
import LeaveManagement from "./pages/LeaveManagement";
import Recruitment from "./pages/Recruitment";
import KPIPerformance from "./pages/KPIPerformance";
import Announcements from "./pages/Announcements";

// Quotation & Invoice module
import QuotationList from "./pages/QuotationList";
import QuotationDetail from "./pages/QuotationDetail";
import CreateQuotation from "./pages/CreateQuotation";

// Checkpoints (Phase 2 — cross-project Payment + Document Sign SOP)
import Checkpoints from "./pages/Checkpoints";

// Customer Database (Phase 3 — Inquiry vs Awarded funnel + categories)
import CustomerDatabase from "./pages/CustomerDatabase";
import CustomerDetail from "./pages/CustomerDetail";

// Pages that show bottom nav
const BOTTOM_NAV_PATHS = ["/", "/projects", "/company", "/calendar", "/profile"];

function AppLayout() {
  const [location] = useLocation();
  const showNav = BOTTOM_NAV_PATHS.includes(location);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.93 0.008 75)" }}
    >
      <div className="w-full max-w-[430px] min-h-screen relative">
        <Switch>
          {/* Main tabs */}
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={Projects} />
          <Route path="/company" component={Company} />
          <Route path="/calendar" component={CalendarPage} />
          <Route path="/profile" component={Profile} />

          {/* Project sub-pages */}
          <Route path="/projects/new" component={CreateProject} />
          <Route path="/projects/:id" component={ProjectDetail} />

          {/* Company sub-pages */}
          <Route path="/company/staff" component={StaffDirectory} />
          <Route path="/company/staff/new">
            {() => { window.history.back(); return null; }}
          </Route>
          <Route path="/company/staff/:id" component={StaffProfile} />
          <Route path="/company/leave" component={LeaveManagement} />
          <Route path="/company/recruitment" component={Recruitment} />
          <Route path="/company/kpi" component={KPIPerformance} />
          <Route path="/company/announcements" component={Announcements} />

          {/* Quotation & Invoice module — order matters: /new before /:id */}
          <Route path="/quotations" component={QuotationList} />
          <Route path="/quotations/new" component={CreateQuotation} />
          <Route path="/quotations/:id" component={QuotationDetail} />

          {/* Important Checkpoints — Payment Collection + Document Sign SOP */}
          <Route path="/checkpoints" component={Checkpoints} />

          {/* Customer Database — Inquiry → Awarded funnel + categories */}
          <Route path="/customers" component={CustomerDatabase} />
          <Route path="/customers/:id" component={CustomerDetail} />

          {/* Fallback */}
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>

        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "oklch(1 0 0)",
                border: "1px solid oklch(0.90 0.010 75)",
                color: "oklch(0.14 0.008 65)",
                fontFamily: "DM Sans, sans-serif",
                boxShadow: "0 4px 24px oklch(0 0 0 / 0.08)",
              },
            }}
          />
          <AppLayout />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
