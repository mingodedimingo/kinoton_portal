import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RequireAuth from "./components/RequireAuth";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MailPage from "./pages/MailPage";
import ApprovePage from "./pages/ApprovePage";
import BoardPage from "./pages/BoardPage";
import CalendarPage from "./pages/CalendarPage";
import OrgChartPage from "./pages/OrgChartPage";
import ReservePage from "./pages/ReservePage";
import WorkPage from "./pages/WorkPage";

// Admin pages
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAttendancePage from "./pages/admin/AdminAttendancePage";
import AdminNoticesPage from "./pages/admin/AdminNoticesPage";
import AdminHrPage from "./pages/admin/AdminHrPage";
import AdminCondolencesPage from "./pages/admin/AdminCondolencesPage";
import AdminBoardPage from "./pages/admin/AdminBoardPage";
import AdminEmployeesPage from "./pages/admin/AdminEmployeesPage";
import MyPage from "./pages/MyPage";
import NoticesPage from "./pages/NoticesPage";
import NoticeDetailPage from "./pages/NoticeDetailPage";
import HrPage from "./pages/HrPage";
import HrDetailPage from "./pages/HrDetailPage";
import CondolencesPage from "./pages/CondolencesPage";
import CondolenceDetailPage from "./pages/CondolenceDetailPage";
import BoardDetailPage from "./pages/BoardDetailPage";
import PrivacyPage from "./pages/PrivacyPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";

function Router() {
  return (
    <Switch>
      {/* 일반 페이지 — 로그인 필수 */}
      <Route path="/">
        <RequireAuth><Home /></RequireAuth>
      </Route>
      <Route path="/mail">
        <RequireAuth><MailPage /></RequireAuth>
      </Route>
      <Route path="/approve">
        <RequireAuth><ApprovePage /></RequireAuth>
      </Route>
      <Route path="/board">
        <RequireAuth><BoardPage /></RequireAuth>
      </Route>
      <Route path="/calendar">
        <RequireAuth><CalendarPage /></RequireAuth>
      </Route>
      <Route path="/orgchart">
        <RequireAuth><OrgChartPage /></RequireAuth>
      </Route>
      <Route path="/org">
        <RequireAuth><OrgChartPage /></RequireAuth>
      </Route>
      <Route path="/reserve">
        <RequireAuth><ReservePage /></RequireAuth>
      </Route>
      <Route path="/work">
        <RequireAuth><WorkPage /></RequireAuth>
      </Route>
      <Route path="/mypage">
        <RequireAuth><MyPage /></RequireAuth>
      </Route>
      <Route path="/notices">
        <RequireAuth><NoticesPage /></RequireAuth>
      </Route>
      <Route path="/notices/:id">
        <RequireAuth><NoticeDetailPage /></RequireAuth>
      </Route>
      <Route path="/hr">
        <RequireAuth><HrPage /></RequireAuth>
      </Route>
      <Route path="/hr/:id">
        <RequireAuth><HrDetailPage /></RequireAuth>
      </Route>
      <Route path="/condolences">
        <RequireAuth><CondolencesPage /></RequireAuth>
      </Route>
      <Route path="/condolences/:id">
        <RequireAuth><CondolenceDetailPage /></RequireAuth>
      </Route>
      <Route path="/board/:id">
        <RequireAuth><BoardDetailPage /></RequireAuth>
      </Route>
      <Route path="/settings">
        <RequireAuth><SettingsPage /></RequireAuth>
      </Route>

      {/* 공개 페이지 */}
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/login" component={LoginPage} />

      {/* 어드민 페이지 — AdminAuthGuard로 별도 보호 */}
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/attendance" component={AdminAttendancePage} />
      <Route path="/admin/notices" component={AdminNoticesPage} />
      <Route path="/admin/hr" component={AdminHrPage} />
      <Route path="/admin/condolences" component={AdminCondolencesPage} />
      <Route path="/admin/board" component={AdminBoardPage} />
      <Route path="/admin/employees" component={AdminEmployeesPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
