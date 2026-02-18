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
import { Loader2, Package, AlertCircle, Info, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
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

            {mode === "login" && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowForgotInfo(true)}
                  data-testid="button-forgot-password"
                >
                  Lupa Password?
                </button>
              </div>
            )}

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

      <Dialog open={showForgotInfo} onOpenChange={setShowForgotInfo}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Lupa Password?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Hubungi <strong className="text-foreground">Admin</strong> tim Anda untuk mereset password.</p>
                <p>Admin dapat mereset password Anda melalui halaman <strong className="text-foreground">User Roles</strong>.</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Jika Anda adalah admin dan lupa password, silakan hubungi administrator sistem.
            </p>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowForgotInfo(false)} data-testid="button-close-forgot">
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
            <div className="w-full rounded-md overflow-hidden relative max-h-[300px]">
              <img
                src={current.imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
              />
              <img
                src={current.imageUrl}
                alt={current.title}
                className="relative w-full max-h-[300px] object-contain z-10"
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
