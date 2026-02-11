import { useState } from "react";
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
import { Loader2, Package, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

function LoginPage() {
  const { login, register, loginError, registerError, isLoggingIn, isRegistering } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      await login({ username, password });
    } else {
      await register({ username, password, firstName, lastName });
    }
  };

  const error = mode === "login" ? loginError : registerError;
  const isPending = mode === "login" ? isLoggingIn : isRegistering;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto bg-gradient-to-br from-primary to-accent p-4 rounded-2xl shadow-lg shadow-primary/20 w-fit">
            <Package className="w-10 h-10 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-display">Stockify</CardTitle>
            <CardDescription className="mt-1">
              {mode === "login" ? "Masuk ke akun Anda" : "Daftar akun baru"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-auth-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error.message}
              </div>
            )}

            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Depan</label>
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Belakang</label>
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    data-testid="input-last-name"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                autoComplete="username"
                required
                data-testid="input-username"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                data-testid="input-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-auth">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === "login" ? "Masuk" : "Daftar"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <span>
                  Belum punya akun?{" "}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={() => { setMode("register"); setUsername(""); setPassword(""); }}
                    data-testid="button-switch-register"
                  >
                    Daftar di sini
                  </button>
                </span>
              ) : (
                <span>
                  Sudah punya akun?{" "}
                  <button
                    type="button"
                    className="text-primary font-medium hover:underline"
                    onClick={() => { setMode("login"); setUsername(""); setPassword(""); }}
                    data-testid="button-switch-login"
                  >
                    Masuk di sini
                  </button>
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
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
