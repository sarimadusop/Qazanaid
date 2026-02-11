import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2, Plus, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLocation } from "wouter";

type UserWithRole = {
  id: number;
  userId: string;
  role: string;
  username?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  adminId?: string | null;
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  sku_manager: "SKU Manager",
  stock_counter: "Stock Counter",
};

const roleBadgeColors: Record<string, string> = {
  admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  sku_manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  stock_counter: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export default function RoleManagement() {
  const { isAdmin, isLoading: roleLoading } = useRole();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: users, isLoading } = useQuery<UserWithRole[]>({
    queryKey: [api.roles.list.path],
    queryFn: async () => {
      const res = await fetch(api.roles.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: isAdmin,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(api.roles.set.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roles.list.path] });
      toast({ title: "Role Diperbarui", description: "Role user berhasil diubah." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (roleLoading || isLoading) {
    return (
      <div className="p-12 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    setLocation("/");
    return null;
  }

  const subUsers = users?.filter(u => u.adminId !== null) || [];
  const adminUser = users?.find(u => u.adminId === null);

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            User Roles
          </h1>
          <p className="text-muted-foreground mt-2">Kelola user dan akses tim Anda.</p>
        </div>
        <CreateUserDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="px-6 py-4 font-medium text-muted-foreground">User</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Tipe</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Role Saat Ini</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Ubah Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {adminUser && (
                <tr className="bg-muted/10" data-testid={`row-user-${adminUser.userId}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white text-xs font-bold">
                          {getInitials(adminUser)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-foreground block">
                          {adminUser.firstName && adminUser.lastName ? `${adminUser.firstName} ${adminUser.lastName}` : adminUser.username || "-"}
                        </span>
                        {adminUser.username && (
                          <span className="text-xs text-muted-foreground">@{adminUser.username}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="secondary">Owner</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={roleBadgeColors[adminUser.role] || ""} data-testid={`badge-role-${adminUser.userId}`}>
                      {roleLabels[adminUser.role] || adminUser.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">-</td>
                </tr>
              )}
              {subUsers.map((user) => (
                <tr key={user.userId} className="hover:bg-muted/20 transition-colors" data-testid={`row-user-${user.userId}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-gradient-to-br from-teal-400 to-cyan-400 text-white text-xs font-bold">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <span className="font-medium text-foreground block">
                          {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username || "-"}
                        </span>
                        {user.username && (
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="outline">Anggota</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={roleBadgeColors[user.role] || ""} data-testid={`badge-role-${user.userId}`}>
                      {roleLabels[user.role] || user.role}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <Select
                      value={user.role}
                      onValueChange={(value) => updateRole.mutate({ userId: user.userId, role: value })}
                    >
                      <SelectTrigger className="w-40" data-testid={`select-role-${user.userId}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sku_manager">SKU Manager</SelectItem>
                        <SelectItem value="stock_counter">Stock Counter</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {subUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Belum ada anggota tim. Klik "Tambah User" untuk membuat user baru.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-muted/30 border border-border/50 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-foreground">Keterangan Role</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Admin (Owner)</strong> - Akses penuh: kelola produk, sesi, dan user tim</p>
          <p><strong className="text-foreground">SKU Manager</strong> - Bisa membuat, edit, dan hapus produk/SKU. Tidak bisa kelola sesi atau role</p>
          <p><strong className="text-foreground">Stock Counter</strong> - Bisa membuat dan mengisi sesi stock opname. Tidak bisa kelola produk atau role</p>
        </div>
      </div>
    </div>
  );
}

function getInitials(user: UserWithRole): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.username || "U").substring(0, 2).toUpperCase();
}

function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("stock_counter");
  const [error, setError] = useState("");

  const createUser = useMutation({
    mutationFn: async (data: { username: string; password: string; firstName: string; lastName: string; role: string }) => {
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal membuat user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roles.list.path] });
      toast({ title: "User Dibuat", description: "User baru berhasil ditambahkan ke tim." });
      onOpenChange(false);
      setUsername("");
      setPassword("");
      setFirstName("");
      setLastName("");
      setRole("stock_counter");
      setError("");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createUser.mutate({ username, password, firstName, lastName, role });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-user">
          <Plus className="w-4 h-4 mr-2" />
          Tambah User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Tambah User Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm" data-testid="text-create-user-error">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Depan</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Nama depan"
                data-testid="input-new-first-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Belakang</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nama belakang"
                data-testid="input-new-last-name"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              required
              data-testid="input-new-username"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              data-testid="input-new-password"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger data-testid="select-new-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sku_manager">SKU Manager</SelectItem>
                <SelectItem value="stock_counter">Stock Counter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={createUser.isPending} data-testid="button-submit-new-user">
              {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Buat User
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
