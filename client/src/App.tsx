/*
 * SPAZEHAUS MANAGEMENT APP — MAIN ROUTER
 * Design: Dark premium mobile app with bottom navigation
 * Routes: Dashboard, Projects, Company, Calendar, Profile + sub-pages + Quotations
 *
 * Code-splitting policy: routes reachable from the bottom nav (Dashboard,
 * Projects, Company, CalendarPage, Profile) plus auth pages stay eagerly
 * imported — they're the most likely first-paint destinations and their
 * shared deps are already in the initial chunks. Everything else loads
 * via `React.lazy` so the user only pays for sub-pages they actually visit.
 *
 * In particular, KPIPerformance pulls in recharts (~75 KB gzip), and
 * QuotationDetail/CreateQuotation reach into the PDF stack via the
 * dynamic generatePDF import — those would otherwise be preloaded for
 * every visitor regardless of whether they ever open the page.
 */
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { queryClient } from "./lib/queryClient";
import BottomNav from "./components/BottomNav";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";

// Main tabs — eager (likely first paint, already in initial chunk graph)
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Company from "./pages/Company";
import CalendarPage from "./pages/CalendarPage";
import Profile from "./pages/Profile";

// Sub-pages — lazy (each gets its own chunk, only fetched on navigation)
const ProjectDetail    = lazy(() => import("./pages/ProjectDetail"));
const CreateProject    = lazy(() => import("./pages/CreateProject"));
const StaffDirectory   = lazy(() => import("./pages/StaffDirectory"));
const StaffProfile     = lazy(() => import("./pages/StaffProfile"));
const LeaveManagement  = lazy(() => import("./pages/LeaveManagement"));
const Recruitment      = lazy(() => import("./pages/Recruitment"));
const KPIPerformance   = lazy(() => import("./pages/KPIPerformance"));      // pulls in recharts
const Announcements    = lazy(() => import("./pages/Announcements"));
const AuditLog         = lazy(() => import("./pages/AuditLog"));
const QuotationList    = lazy(() => import("./pages/QuotationList"));
const QuotationDetail  = lazy(() => import("./pages/QuotationDetail"));     // root of the PDF lazy chain
const CreateQuotation  = lazy(() => import("./pages/CreateQuotation"));
const Checkpoints      = lazy(() => import("./pages/Checkpoints"));
const CustomerDatabase = lazy(() => import("./pages/CustomerDatabase"));
const CustomerDetail   = lazy(() => import("./pages/CustomerDetail"));
const RemindersPage    = lazy(() => import("./pages/Reminders"));
const PerformanceReport = lazy(() => import("./pages/PerformanceReport"));

// Pages that show bottom nav
const BOTTOM_NAV_PATHS = ["/", "/projects", "/company", "/calendar", "/profile"];

/** Minimal fallback rendered while a lazy route chunk is fetching. Sits inside
 *  the mobile-container frame so the BottomNav stays anchored and there's no
 *  layout shift when the page snaps in. */
function RouteFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.985 0.004 80)" }}
    >
      <Loader2 size={20} className="animate-spin" style={{ color: "oklch(0.62 0.09 68)" }} />
    </div>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const showNav = BOTTOM_NAV_PATHS.includes(location);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "oklch(0.93 0.008 75)" }}
    >
      <div className="w-full max-w-[430px] min-h-screen relative">
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/company/audit" component={AuditLog} />

            {/* Quotation & Invoice module — order matters: /new before /:id */}
            <Route path="/quotations" component={QuotationList} />
            <Route path="/quotations/new" component={CreateQuotation} />
            <Route path="/quotations/:id" component={QuotationDetail} />

            {/* Important Checkpoints — Payment Collection + Document Sign SOP */}
            <Route path="/checkpoints" component={Checkpoints} />

            {/* Customer Database — Inquiry → Awarded funnel + categories */}
            <Route path="/customers" component={CustomerDatabase} />
            <Route path="/customers/:id" component={CustomerDetail} />

            {/* Reminders — Daily site photo + Weekly cadence SOP */}
            <Route path="/reminders" component={RemindersPage} />

            {/* Performance Report — Sales/GP targets + project timeline */}
            <Route path="/performance" component={PerformanceReport} />

            {/* Fallback */}
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>

        {showNav && <BottomNav />}
      </div>
    </div>
  );
}

/**
 * AuthGate — splits the route tree:
 *   • /login + /auth/callback are public (anyone can reach them)
 *   • Everything else requires an authenticated staff session.
 *
 * Unauthenticated visitors hitting a protected URL are bounced to /login.
 * Authenticated visitors hitting /login are bounced to the dashboard.
 */
function AuthGate() {
  const [location, navigate] = useLocation();
  const { state } = useAuth();

  const isPublic = location === "/login" || location.startsWith("/auth/callback");

  // Redirect rules
  useEffect(() => {
    if (state.status === "loading") return;
    if (state.status === "unauthenticated" && !isPublic) {
      navigate("/login", { replace: true });
    }
    if (state.status === "authenticated" && location === "/login") {
      navigate("/", { replace: true });
    }
  }, [state.status, location, isPublic, navigate]);

  // While the session is resolving, show nothing (avoids a flash of /login)
  if (state.status === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "oklch(0.11 0.004 285)" }}
      />
    );
  }

  // Public routes
  if (isPublic) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/auth/callback" component={AuthCallback} />
      </Switch>
    );
  }

  // Unauthenticated + private path → we're mid-redirect; render nothing briefly
  if (state.status !== "authenticated") {
    return null;
  }

  return <AppLayout />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
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
              <AuthGate />
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
