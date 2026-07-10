import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Users2 } from "lucide-react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listQueues,
  createQueue,
  updateQueue,
  deleteQueue,
} from "@/services/queues";
import type { Queue } from "@/types/queue";

const DEFAULT_COLORS = [
  "#57adf8", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4", "#eab308",
];

type Editing = { 
  queue: Queue | null; 
  name: string; 
  color: string; 
  greeting: string;
  integrationType: string;
  typebotUrl: string;
  typebotSlug: string;
  typebotExpires: number;
  typebotKeywordRestart: string;
  typebotRestartMessage: string;
  n8nUrl: string;
};

const emptyEditing = (): Editing => ({
  queue: null,
  name: "",
  color: DEFAULT_COLORS[0],
  greeting: "",
  integrationType: "",
  typebotUrl: "",
  typebotSlug: "",
  typebotExpires: 0,
  typebotKeywordRestart: "",
  typebotRestartMessage: "",
  n8nUrl: "",
});

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState<Editing | null>(null);
  const [toDelete, setToDelete] = useState<Queue | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await listQueues();
      setQueues(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar filas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSave = async () => {
    if (!modal || !modal.name.trim()) return;
    setSaving(true);
    try {
      if (modal.queue) {
        await updateQueue(modal.queue.id, modal.name.trim(), modal.color, {
          greeting: modal.greeting,
          integrationType: modal.integrationType,
          typebotUrl: modal.typebotUrl,
          typebotSlug: modal.typebotSlug,
          typebotExpires: modal.typebotExpires,
          typebotKeywordRestart: modal.typebotKeywordRestart,
          typebotRestartMessage: modal.typebotRestartMessage,
          n8nUrl: modal.n8nUrl,
        });
        toast.success("Fila atualizada");
      } else {
        const q = await createQueue(modal.name.trim(), modal.color);
        await updateQueue(q.id, modal.name.trim(), modal.color, { 
          greeting: modal.greeting,
          integrationType: modal.integrationType,
          typebotUrl: modal.typebotUrl,
          typebotSlug: modal.typebotSlug,
          typebotExpires: modal.typebotExpires,
          typebotKeywordRestart: modal.typebotKeywordRestart,
          typebotRestartMessage: modal.typebotRestartMessage,
          n8nUrl: modal.n8nUrl,
        });
        toast.success("Fila criada");
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (q: Queue) => {
    try {
      await deleteQueue(q.id);
      toast.success("Fila removida");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao remover");
    }
  };

  return (
    <AppShell>
      <div className="space-y-5 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Users2 className="h-5 w-5 text-primary" /> Filas
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize atendimentos em filas e vincule a conexões e usuários.
            </p>
          </div>
          <Button onClick={() => setModal(emptyEditing())}>
            <Plus className="h-4 w-4" /> Nova fila
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : queues.length === 0 ? (
          <div className="grid place-items-center rounded-xl border border-dashed bg-card/40 p-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-medium">Nenhuma fila criada</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Crie sua primeira fila para começar a organizar atendimentos.
            </div>
            <Button className="mt-4" onClick={() => setModal(emptyEditing())}>
              <Plus className="h-4 w-4" /> Nova fila
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {queues.map((q) => (
              <div key={q.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-8 w-8 shrink-0 rounded-lg"
                      style={{ backgroundColor: q.color }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{q.name}</p>
                    </div>

                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setModal({
                          queue: q,
                          name: q.name,
                          color: q.color,
                          greeting: q.greeting ?? "",
                          integrationType: q.integrationType ?? "",
                          typebotUrl: q.typebotUrl ?? "",
                          typebotSlug: q.typebotSlug ?? "",
                          typebotExpires: q.typebotExpires ?? 0,
                          typebotKeywordRestart: q.typebotKeywordRestart ?? "",
                          typebotRestartMessage: q.typebotRestartMessage ?? "",
                          n8nUrl: q.n8nUrl ?? "",
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => setToDelete(q)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

            ))}
          </div>
        )}
      </div>

      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modal?.queue ? "Editar fila" : "Nova fila"}</DialogTitle>
          </DialogHeader>
          {modal && (
            <Tabs defaultValue="geral" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="geral">Geral</TabsTrigger>
                <TabsTrigger value="integracao">Integração</TabsTrigger>
              </TabsList>

              <TabsContent value="geral" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome da Fila</Label>
                  <Input
                    value={modal.name}
                    onChange={(e) => setModal({ ...modal, name: e.target.value })}
                    placeholder="Ex: Vendas, Suporte..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem de Saudação</Label>
                  <Textarea
                    value={modal.greeting}
                    onChange={(e) => setModal({ ...modal, greeting: e.target.value })}
                    placeholder="Opcional. Mensagem enviada quando cai na fila."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {DEFAULT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setModal({ ...modal, color: c })}
                        className={`h-8 w-8 rounded-md border-2 transition ${
                          modal.color === c ? "border-foreground" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                    <Input
                      type="color"
                      value={modal.color}
                      onChange={(e) => setModal({ ...modal, color: e.target.value })}
                      className="h-8 w-14 cursor-pointer p-1"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="integracao" className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Integração</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={modal.integrationType}
                    onChange={(e) => setModal({ ...modal, integrationType: e.target.value })}
                  >
                    <option value="">Nenhuma</option>
                    <option value="typebot">Typebot</option>
                    <option value="n8n">n8n</option>
                  </select>
                </div>

                {modal.integrationType === "typebot" && (
                  <>
                    <div className="space-y-2">
                      <Label>URL do Typebot</Label>
                      <Input
                        value={modal.typebotUrl}
                        onChange={(e) => setModal({ ...modal, typebotUrl: e.target.value })}
                        placeholder="Ex: https://bot.site.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome do Fluxo (Slug)</Label>
                      <Input
                        value={modal.typebotSlug}
                        onChange={(e) => setModal({ ...modal, typebotSlug: e.target.value })}
                        placeholder="Ex: atendimento-vendas"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Palavra-chave Reiniciar</Label>
                        <Input
                          value={modal.typebotKeywordRestart}
                          onChange={(e) => setModal({ ...modal, typebotKeywordRestart: e.target.value })}
                          placeholder="Ex: #reiniciar"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expira em (minutos)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={modal.typebotExpires}
                          onChange={(e) => setModal({ ...modal, typebotExpires: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Mensagem de Reinício</Label>
                      <Textarea
                        value={modal.typebotRestartMessage}
                        onChange={(e) => setModal({ ...modal, typebotRestartMessage: e.target.value })}
                        placeholder="Enviada quando reinicia o bot"
                      />
                    </div>
                  </>
                )}

                {modal.integrationType === "n8n" && (
                  <div className="space-y-2">
                    <Label>Webhook URL (n8n)</Label>
                    <Input
                      value={modal.n8nUrl}
                      onChange={(e) => setModal({ ...modal, n8nUrl: e.target.value })}
                      placeholder="Ex: https://n8n.site.com/webhook/1234"
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving || !modal?.name.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover fila?"
        description={toDelete ? `A fila "${toDelete.name}" será removida.` : undefined}
        confirmLabel="Remover"
        destructive
        onConfirm={() => {
          if (toDelete) void onDelete(toDelete);
        }}
      />
    </AppShell>
  );
}
