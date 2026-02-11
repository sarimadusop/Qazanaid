import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { Shield, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";

type UserWithRole = {
  id: number;
  userId: string;
  role: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.roles.list.path] });
      toast({ title: "Role Updated", description: "User role has been changed." });
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

  return (
    <div className="space-y-8 animate-enter">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          User Roles
        </h1>
        <p className="text-muted-foreground mt-2">Manage user access levels and permissions.</p>
      </div>

      <div className="bg-white border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50">
                <th className="px-6 py-4 font-medium text-muted-foreground">User</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Email</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Current Role</th>
                <th className="px-6 py-4 font-medium text-muted-foreground">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users?.map((user) => {
                const initials = `${(user.firstName || "")[0] || ""}${(user.lastName || "")[0] || ""}`.toUpperCase() || "U";
                return (
                  <tr key={user.userId} className="hover:bg-muted/20 transition-colors" data-testid={`row-user-${user.userId}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-400 to-purple-400 text-white text-xs font-bold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                          {user.firstName} {user.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{user.email || "-"}</td>
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
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="sku_manager">SKU Manager</SelectItem>
                          <SelectItem value="stock_counter">Stock Counter</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-muted/30 border border-border/50 rounded-xl p-6 space-y-3">
        <h3 className="font-semibold text-foreground">Role Descriptions</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Admin</strong> - Full access: manage products, sessions, and user roles</p>
          <p><strong className="text-foreground">SKU Manager</strong> - Can create, edit, and delete products/SKUs. Cannot manage sessions or roles</p>
          <p><strong className="text-foreground">Stock Counter</strong> - Can create and fill in stock opname sessions. Cannot manage products or roles</p>
        </div>
      </div>
    </div>
  );
}
