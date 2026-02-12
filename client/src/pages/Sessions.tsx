import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useRole } from "@/hooks/use-role";
import { useStaff } from "@/hooks/use-staff";
import { useMotivation } from "@/hooks/use-motivation";
import type { StaffMember, MotivationMessage } from "@shared/schema";
import { Link } from "wouter";
import { Plus, ClipboardList, Calendar, Loader2, Store, Warehouse, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const sessionFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  notes: z.string().optional(),
});

function getDefaultTab(role: string, canCountToko: boolean, canCountGudang: boolean): string {
  if (role === "stock_counter_toko") return "toko";
  if (role === "stock_counter_gudang") return "gudang";
  return "semua";
}

export default function Sessions() {
  const { canCount, canCountToko, canCountGudang, canCountLocation, role } = useRole();
  const defaultTab = getDefaultTab(role, canCountToko, canCountGudang);
  const [locationType, setLocationType] = useState<string>(defaultTab);
  const queryLocationType = locationType === "semua" ? undefined : locationType;
  const { data: sessions, isLoading } = useSessions(queryLocationType);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const showAllTabs = role === "admin" || role === "sku_manager" || role === "stock_counter";

  return (
    <div className="space-y-8 animate-enter">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Opname Sessions</h1>
          <p className="text-muted-foreground mt-2">Track and audit your stock counting sessions.</p>
        </div>
        {canCount && (
          <CreateSessionDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            currentLocationType={locationType === "semua" ? "toko" : locationType}
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <Tabs value={locationType} onValueChange={setLocationType} data-testid="tabs-session-location-type">
          <TabsList>
            {showAllTabs && (
              <TabsTrigger value="semua" data-testid="tab-session-semua">
                <Package className="w-4 h-4 mr-1.5" />
                Semua
              </TabsTrigger>
            )}
            {canCountToko && (
              <TabsTrigger value="toko" data-testid="tab-session-toko">
                <Store className="w-4 h-4 mr-1.5" />
                Toko
              </TabsTrigger>
            )}
            {canCountGudang && (
              <TabsTrigger value="gudang" data-testid="tab-session-gudang">
                <Warehouse className="w-4 h-4 mr-1.5" />
                Gudang
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
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
          {canCount && <Button onClick={() => setIsCreateOpen(true)} data-testid="button-start-session-empty">Start Session</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions?.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <div
                className="bg-card p-6 rounded-2xl border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group flex flex-col h-full"
                data-testid={`card-session-${session.id}`}
              >
                <div className="flex items-start justify-between mb-4 gap-2">
                  <div className="p-3 bg-primary/5 rounded-xl group-hover:bg-primary/10 transition-colors">
                    <ClipboardList className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={session.locationType === "gudang" ? "secondary" : "outline"}
                      data-testid={`badge-location-${session.id}`}
                    >
                      {session.locationType === "gudang" ? (
                        <Warehouse className="w-3 h-3 mr-1" />
                      ) : (
                        <Store className="w-3 h-3 mr-1" />
                      )}
                      {session.locationType === "gudang" ? "Gudang" : "Toko"}
                    </Badge>
                    <StatusBadge status={session.status} />
                  </div>
                </div>
                
                <h3 className="font-display font-bold text-lg mb-2">{session.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2 flex-1">
                  {session.notes || "No additional notes provided."}
                </p>

                {session.assignedTo && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4" data-testid={`text-petugas-${session.id}`}>
                    <User className="w-3.5 h-3.5" />
                    <span>Petugas: {session.assignedTo}</span>
                  </div>
                )}

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

function CreateSessionDialog({
  open,
  onOpenChange,
  currentLocationType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocationType: string;
}) {
  const createSession = useCreateSession();
  const { data: staffList } = useStaff();
  const { data: motivationList } = useMotivation();
  const { canCountToko, canCountGudang, role } = useRole();

  const [step, setStep] = useState<"staff" | "details">("staff");
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<string>(currentLocationType);

  const activeMotivation = useMemo(() => {
    const active = (motivationList || []).filter((m: MotivationMessage) => m.active === 1);
    if (active.length === 0) return null;
    return active[Math.floor(Math.random() * active.length)];
  }, [motivationList, open]);

  const filteredStaff = useMemo(() => {
    if (!staffList) return [];
    return (staffList as StaffMember[]).filter(
      (s) => s.active === 1 && s.locationType === selectedLocation
    );
  }, [staffList, selectedLocation]);

  const showLocationSelect = role === "admin" || role === "sku_manager" || role === "stock_counter";

  const form = useForm<z.infer<typeof sessionFormSchema>>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: "",
      notes: "",
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setStep("staff");
      setSelectedStaff("");
      setSelectedLocation(currentLocationType);
      form.reset();
    }
    onOpenChange(newOpen);
  };

  const handleStaffContinue = () => {
    if (selectedStaff) {
      setStep("details");
    }
  };

  const onSubmit = (data: z.infer<typeof sessionFormSchema>) => {
    const staffName = filteredStaff.find((s) => String(s.id) === selectedStaff)?.name || "";
    createSession.mutate(
      {
        ...data,
        locationType: selectedLocation,
        startedByName: staffName,
        assignedTo: staffName,
      },
      {
        onSuccess: () => {
          handleOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-session">
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        {step === "staff" ? (
          <>
            <DialogHeader>
              <DialogTitle data-testid="dialog-title-staff">Siapa yang Stock Opname hari ini?</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              {activeMotivation && (
                <div
                  className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center"
                  data-testid="text-motivation-message"
                >
                  <p className="text-sm text-foreground italic">
                    "{activeMotivation.message}"
                  </p>
                </div>
              )}

              {showLocationSelect && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Lokasi</label>
                  <Select
                    value={selectedLocation}
                    onValueChange={(val) => {
                      setSelectedLocation(val);
                      setSelectedStaff("");
                    }}
                    data-testid="select-location"
                  >
                    <SelectTrigger data-testid="select-location-trigger">
                      <SelectValue placeholder="Pilih lokasi" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border border-border">
                      <SelectItem value="toko" data-testid="select-location-toko">
                        <div className="flex items-center gap-2">
                          <Store className="w-4 h-4" />
                          Toko
                        </div>
                      </SelectItem>
                      <SelectItem value="gudang" data-testid="select-location-gudang">
                        <div className="flex items-center gap-2">
                          <Warehouse className="w-4 h-4" />
                          Gudang
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Petugas</label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff} data-testid="select-staff">
                  <SelectTrigger data-testid="select-staff-trigger">
                    <SelectValue placeholder="Pilih petugas..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border">
                    {filteredStaff.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        Tidak ada petugas untuk lokasi ini
                      </div>
                    ) : (
                      filteredStaff.map((staff) => (
                        <SelectItem
                          key={staff.id}
                          value={String(staff.id)}
                          data-testid={`select-staff-${staff.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {staff.name}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  data-testid="button-cancel-staff"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  disabled={!selectedStaff}
                  onClick={handleStaffContinue}
                  data-testid="button-continue-staff"
                >
                  Lanjutkan
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Start New Opname Session</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>Petugas: <span className="font-medium text-foreground">{filteredStaff.find((s) => String(s.id) === selectedStaff)?.name}</span></span>
                  <Badge variant={selectedLocation === "gudang" ? "secondary" : "outline"}>
                    {selectedLocation === "gudang" ? "Gudang" : "Toko"}
                  </Badge>
                </div>

                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Title</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g. Q4 Audit 2024" {...field} data-testid="input-session-title" />
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
                        <Textarea placeholder="Any specific instructions..." {...field} value={field.value || ""} data-testid="input-session-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setStep("staff")} data-testid="button-back-details">
                    Kembali
                  </Button>
                  <Button type="submit" disabled={createSession.isPending} data-testid="button-submit-session">
                    {createSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Start Session
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
