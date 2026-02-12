import { useState } from "react";
import {
  useMotivation,
  useCreateMotivation,
  useUpdateMotivation,
  useDeleteMotivation,
} from "@/hooks/use-motivation";
import { useRole } from "@/hooks/use-role";
import { Heart, Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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

const createFormSchema = z.object({
  message: z.string().min(1, "Pesan tidak boleh kosong"),
});

export default function MotivationPage() {
  const { data: motivations, isLoading } = useMotivation();
  const { role } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const isAdmin = role === "admin";

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Heart className="w-8 h-8 text-primary" />
            Pesan Motivasi
          </h1>
          <p className="text-muted-foreground mt-2">Kelola pesan yang akan muncul saat memulai Stock Opname.</p>
        </div>
        {isAdmin && (
          <CreateMotivationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : motivations?.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Belum ada pesan motivasi</h3>
          <p className="text-muted-foreground mt-1">Mulai membuat pesan motivasi untuk tim Anda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {motivations?.map((motivation: MotivationMessage) =>
            editingId === motivation.id ? (
              <EditMotivationCard
                key={motivation.id}
                motivation={motivation}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <MotivationCard
                key={motivation.id}
                motivation={motivation}
                onEdit={() => setEditingId(motivation.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

interface MotivationMessage {
  id: number;
  message: string;
  userId: string;
  active: number;
}

function MotivationCard({ motivation, onEdit }: { motivation: MotivationMessage; onEdit: () => void }) {
  const updateMotivation = useUpdateMotivation();
  const isActive = motivation.active === 1;

  const handleToggleActive = (newActive: boolean) => {
    updateMotivation.mutate({
      id: motivation.id,
      active: newActive ? 1 : 0,
    });
  };

  return (
    <Card className="flex flex-col p-6 hover-elevate" data-testid={`card-motivation-${motivation.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-foreground whitespace-pre-wrap break-words">{motivation.message}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={isActive ? "default" : "secondary"} data-testid={`badge-active-${motivation.id}`}>
            {isActive ? "Aktif" : "Nonaktif"}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={onEdit}
            data-testid={`button-edit-motivation-${motivation.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <DeleteMotivationButton id={motivation.id} message={motivation.message} />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-4 border-t border-border/50 mt-4">
        <span className="text-sm text-muted-foreground">Pesan ini akan muncul saat memulai Stock Opname</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{isActive ? "Aktif" : "Nonaktif"}</span>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggleActive}
            disabled={updateMotivation.isPending}
            data-testid={`switch-active-${motivation.id}`}
          />
        </div>
      </div>
    </Card>
  );
}

function EditMotivationCard({ motivation, onCancel, onSaved }: { motivation: MotivationMessage; onCancel: () => void; onSaved: () => void }) {
  const [message, setMessage] = useState(motivation.message);
  const [active, setActive] = useState(motivation.active === 1);
  const updateMotivation = useUpdateMotivation();

  const handleSave = () => {
    if (!message.trim()) return;
    updateMotivation.mutate(
      {
        id: motivation.id,
        message: message.trim(),
        active: active ? 1 : 0,
      },
      { onSuccess: onSaved }
    );
  };

  return (
    <Card className="flex flex-col p-6 bg-primary/5 border-primary/20" data-testid={`card-edit-motivation-${motivation.id}`}>
      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-medium text-foreground">Pesan Motivasi</label>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="bg-white mt-1"
            placeholder="Masukkan pesan motivasi..."
            data-testid={`input-edit-message-${motivation.id}`}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-foreground">Status</label>
          <Switch
            checked={active}
            onCheckedChange={setActive}
            data-testid={`input-edit-active-${motivation.id}`}
          />
          <span className="text-sm text-muted-foreground">{active ? "Aktif" : "Nonaktif"}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-border/50 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          data-testid={`button-cancel-edit-${motivation.id}`}
        >
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMotivation.isPending || !message.trim()}
          data-testid={`button-save-edit-${motivation.id}`}
        >
          {updateMotivation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </Card>
  );
}

function CreateMotivationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createMotivation = useCreateMotivation();

  const form = useForm<z.infer<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = (data: z.infer<typeof createFormSchema>) => {
    createMotivation.mutate(
      {
        message: data.message.trim(),
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-motivation">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Pesan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tambah Pesan Motivasi Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pesan Motivasi</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Jangan Lupa Tersenyum, ya! Semangat kamu pasti bisa!"
                      {...field}
                      data-testid="input-message"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createMotivation.isPending} data-testid="button-submit-motivation">
                {createMotivation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tambah Pesan
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMotivationButton({ id, message }: { id: number; message: string }) {
  const deleteMotivation = useDeleteMotivation();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid={`button-delete-motivation-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Pesan Motivasi?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus pesan "{message}"? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteMotivation.mutate(id)}
            data-testid="button-confirm-delete-motivation"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
