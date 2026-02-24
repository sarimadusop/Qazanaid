import { Link, useLocation } from "wouter";
import { Package, ClipboardList, LayoutDashboard, Menu, X, Box, Shield, LogOut, UserCog, Users, Megaphone, MessageSquare, Heart } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { role, isAdmin, isSKUManager } = useRole();

  const isStockCounterOnly = role === "stock_counter" || role === "stock_counter_toko" || role === "stock_counter_gudang";

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    ...(!isStockCounterOnly ? [{ name: "Products / SKU", href: "/products", icon: Box }] : []),
    { name: "Opname Sessions", href: "/sessions", icon: ClipboardList },
    ...(isAdmin ? [{ name: "User Roles", href: "/roles", icon: Shield }] : []),
    ...(isAdmin || isSKUManager ? [{ name: "Staff SO", href: "/staff", icon: Users }] : []),
    ...(isAdmin ? [{ name: "Pengumuman", href: "/announcements", icon: Megaphone }] : []),
    { name: "Kritik & Saran", href: "/feedback", icon: MessageSquare },
    ...(isAdmin ? [{ name: "Motivasi", href: "/motivation", icon: Heart }] : []),
    { name: "Edit Profil", href: "/profile", icon: UserCog },
  ];

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.username || "User";

  const initials = user
    ? (user.firstName && user.lastName
      ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
      : (user.username || "U").substring(0, 2).toUpperCase())
    : "U";

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    sku_manager: "SKU Manager",
    stock_counter: "Stock Counter",
    stock_counter_toko: "Stock Toko",
    stock_counter_gudang: "Stock Gudang",
  };

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg shadow-md shadow-primary/20">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-foreground tracking-tight">Kazana</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 text-muted-foreground" data-testid="button-mobile-menu">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-border/50 shadow-xl shadow-black/5 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="hidden lg:flex items-center gap-3 px-8 py-8">
            <div className="bg-primary p-2.5 rounded-xl shadow-lg shadow-primary/30">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-none text-foreground tracking-tight">Kazana</h1>
              <p className="text-xs text-muted-foreground mt-1.5 font-medium">Professional Inventory</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1 mt-14 lg:mt-0">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "bg-primary/5 text-primary font-semibold shadow-sm ring-1 ring-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <span className="text-[13px] tracking-wide">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border/50 space-y-3">
            <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-semibold truncate" data-testid="text-username">
                  {displayName}
                </p>
                <Badge variant="secondary" className="text-xs mt-0.5" data-testid="text-role">
                  {roleLabel[role] || role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
