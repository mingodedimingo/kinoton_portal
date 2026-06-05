import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MailPage from "./pages/MailPage";
import ApprovePage from "./pages/ApprovePage";
import BoardPage from "./pages/BoardPage";
import CalendarPage from "./pages/CalendarPage";
import OrgChartPage from "./pages/OrgChartPage";
import ReservePage from "./pages/ReservePage";
import WorkPage from "./pages/WorkPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/mail" component={MailPage} />
      <Route path="/approve" component={ApprovePage} />
      <Route path="/board" component={BoardPage} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/orgchart" component={OrgChartPage} />
      <Route path="/reserve" component={ReservePage} />
      <Route path="/work" component={WorkPage} />
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
