import { useState } from "react";
import { useStaff, useCreateStaff, useUpdateStaff, useDeleteStaff } from "@/hooks/use-staff";
import { useRole } from "@/hooks/use-role";
import type { StaffMember } from "@shared/schema";
import { Plus, Trash2, Loader2, Users, Pencil, Save, X, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const locationTypeLabels: Record<string, string> = {
  toko: "Toko",
  gudang: "Gudang",
};

const locationTypeColors: Record<string, string> = {
  toko: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  gudang: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export default function StaffManagement() {
  const { data: staffMembers, isLoading } = useStaff();
  const { isAdmin, canManageSku } = useRole();
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const canManage = isAdmin || canManageSku;

  if (!canManage) {
    return (
      <div className="space-y-8 animate-enter">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Manajemen Staff</h1>
          <p className="text-muted-foreground mt-2">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </div>
    );
  }

  const filteredStaff = staffMembers?.filter((staff: StaffMember) => {
    const matchesLocation = locationFilter === "all" || staff.locationType === locationFilter;
    return matchesLocation;
  });

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            Manajemen Staff
          </h1>
          <p className="text-muted-foreground mt-2">Kelola staff yang melakukan stock opname (SO).</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-40 bg-white" data-testid="select-location-filter">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Semua Lokasi" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border">
              <SelectItem value="all">Semua Lokasi</SelectItem>
              <SelectItem value="toko">Toko</SelectItem>
              <SelectItem value="gudang">Gudang</SelectItem>
            </SelectContent>
          </Select>
          <CreateStaffDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredStaff?.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Tidak ada staff</h3>
            <p className="text-muted-foreground mt-1">Mulai dengan menambahkan staff baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border/50">
                  <th className="px-6 py-4 font-medium text-muted-foreground">Nama</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Lokasi</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground">Status</th>
                  <th className="px-6 py-4 font-medium text-muted-foreground text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredStaff?.map((staff: StaffMember) => (
                  editingId === staff.id ? (
                    <EditStaffRow
                      key={staff.id}
                      staff={staff}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => setEditingId(null)}
                    />
                  ) : (
                    <tr key={staff.id} className="hover:bg-muted/20 transition-colors group" data-testid={`row-staff-${staff.id}`}>
                      <td className="px-6 py-4 font-medium text-foreground">{staff.name}</td>
                      <td className="px-6 py-4">
                        {staff.locationType && (
                          <Badge className={locationTypeColors[staff.locationType] || ""} data-testid={`badge-location-${staff.id}`}>
                            {locationTypeLabels[staff.locationType] || staff.locationType}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={staff.active ? "default" : "secondary"} data-testid={`badge-status-${staff.id}`}>
                          {staff.active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground"
                            onClick={() => setEditingId(staff.id)}
                            data-testid={`button-edit-staff-${staff.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <DeleteStaffButton id={staff.id} name={staff.name} />
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function EditStaffRow({ staff, onCancel, onSaved }: { staff: StaffMember; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(staff.name);
  const [locationType, setLocationType] = useState(staff.locationType || "toko");
  const updateStaff = useUpdateStaff();

  const handleSave = () => {
    updateStaff.mutate(
      { id: staff.id, name, locationType },
      { onSuccess: onSaved }
    );
  };

  return (
    <tr className="bg-primary/5" data-testid={`row-edit-staff-${staff.id}`}>
      <td className="px-6 py-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-white"
          data-testid={`input-edit-name-${staff.id}`}
        />
      </td>
      <td className="px-6 py-3">
        <Select value={locationType} onValueChange={(value) => setLocationType(value as "toko" | "gudang")}>
          <SelectTrigger className="w-32 bg-white" data-testid={`select-edit-location-${staff.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border">
            <SelectItem value="toko">Toko</SelectItem>
            <SelectItem value="gudang">Gudang</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-6 py-3">
        <Badge variant="default">Aktif</Badge>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSave}
            disabled={updateStaff.isPending}
            data-testid={`button-save-edit-${staff.id}`}
          >
            {updateStaff.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-green-600" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            data-testid={`button-cancel-edit-${staff.id}`}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CreateStaffDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createStaff = useCreateStaff();
  const [name, setName] = useState("");
  const [locationType, setLocationType] = useState("toko");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createStaff.mutate(
      { name, locationType },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName("");
          setLocationType("toko");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-staff">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Tambah Staff Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nama</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama staff"
              required
              data-testid="input-staff-name"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Lokasi</label>
            <Select value={locationType} onValueChange={setLocationType}>
              <SelectTrigger data-testid="select-staff-location">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border">
                <SelectItem value="toko">Toko</SelectItem>
                <SelectItem value="gudang">Gudang</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={createStaff.isPending} data-testid="button-submit-staff">
              {createStaff.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tambah Staff
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteStaffButton({ id, name }: { id: number; name: string }) {
  const deleteStaff = useDeleteStaff();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid={`button-delete-staff-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Staff?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus <strong>{name}</strong>? Aksi ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteStaff.mutate(id)}
            data-testid="button-confirm-delete"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
