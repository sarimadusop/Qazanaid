import { useState } from "react";
import { useAnnouncements, useCreateAnnouncement, useUpdateAnnouncement, useDeleteAnnouncement } from "@/hooks/use-announcements";
import { useRole } from "@/hooks/use-role";
import { Megaphone, Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAnnouncementSchema } from "@shared/schema";
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
import { format } from "date-fns";

const createFormSchema = insertAnnouncementSchema.omit({ userId: true }).extend({
  expiresAt: z.string().optional().nullable(),
});

export default function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();
  const { role } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const isAdmin = role === "admin";
  
  const sortedAnnouncements = announcements ? [...announcements].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  }) : [];

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-primary" />
            Pengumuman
          </h1>
          <p className="text-muted-foreground mt-2">Kelola pengumuman untuk tim.</p>
        </div>
        {isAdmin && (
          <CreateAnnouncementDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sortedAnnouncements.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">Belum ada pengumuman</h3>
          <p className="text-muted-foreground mt-1">Mulai membuat pengumuman untuk tim Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAnnouncements.map((announcement) =>
            editingId === announcement.id ? (
              <EditAnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onEdit={() => setEditingId(announcement.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function AnnouncementCard({ announcement, onEdit }: { announcement: any; onEdit: () => void }) {
  const isExpired = announcement.expiresAt && new Date(announcement.expiresAt) < new Date();

  return (
    <Card className="flex flex-col p-6 hover-elevate" data-testid={`card-announcement-${announcement.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-display font-bold text-lg text-foreground flex-1 break-words">{announcement.title}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={onEdit}
            data-testid={`button-edit-announcement-${announcement.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <DeleteAnnouncementButton id={announcement.id} title={announcement.title} />
        </div>
      </div>

      <p className="text-foreground whitespace-pre-wrap break-words mb-4 flex-1">{announcement.content}</p>

      <div className="space-y-2 pt-4 border-t border-border/50">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Dibuat: {format(new Date(announcement.createdAt), "dd MMM yyyy HH:mm")}</span>
        </div>
        {announcement.expiresAt && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className={`text-sm ${isExpired ? "text-destructive" : "text-muted-foreground"}`}>
              Berlaku sampai: {format(new Date(announcement.expiresAt), "dd MMM yyyy")}
            </span>
            {isExpired && (
              <Badge variant="destructive" className="text-xs ml-auto">
                Expired
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function EditAnnouncementCard({ announcement, onCancel, onSaved }: { announcement: any; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [expiresAt, setExpiresAt] = useState(announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().split('T')[0] : "");
  const updateAnnouncement = useUpdateAnnouncement();

  const handleSave = () => {
    updateAnnouncement.mutate(
      { id: announcement.id, title, content, expiresAt: expiresAt ? expiresAt : undefined },
      { onSuccess: onSaved }
    );
  };

  return (
    <Card className="flex flex-col p-6 bg-primary/5 border-primary/20" data-testid={`card-edit-announcement-${announcement.id}`}>
      <div className="space-y-4 flex-1">
        <div>
          <label className="text-sm font-medium text-foreground">Judul</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white mt-1"
            data-testid={`input-edit-title-${announcement.id}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Isi Pengumuman</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="bg-white mt-1 min-h-[120px]"
            data-testid={`input-edit-content-${announcement.id}`}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">Berlaku Sampai (Opsional)</label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="bg-white mt-1"
            data-testid={`input-edit-expires-${announcement.id}`}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-4 border-t border-border/50 justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          data-testid={`button-cancel-edit-${announcement.id}`}
        >
          Batal
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateAnnouncement.isPending}
          data-testid={`button-save-edit-${announcement.id}`}
        >
          {updateAnnouncement.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Simpan
        </Button>
      </div>
    </Card>
  );
}

function CreateAnnouncementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createAnnouncement = useCreateAnnouncement();

  const form = useForm<z.infer<typeof createFormSchema>>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: "",
      content: "",
      expiresAt: "",
    },
  });

  const onSubmit = (data: z.infer<typeof createFormSchema>) => {
    createAnnouncement.mutate(
      {
        title: data.title,
        content: data.content,
        expiresAt: data.expiresAt || undefined,
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
        <Button data-testid="button-create-announcement">
          <Plus className="w-4 h-4 mr-2" />
          Buat Pengumuman
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Buat Pengumuman Baru</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Judul</FormLabel>
                  <FormControl>
                    <Input placeholder="Judul pengumuman..." {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Isi Pengumuman</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Konten pengumuman..." {...field} value={field.value || ""} data-testid="input-content" className="min-h-[150px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Berlaku Sampai (Opsional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ""} data-testid="input-expires-at" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={createAnnouncement.isPending} data-testid="button-submit-announcement">
                {createAnnouncement.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Buat Pengumuman
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAnnouncementButton({ id, title }: { id: number; title: string }) {
  const deleteAnnouncement = useDeleteAnnouncement();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid={`button-delete-announcement-${id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Pengumuman?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus pengumuman <strong>{title}</strong>? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteAnnouncement.mutate(id)}
            data-testid="button-confirm-delete-announcement"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
