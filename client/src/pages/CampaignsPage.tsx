import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Play, Pause, PhoneCall, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  listCampaigns,
  createCampaign,
  updateCampaignStatus,
  deleteCampaign,
} from "@/services/campaigns";
import type { Campaign } from "@/services/campaigns";
import { listSessions } from "@/services/sessions";
import { listFlows } from "@/services/flows";
import type { SessionInfo } from "@/types/session";
import type { Flow } from "@/types/flow";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [modalData, setModalData] = useState({
    name: "",
    sessionId: "",
    flowId: "",
    delaySec: 30,
    phones: "",
  });

  const loadData = async () => {
    try {
      const [c, s, f] = await Promise.all([
        listCampaigns(),
        listSessions(),
        listFlows(),
      ]);
      setCampaigns(c);
      setSessions(s);
      setFlows(f);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar campanhas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Poll for progress
    return () => clearInterval(interval);
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData.name || !modalData.sessionId || !modalData.flowId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    const lines = modalData.phones.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      toast.error("Insira pelo menos um telefone");
      return;
    }
    
    try {
      await createCampaign({
        name: modalData.name,
        sessionId: modalData.sessionId,
        flowId: modalData.flowId,
        delaySec: modalData.delaySec,
        phones: lines,
      });
      toast.success("Campanha criada com sucesso!");
      setIsModalOpen(false);
      setModalData({ name: "", sessionId: "", flowId: "", delaySec: 30, phones: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar campanha");
    }
  };

  const toggleStatus = async (c: Campaign) => {
    const nextStatus = c.status === "running" ? "paused" : "running";
    try {
      await updateCampaignStatus(c.id, nextStatus);
      toast.success(`Campanha ${nextStatus === "running" ? "iniciada" : "pausada"}`);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCampaign(id);
      toast.success("Campanha removida");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover campanha");
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Discador Automático</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Campanha
        </Button>
      </div>
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <PhoneCall className="h-12 w-12 opacity-50" />
            <div>
              <p className="text-lg font-medium text-foreground">
                Nenhuma campanha criada
              </p>
              <p className="text-sm">
                Dispare ligações automáticas para os seus contatos.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between space-y-4 rounded-xl border bg-card p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{c.name}</h3>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.status === "running"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : c.status === "completed"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                      }`}
                    >
                      {c.status === "running"
                        ? "Rodando"
                        : c.status === "completed"
                        ? "Concluído"
                        : "Pausada"}
                    </span>
                  </div>
                  
                  {c.progress && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progresso</span>
                        <span>
                          {c.progress.answered + c.progress.failed} / {c.progress.total}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full bg-primary"
                          style={{
                            width: `${
                              c.progress.total > 0
                                ? ((c.progress.answered + c.progress.failed) / c.progress.total) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Atendidas</span>
                          <span className="font-medium text-green-600 dark:text-green-400">{c.progress.answered}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Falhas/Não Atendidas</span>
                          <span className="font-medium text-red-600 dark:text-red-400">{c.progress.failed}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(c)}
                    disabled={c.status === "completed"}
                  >
                    {c.status === "running" ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Retomar
                      </>
                    )}
                  </Button>
                  <ConfirmDialog
                    title="Remover campanha?"
                    description="Todo o histórico de discagem desta campanha será perdido."
                    onConfirm={() => handleDelete(c.id)}
                  >
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ConfirmDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Campanha de Voz</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Campanha</Label>
              <Input
                required
                placeholder="Ex: Oferta Black Friday"
                value={modalData.name}
                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Conexão (WhatsApp que vai ligar)</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={modalData.sessionId}
                onChange={(e) => setModalData({ ...modalData, sessionId: e.target.value })}
              >
                <option value="">Selecione uma conexão...</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.phone || s.id})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Fluxo (Quando atender)</Label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={modalData.flowId}
                onChange={(e) => setModalData({ ...modalData, flowId: e.target.value })}
              >
                <option value="">Selecione um fluxo...</option>
                {flows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Delay entre Ligações (segundos)</Label>
              <Input
                type="number"
                min="5"
                required
                value={modalData.delaySec}
                onChange={(e) => setModalData({ ...modalData, delaySec: parseInt(e.target.value) || 30 })}
              />
              <p className="text-xs text-muted-foreground">Tempo de pausa entre uma ligação e outra para evitar bloqueios.</p>
            </div>
            <div className="space-y-2">
              <Label>Contatos (Um por linha)</Label>
              <textarea
                required
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="Ex: 5511999999999\n5511888888888"
                value={modalData.phones}
                onChange={(e) => setModalData({ ...modalData, phones: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Campanha</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
