import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const updateProfile = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Gagal memperbarui profil");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profil Diperbarui", description: "Data profil berhasil disimpan." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({ firstName, lastName, username });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Password baru dan konfirmasi tidak cocok", variant: "destructive" });
      return;
    }
    updateProfile.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="space-y-8 animate-enter max-w-2xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <User className="w-8 h-8 text-primary" />
          Edit Profil
        </h1>
        <p className="text-muted-foreground mt-2">Ubah informasi profil, username, dan password Anda.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informasi Profil</CardTitle>
          <CardDescription>Ubah nama dan username Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Depan</label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Nama depan"
                  data-testid="input-profile-first-name"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Belakang</label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nama belakang"
                  data-testid="input-profile-last-name"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username"
                data-testid="input-profile-username"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending} data-testid="button-save-profile">
                {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan Profil
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ganti Password</CardTitle>
          <CardDescription>Pastikan password baru minimal 6 karakter</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password Lama</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Masukkan password lama"
                required
                data-testid="input-current-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Password Baru</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                required
                data-testid="input-new-password"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Konfirmasi Password Baru</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                required
                data-testid="input-confirm-password"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateProfile.isPending} data-testid="button-change-password">
                {updateProfile.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ganti Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
