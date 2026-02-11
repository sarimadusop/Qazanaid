import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import RoleManagement from "@/pages/RoleManagement";
import NotFound from "@/pages/not-found";
import { Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
      <div className="text-center space-y-6 p-8">
        <div className="mx-auto bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg shadow-primary/20 w-fit">
          <Package className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Stockify</h1>
          <p className="text-muted-foreground mt-2">Inventory Management & Stock Opname</p>
        </div>
        <a href="/api/login">
          <Button size="lg" data-testid="button-login">
            Sign in to Continue
          </Button>
        </a>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-muted/10 flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-8 mt-14 lg:mt-0 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/products" component={Products} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/sessions/:id" component={SessionDetail} />
            <Route path="/roles" component={RoleManagement} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
