import { useProducts } from "@/hooks/use-products";
import { useSessions } from "@/hooks/use-sessions";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";
import { useAnnouncements } from "@/hooks/use-announcements";
import { Package, ClipboardList, AlertTriangle, ArrowRight, Megaphone } from "lucide-react";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { data: products } = useProducts();
  const { data: sessions } = useSessions();
  const { user } = useAuth();
  const { role } = useRole();
  const { data: announcements } = useAnnouncements();

  const activeSessions = sessions?.filter(s => s.status === 'in_progress') || [];
  const lowStockItems = products?.filter(p => p.currentStock < 10) || [];
  
  const now = new Date();
  const activeAnnouncements = announcements?.filter(a => !a.expiresAt || new Date(a.expiresAt) > now) || [];

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    sku_manager: "SKU Manager",
    stock_counter: "Stock Counter",
    stock_counter_toko: "Stock Counter Toko",
    stock_counter_gudang: "Stock Counter Gudang",
  };

  const stats = [
    {
      label: "Total Produk",
      value: products?.length || 0,
      icon: Package,
      color: "bg-blue-500",
      desc: "Item dalam inventori"
    },
    {
      label: "Sesi Aktif",
      value: activeSessions.length,
      icon: ClipboardList,
      color: "bg-purple-500",
      desc: "Opname sedang berlangsung"
    },
    {
      label: "Stok Rendah",
      value: lowStockItems.length,
      icon: AlertTriangle,
      color: "bg-orange-500",
      desc: "Item di bawah ambang batas"
    },
  ];

  return (
    <div className="space-y-8 animate-enter">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-dashboard-title">
          Welcome, {user?.firstName || "User"}
        </h1>
        <p className="text-muted-foreground mt-2">
          Overview of inventory health and ongoing audits.
          <Badge variant="secondary" className="ml-2">{roleLabel[role] || role}</Badge>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm" data-testid={`card-stat-${i}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className="text-4xl font-display font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-black/10`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/50 flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-lg">Active Opname Sessions</h3>
            <Link href="/sessions">
              <span className="text-sm text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer">
                View All <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="p-0">
            {activeSessions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No active sessions</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {activeSessions.map(session => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <div className="p-4 hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between gap-2 group">
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{session.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started {format(new Date(session.startedAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <StatusBadge status={session.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-border/50 flex items-center justify-between gap-2">
            <h3 className="font-display font-bold text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Low Stock Alerts
            </h3>
            <Link href="/products">
              <span className="text-sm text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer">
                Manage <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
          <div className="p-0">
            {lowStockItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>All stock levels healthy</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {lowStockItems.slice(0, 5).map(item => (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-foreground">{item.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </div>
                    <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-lg">
                      {item.currentStock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activeAnnouncements.length > 0 && (
        <div>
          <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-blue-500" />
            Pengumuman
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAnnouncements.map((announcement) => (
              <Card key={announcement.id} className="p-6 hover-elevate" data-testid={`card-announcement-${announcement.id}`}>
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground text-base">{announcement.title}</h4>
                  <p className="text-sm text-muted-foreground">{announcement.content}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(announcement.createdAt), 'dd MMM yyyy')}
                    </span>
                    {announcement.expiresAt && (
                      <span className="text-xs text-orange-600 font-medium">
                        Berlaku hingga {format(new Date(announcement.expiresAt), 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
