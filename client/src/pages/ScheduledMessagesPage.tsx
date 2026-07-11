import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  listScheduledMessages,
  createScheduledMessage,
  deleteScheduledMessage,
} from "@/services/scheduledMessages";
import type { ScheduledMessage } from "@/services/scheduledMessages";
import { listSessions } from "@/services/sessions";
import type { SessionInfo } from "@/types/session";

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalData, setModalData] = useState({
    sessionId: "",
    phone: "",
    message: "",
    sendAt: "",
  });

  const loadData = async () => {
    try {
      const [msgs, sess] = await Promise.all([
        listScheduledMessages(),
        listSessions(),
      ]);
      setMessages(msgs || []);
      setSessions(sess || []);
    } catch (e) {
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData.sessionId || !modalData.phone || !modalData.message || !modalData.sendAt) {
      toast.error("Preencha todos os campos.");
      return;
    }
    
    try {
      // O input datetime-local já vem no formato YYYY-MM-DDThh:mm
      // Precisamos converter para UTC (RFC3339) pro backend.
      const dateObj = new Date(modalData.sendAt);
      if (isNaN(dateObj.getTime()) || dateObj.getTime() < Date.now()) {
        toast.error("A data e hora devem ser no futuro.");
        return;
      }
      
      await createScheduledMessage({
        session_id: modalData.sessionId,
        phone: modalData.phone,
        message: modalData.message,
        send_at: dateObj.toISOString(),
      });
      toast.success("Mensagem agendada!");
      setIsModalOpen(false);
      setModalData({ sessionId: "", phone: "", message: "", sendAt: "" });
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.error || "Erro ao agendar.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduledMessage(id);
      toast.success("Agendamento removido.");
      setMessages(messages.filter((m) => m.id !== id));
    } catch (e) {
      toast.error("Erro ao remover agendamento.");
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <CalendarClock className="h-6 w-6 text-primary" />
            Mensagens Agendadas
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programe mensagens para serem enviadas automaticamente no futuro.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Agendamento
        </Button>
      </div>

      <div className="mx-auto w-full max-w-6xl">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Clock className="h-8 w-8 animate-pulse text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <CalendarClock className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">Nenhum agendamento</h3>
            <p className="text-sm text-muted-foreground">
              Você ainda não tem nenhuma mensagem agendada.
            </p>
            <Button className="mt-4" onClick={() => setIsModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar Agendamento
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {messages.map((m) => {
              const sessionName = sessions.find((s) => s.id === m.session_id)?.name || "Conexão Apagada";
              const dateStr = new Date(m.send_at).toLocaleString();
              
              return (
                <div
                  key={m.id}
                  className="relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5 text-card-foreground shadow-sm transition-all hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {sessionName}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          m.status === "pending"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : m.status === "sent"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}
                      >
                        {m.status === "pending" ? "Aguardando" : m.status === "sent" ? "Enviado" : "Falhou"}
                      </span>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm font-semibold">📞 {m.phone}</p>
                      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                        {m.message}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between border-t pt-4">
                    <div className="text-xs font-medium text-foreground">
                      ⏰ {dateStr}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => setDeletingId(m.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {m.status === "failed" && m.error && (
                    <div className="mt-2 text-[10px] text-red-500 line-clamp-2 bg-red-50 dark:bg-red-950/20 p-1.5 rounded">
                      Erro: {m.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Mensagem</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Conexão (Por onde enviar)</Label>
              <Select
                value={modalData.sessionId}
                onValueChange={(v) => setModalData({ ...modalData, sessionId: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Número do Cliente (Com DDI e DDD)</Label>
              <Input
                required
                placeholder="Ex: 5511999999999"
                value={modalData.phone}
                onChange={(e) => setModalData({ ...modalData, phone: e.target.value.replace(/\D/g, '') })}
              />
              <p className="text-[10px] text-muted-foreground">Somente números, ex: 55 11 99999-9999</p>
            </div>
            
            <div className="space-y-2">
              <Label>Data e Hora do Envio</Label>
              <Input
                type="datetime-local"
                required
                value={modalData.sendAt}
                onChange={(e) => setModalData({ ...modalData, sendAt: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                required
                placeholder="Digite a mensagem..."
                rows={4}
                value={modalData.message}
                onChange={(e) => setModalData({ ...modalData, message: e.target.value })}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Agendar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title="Remover Agendamento?"
        description="Esta mensagem não será enviada caso você apague."
        destructive
        onConfirm={() => {
          if (deletingId) {
            handleDelete(deletingId);
            setDeletingId(null);
          }
        }}
      />
    </AppShell>
  );
}
