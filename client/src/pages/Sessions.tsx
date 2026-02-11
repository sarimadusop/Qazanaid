import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useRole } from "@/hooks/use-role";
import { Link } from "wouter";
import { Plus, ClipboardList, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { format } from "date-fns";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
});

export default function Sessions() {
  const { data: sessions, isLoading } = useSessions();
  const { canCount } = useRole();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Opname Sessions</h1>
          <p className="text-muted-foreground mt-2">Track and audit your stock counting sessions.</p>
        </div>
        {canCount && <CreateSessionDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />}
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : sessions?.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl p-16 text-center shadow-sm">
          <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Sessions Yet</h3>
          <p className="text-muted-foreground mt-1 mb-6">Start a new stock opname session to begin auditing.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Start Session</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions?.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <div className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <StatusBadge status={session.status} />
                </div>
                
                <h3 className="font-display font-bold text-lg mb-2">{session.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                  {session.notes || "No additional notes provided."}
                </p>

                <div className="pt-4 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Started {format(new Date(session.startedAt), 'MMMM d, yyyy')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createSession = useCreateSession();
  
  const form = useForm<z.infer<typeof sessionFormSchema>>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof sessionFormSchema>) => {
    createSession.mutate(data, {
      onSuccess: () => {
        onOpenChange(false);
        form.reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Opname Session</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g. Q4 Audit 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Any specific instructions..." {...field} value={field.value || ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={createSession.isPending}>
                {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Start Session
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
