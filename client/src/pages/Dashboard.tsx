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
  const activeAnnouncements = announcements?.filter((a: any) => !a.expiresAt || new Date(a.expiresAt) > now) || [];

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
      {activeAnnouncements.length > 0 && (
        <div className="space-y-4" data-testid="section-announcements">
          {activeAnnouncements.map((announcement: any) => (
            <Card key={announcement.id} className="overflow-visible" data-testid={`card-announcement-${announcement.id}`}>
              {announcement.imageUrl ? (
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-2/5 w-full relative overflow-hidden rounded-t-md md:rounded-l-md md:rounded-tr-none min-h-[200px] max-h-[300px]">
                    <img
                      src={announcement.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-60"
                    />
                    <img
                      src={announcement.imageUrl}
                      alt={announcement.title}
                      className="relative w-full h-full object-contain z-10"
                      data-testid={`img-announcement-${announcement.id}`}
                    />
                  </div>
                  <div className="md:w-3/5 w-full p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2">
                      <Megaphone className="w-5 h-5 text-primary shrink-0" />
                      <Badge variant="secondary">Pengumuman</Badge>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3" data-testid={`text-announcement-title-${announcement.id}`}>
                      {announcement.title}
                    </h2>
                    <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed mb-4" data-testid={`text-announcement-content-${announcement.id}`}>
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{format(new Date(announcement.createdAt), 'dd MMM yyyy')}</span>
                      {announcement.expiresAt && (
                        <span className="text-orange-600 font-medium">
                          Berlaku hingga {format(new Date(announcement.expiresAt), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 md:p-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Megaphone className="w-6 h-6 text-primary" />
                    <Badge variant="secondary">Pengumuman</Badge>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-3" data-testid={`text-announcement-title-${announcement.id}`}>
                    {announcement.title}
                  </h2>
                  <p className="text-foreground/80 whitespace-pre-wrap leading-relaxed max-w-2xl mx-auto mb-4" data-testid={`text-announcement-content-${announcement.id}`}>
                    {announcement.content}
                  </p>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span>{format(new Date(announcement.createdAt), 'dd MMM yyyy')}</span>
                    {announcement.expiresAt && (
                      <span className="text-orange-600 font-medium">
                        Berlaku hingga {format(new Date(announcement.expiresAt), 'dd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-dashboard-title">
          Welcome, {user?.firstName || "User"}
        </h1>
        <div className="text-muted-foreground mt-2 flex items-center flex-wrap gap-2">
          <span>Overview of inventory health and ongoing audits.</span>
          <Badge variant="secondary">{roleLabel[role] || role}</Badge>
        </div>
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
    </div>
  );
}
