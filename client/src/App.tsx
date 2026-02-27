import { useState, useEffect, useCallback } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useAnnouncements } from "@/hooks/use-announcements";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import RoleManagement from "@/pages/RoleManagement";
import Profile from "@/pages/Profile";
import StaffManagement from "@/pages/StaffManagement";
import Announcements from "@/pages/Announcements";
import FeedbackPage from "@/pages/FeedbackPage";
import MotivationPage from "@/pages/MotivationPage";
import NotFound from "@/pages/not-found";
import { BackgroundUploadProvider } from "@/components/BackgroundUpload";
import { Loader2, Package, AlertCircle, Info, Megaphone, ChevronLeft, ChevronRight, Shield, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Announcement } from "@shared/schema";

function LoginPage() {
  const { login, register, loginError, registerError, isLoggingIn, isRegistering } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showForgotInfo, setShowForgotInfo] = useState(false);

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
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#001D4D] overflow-hidden">
      {/* Left Side: Branding & Trust */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#003B95] to-[#001D4D] relative">
        <div className="z-10 flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md">
            <Package className="w-8 h-8 text-white" />
          </div>
          <span className="text-3xl font-display font-bold text-white tracking-tight">Kazana</span>
        </div>

        <div className="z-10 space-y-4">
          <div className="flex gap-4 opacity-50">
            <div className="flex flex-col items-center border border-white/40 p-2 rounded-lg grayscale invert">
              <Shield className="w-8 h-8 mb-1" />
              <span className="text-[8px] font-bold">ISO 9001</span>
            </div>
            <div className="flex flex-col items-center border border-white/40 p-2 rounded-lg grayscale invert">
              <Lock className="w-8 h-8 mb-1" />
              <span className="text-[8px] font-bold">ISO 27001</span>
            </div>
          </div>
        </div>

        {/* Ambient background decoration */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Right Side: Login Form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-[#001D4D] to-[#003B95] relative">
        <div className="w-full max-w-md z-10 animate-enter">
          <div className="bg-[#002D70]/40 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 lg:p-10 shadow-2xl">
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                {mode === "login" ? "Secure Client Login" : "Create Account"}
              </h2>
              <p className="text-blue-200/60 font-medium">Please enter your credentials to proceed</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm" data-testid="text-auth-error">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error.message}
                </div>
              )}

              {mode === "register" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-wider ml-1">First Name</label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="bg-[#001D4D]/50 border-white/10 text-white h-12 focus:ring-blue-500/50"
                      data-testid="input-first-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-200/80 uppercase tracking-wider ml-1">Last Name</label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="bg-[#001D4D]/50 border-white/10 text-white h-12 focus:ring-blue-500/50"
                      data-testid="input-last-name"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-200/80 uppercase tracking-wider ml-1">Username</label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="bg-[#001D4D]/50 border-white/10 text-white h-12 focus:ring-blue-500/50 placeholder:text-white/20"
                  autoComplete="username"
                  required
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-blue-200/80 uppercase tracking-wider">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      className="text-xs font-medium text-blue-300 hover:text-white transition-colors"
                      onClick={() => setShowForgotInfo(true)}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-[#001D4D]/50 border-white/10 text-white h-12 focus:ring-blue-500/50 placeholder:text-white/20"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  data-testid="input-password"
                />
              </div>

              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-white/20 bg-[#001D4D] text-blue-600 focus:ring-blue-500/50 ring-offset-[#001D4D]"
                />
                <label htmlFor="remember" className="text-sm text-blue-200/60 font-medium cursor-pointer">Remember Me</label>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-900/40 transition-all active:scale-95"
                disabled={isPending}
                data-testid="button-submit-auth"
              >
                {isPending && <Loader2 className="w-5 h-5 mr-3 animate-spin" />}
                {mode === "login" ? "Login" : "Sign Up"}
              </Button>

              <div className="text-center pt-4">
                <p className="text-sm text-blue-200/60 font-medium">
                  {mode === "login" ? (
                    <>
                      Not a member yet?{" "}
                      <button
                        type="button"
                        className="text-white hover:underline font-bold"
                        onClick={() => { setMode("register"); setUsername(""); setPassword(""); }}
                        data-testid="button-switch-register"
                      >
                        Create a New Account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        className="text-white hover:underline font-bold"
                        onClick={() => { setMode("login"); setUsername(""); setPassword(""); }}
                        data-testid="button-switch-login"
                      >
                        Login Here
                      </button>
                    </>
                  )}
                </p>
              </div>
            </form>
          </div>

          <div className="mt-8 text-center lg:hidden">
            <div className="flex items-center justify-center gap-3">
              <Package className="w-6 h-6 text-white/40" />
              <span className="text-xl font-display font-bold text-white/40">Kazana</span>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showForgotInfo} onOpenChange={setShowForgotInfo}>
        <DialogContent className="sm:max-w-[400px] bg-[#002D70] text-white border-white/20">
          <DialogHeader>
            <DialogTitle>Lupa Password?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
              <Info className="w-5 h-5 text-blue-300 shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-blue-200/80">
                <p>Hubungi <strong className="text-white font-bold">Admin</strong> tim Anda untuk mereset password.</p>
                <p>Admin dapat mereset password Anda melalui halaman <strong className="text-white font-bold">User Roles</strong>.</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10" onClick={() => setShowForgotInfo(false)} data-testid="button-close-forgot">
                Tutup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnnouncementPopup() {
  const { data: announcements } = useAnnouncements();
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeAnnouncements, setActiveAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    if (!announcements || announcements.length === 0) return;

    const now = new Date();
    const active = (announcements as Announcement[]).filter((a) => {
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;
      return true;
    });

    if (active.length === 0) return;

    const dismissedRaw = localStorage.getItem("dismissed_announcements");
    const dismissed: Record<string, string> = dismissedRaw ? JSON.parse(dismissedRaw) : {};

    const unread = active.filter((a) => {
      const dismissedAt = dismissed[String(a.id)];
      if (!dismissedAt) return true;
      return new Date(a.createdAt) > new Date(dismissedAt);
    });

    if (unread.length > 0) {
      setActiveAnnouncements(unread);
      setCurrentIndex(0);
      setOpen(true);
    }
  }, [announcements]);

  const dismissAll = useCallback(() => {
    const dismissedRaw = localStorage.getItem("dismissed_announcements");
    const dismissed: Record<string, string> = dismissedRaw ? JSON.parse(dismissedRaw) : {};
    const now = new Date().toISOString();
    activeAnnouncements.forEach((a) => {
      dismissed[String(a.id)] = now;
    });
    localStorage.setItem("dismissed_announcements", JSON.stringify(dismissed));
    setOpen(false);
  }, [activeAnnouncements]);

  if (activeAnnouncements.length === 0) return null;

  const current = activeAnnouncements[currentIndex];
  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismissAll(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg">{current.title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(current.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            {activeAnnouncements.length > 1 && (
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate shrink-0" data-testid="badge-announcement-count">
                {currentIndex + 1}/{activeAnnouncements.length}
              </Badge>
            )}
          </div>
        </DialogHeader>
        <div className="py-3 space-y-3">
          {current.imageUrl && (
            <div className="w-full rounded-md overflow-hidden relative aspect-square">
              <img
                src={current.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
              />
              <img
                src={current.imageUrl}
                alt={current.title}
                className="relative w-full h-full object-contain z-10"
                data-testid="img-announcement-popup"
              />
            </div>
          )}
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed" data-testid="text-announcement-content">
            {current.content}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            {activeAnnouncements.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  data-testid="button-prev-announcement"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentIndex((i) => Math.min(activeAnnouncements.length - 1, i + 1))}
                  disabled={currentIndex === activeAnnouncements.length - 1}
                  data-testid="button-next-announcement"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
          <Button onClick={dismissAll} data-testid="button-dismiss-announcements">
            Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col lg:flex-row">
      <Sidebar />
      <main className="flex-1 p-4 lg:p-10 mt-14 lg:mt-0 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/products" component={Products} />
            <Route path="/sessions" component={Sessions} />
            <Route path="/sessions/:id" component={SessionDetail} />
            <Route path="/roles" component={RoleManagement} />
            <Route path="/profile" component={Profile} />
            <Route path="/staff" component={StaffManagement} />
            <Route path="/announcements" component={Announcements} />
            <Route path="/feedback" component={FeedbackPage} />
            <Route path="/motivation" component={MotivationPage} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
      <AnnouncementPopup />
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
        <BackgroundUploadProvider>
          <Toaster />
          <Router />
        </BackgroundUploadProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
