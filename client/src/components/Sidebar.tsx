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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-2 px-4 py-3 bg-[#0044CC] border-b border-white/10 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-md">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-white tracking-tight">Kazana</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 text-white/80" data-testid="button-mobile-menu">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-[#0055EE] to-[#0033BB] text-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:shadow-none border-r border-white/5",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full relative overflow-hidden">
          {/* Decorative ambient light */}
          <div className="absolute -top-20 -left-20 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="hidden lg:flex items-center gap-3 px-8 py-10 z-10">
            <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner border border-white/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl leading-none text-white tracking-tight">Kazana</h1>
              <p className="text-[10px] text-blue-200 mt-1.5 font-bold uppercase tracking-widest opacity-70">Inventory Pro</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-1.5 mt-14 lg:mt-0 z-10">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "bg-white/20 text-white font-bold shadow-lg shadow-black/10 backdrop-blur-md border border-white/20"
                        : "text-blue-100/70 hover:text-white hover:bg-white/10"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className={cn(
                      "w-5 h-5 transition-transform duration-200",
                      isActive ? "text-white scale-110" : "text-blue-200/50 group-hover:text-white"
                    )} />
                    <span className="text-[13px] tracking-wide">{item.name}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 space-y-3 z-10">
            <div className="bg-black/20 rounded-2xl p-3 flex items-center gap-3 border border-white/5">
              <Avatar className="ring-2 ring-white/10">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold truncate text-white" data-testid="text-username">
                  {displayName}
                </p>
                <Badge variant="outline" className="text-[10px] mt-0.5 border-white/20 text-blue-100 bg-white/5" data-testid="text-role">
                  {roleLabel[role] || role}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-blue-100/60 hover:text-white hover:bg-white/10 rounded-xl"
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
