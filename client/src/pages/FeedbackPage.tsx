import { useState } from "react";
import { useFeedback, useCreateFeedback, useDeleteFeedback } from "@/hooks/use-feedback";
import { useRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

const feedbackFormSchema = z.object({
  type: z.enum(["kritik", "saran"], {
    errorMap: () => ({ message: "Pilih tipe feedback" }),
  }),
  content: z.string().min(1, "Isi feedback tidak boleh kosong").min(3, "Feedback minimal 3 karakter"),
});

type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;

export default function FeedbackPage() {
  const { data: feedbackList = [], isLoading } = useFeedback();
  const { isAdmin } = useRole();
  const { user } = useAuth();
  const createFeedback = useCreateFeedback();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      type: "saran",
      content: "",
    },
  });

  const onSubmit = async (data: FeedbackFormValues) => {
    setIsSubmitting(true);
    try {
      await createFeedback.mutateAsync({
        type: data.type,
        content: data.content,
      });
      form.reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sort feedback by newest first
  const sortedFeedback = feedbackList
    ? [...feedbackList].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    : [];

  // Filter feedback based on user role
  const visibleFeedback = isAdmin
    ? sortedFeedback
    : sortedFeedback.filter((fb) => fb.userId === user?.id);

  return (
    <div className="space-y-8 animate-enter">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <MessageSquare className="w-8 h-8 text-primary" />
          Kritik & Saran
        </h1>
        <p className="text-muted-foreground mt-2">Bagikan feedback dan saran Anda untuk tim.</p>
      </div>

      {/* Feedback Form */}
      <Card className="p-6 bg-card border border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">Tulis Kritik atau Saran</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipe Feedback</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full" data-testid="select-feedback-type">
                        <SelectValue placeholder="Pilih tipe feedback" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-border shadow-xl">
                        <SelectItem value="kritik" data-testid="option-kritik">
                          Kritik
                        </SelectItem>
                        <SelectItem value="saran" data-testid="option-saran">
                          Saran
                        </SelectItem>
                      </SelectContent>
                    </Select>
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
                  <FormLabel>Isi Feedback</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tulis kritik atau saran Anda..."
                      {...field}
                      className="min-h-[120px]"
                      data-testid="input-feedback-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || createFeedback.isPending}
                data-testid="button-submit-feedback"
              >
                {isSubmitting || createFeedback.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Kirim
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Feedback List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : visibleFeedback.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">
            {isAdmin ? "Belum ada feedback" : "Anda belum membuat feedback"}
          </h3>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Feedback dari tim akan muncul di sini."
              : "Mulai bagikan feedback Anda untuk tim."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleFeedback.map((feedback) => (
            <FeedbackCard
              key={feedback.id}
              feedback={feedback}
              canDelete={isAdmin || feedback.userId === user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  feedback,
  canDelete,
}: {
  feedback: {
    id: number;
    userId: string;
    userName: string | null;
    type: "kritik" | "saran";
    content: string;
    createdAt: string;
  };
  canDelete: boolean;
}) {
  const deleteId = feedback.id;
  const deleteTypeName = feedback.type === "kritik" ? "kritik" : "saran";

  return (
    <Card className="p-6 hover-elevate" data-testid={`card-feedback-${feedback.id}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1">
          <Badge
            variant={feedback.type === "kritik" ? "destructive" : "default"}
            className={feedback.type === "saran" ? "bg-blue-500 hover:bg-blue-600" : ""}
            data-testid={`badge-${feedback.type}-${feedback.id}`}
          >
            {feedback.type === "kritik" ? "Kritik" : "Saran"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            oleh {feedback.userName || "Pengguna"}
          </span>
        </div>
        {canDelete && (
          <DeleteFeedbackButton id={deleteId} type={deleteTypeName} />
        )}
      </div>

      <p className="text-foreground whitespace-pre-wrap break-words mb-4">{feedback.content}</p>

      <div className="text-sm text-muted-foreground border-t border-border/50 pt-3">
        {format(new Date(feedback.createdAt), "dd MMM yyyy HH:mm")}
      </div>
    </Card>
  );
}

function DeleteFeedbackButton({ id, type }: { id: number; type: string }) {
  const deleteFeedback = useDeleteFeedback();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          data-testid={`button-delete-feedback-${id}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Feedback?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus {type} ini? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive"
            onClick={() => deleteFeedback.mutate(id)}
            data-testid="button-confirm-delete-feedback"
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
