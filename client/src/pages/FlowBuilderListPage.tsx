import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Plus,
  Search,
  Trash2,
  Copy,
  Play,
  Pause,
  Pencil,
  MoreVertical,
  Workflow,
  Loader2,
  Upload,
  Download,
  ChevronRight,
  Zap,
  GitBranch,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import {
  listFlows,
  createFlow,
  updateFlow,
  deleteFlow,
  duplicateFlow,
} from "@/services/flows";
import type { FlowRow, FlowTrigger } from "@/types/flow";

const TRIGGER_LABELS: Record<FlowTrigger, string> = {
  inbound: "Entrada",
  outbound: "Saída",
  manual: "Manual",
};

const TRIGGER_COLORS: Record<FlowTrigger, string> = {
  inbound: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  outbound: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  manual: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

// ─── Flow Card ───────────────────────────────────────────────────────────────
function FlowCard({
  flow,
  onEdit,
  onDelete,
  onDuplicate,
  onToggle,
  onOpen,
}: {
  flow: FlowRow;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setToggling(true);
    try {
      await onToggle();
    } finally {
      setToggling(false);
    }
  };

  // Node type icon strip
  let graph: { nodes?: Array<{ type: string }> } = {};
  try { graph = JSON.parse(flow.graph ?? "{}"); } catch { /* noop */ }
  const nodeTypes = [...new Set((graph.nodes ?? []).map((n) => n.type))].slice(0, 5);

  const nodeIcons: Record<string, React.ReactNode> = {
    chat_text: <MessageSquare className="h-3 w-3" />,
    chat_menu: <GitBranch className="h-3 w-3" />,
    chat_if_else: <GitBranch className="h-3 w-3" />,
    chat_ai_agent: <Zap className="h-3 w-3" />,
  };

  return (
    <div
      className="group relative flex cursor-pointer flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      onClick={onOpen}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Workflow className="h-5 w-5 text-primary" />
        </div>

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{flow.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TRIGGER_COLORS[flow.trigger]}`}
            >
              {TRIGGER_LABELS[flow.trigger]}
            </span>
            {flow.keywords && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                🔑 {flow.keywords.split(",").slice(0, 2).join(", ")}
                {flow.keywords.split(",").length > 2 ? "…" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground opacity-0 ring-1 ring-transparent transition-all group-hover:opacity-100 hover:bg-muted hover:ring-border"
              onClick={(e) => e.stopPropagation()}
              aria-label="Ações do fluxo"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
              <ChevronRight className="mr-2 h-4 w-4" />
              Abrir editor
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Pencil className="mr-2 h-4 w-4" />
              Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Node strip */}
      {nodeTypes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {nodeTypes.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {nodeIcons[t] ?? <Workflow className="h-3 w-3" />}
              {t.replace("chat_", "")}
            </span>
          ))}
        </div>
      )}

      {/* Footer: status toggle + date */}
      <div className="flex items-center justify-between">
        <button
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
            flow.enabled
              ? "bg-emerald-500/15 text-emerald-600 ring-emerald-500/30 hover:bg-emerald-500/25 dark:text-emerald-400"
              : "bg-muted text-muted-foreground ring-border hover:bg-muted/80"
          }`}
          onClick={handleToggle}
          disabled={toggling}
        >
          {toggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : flow.enabled ? (
            <Play className="h-3 w-3" />
          ) : (
            <Pause className="h-3 w-3" />
          )}
          {flow.enabled ? "Ativo" : "Inativo"}
        </button>

        <span className="text-[11px] text-muted-foreground">
          {flow.updatedAt
            ? new Date(flow.updatedAt * 1000).toLocaleDateString("pt-BR")
            : "—"}
        </span>
      </div>
    </div>
  );
}

// ─── Create / Rename Dialog ───────────────────────────────────────────────────
function FlowFormDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, trigger: FlowTrigger, keywords: string) => Promise<void>;
  initial?: FlowRow;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState<FlowTrigger>(initial?.trigger ?? "inbound");
  const [keywords, setKeywords] = useState(initial?.keywords ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setTrigger(initial?.trigger ?? "inbound");
      setKeywords(initial?.keywords ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    setSaving(true);
    try {
      await onSave(name.trim(), trigger, keywords.trim());
      onClose();
    } catch {
      toast.error("Erro ao salvar fluxo");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Renomear fluxo" : "Novo fluxo"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="flow-name">Nome do fluxo *</Label>
            <Input
              id="flow-name"
              placeholder="Ex: Atendimento inicial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="flow-trigger">Gatilho</Label>
            <Select value={trigger} onValueChange={(v) => setTrigger(v as FlowTrigger)}>
              <SelectTrigger id="flow-trigger">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inbound">📥 Entrada (mensagem recebida)</SelectItem>
                <SelectItem value="outbound">📤 Saída (disparo manual)</SelectItem>
                <SelectItem value="manual">🖱️ Manual (botão)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {trigger === "inbound" && (
            <div className="space-y-1.5">
              <Label htmlFor="flow-keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="flow-keywords"
                placeholder="Ex: oi, olá, menu, start"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                O fluxo será acionado quando o contato enviar uma dessas palavras.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initial ? "Salvar" : "Criar fluxo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FlowBuilderListPage() {
  const navigate = useNavigate();
  const [flows, setFlows] = useState<FlowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<FlowRow | null>(null);
  const [toDelete, setToDelete] = useState<FlowRow | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listFlows();
      setFlows(data);
    } catch {
      toast.error("Erro ao carregar fluxos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(
    () =>
      flows.filter((f) =>
        f.name.toLowerCase().includes(q.toLowerCase()) ||
        (f.keywords ?? "").toLowerCase().includes(q.toLowerCase()),
      ),
    [flows, q],
  );

  const handleCreate = async (name: string, trigger: FlowTrigger, keywords: string) => {
    const flow = await createFlow({ name, trigger, keywords, enabled: true });
    setFlows((prev) => [flow, ...prev]);
    toast.success("Fluxo criado!");
    navigate(`/flows/${flow.id}`);
  };

  const handleRename = async (name: string, trigger: FlowTrigger, keywords: string) => {
    if (!editing) return;
    const updated = await updateFlow(editing.id, { name, trigger, keywords });
    setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    setEditing(null);
    toast.success("Fluxo atualizado!");
  };

  const handleToggle = async (flow: FlowRow) => {
    const updated = await updateFlow(flow.id, { enabled: !flow.enabled });
    setFlows((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    toast.success(updated.enabled ? "Fluxo ativado" : "Fluxo pausado");
  };

  const handleDuplicate = async (flow: FlowRow) => {
    try {
      const copy = await duplicateFlow(flow.id);
      setFlows((prev) => [copy, ...prev]);
      toast.success("Fluxo duplicado!");
    } catch {
      toast.error("Erro ao duplicar fluxo");
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteFlow(toDelete.id);
      setFlows((prev) => prev.filter((f) => f.id !== toDelete.id));
      setToDelete(null);
      toast.success("Fluxo excluído");
    } catch {
      toast.error("Erro ao excluir fluxo");
    }
  };

  return (
    <AppShell>
      <div className="flex h-full flex-col gap-6">
        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">FlowBuilder</h2>
            <p className="text-sm text-muted-foreground">
              Crie fluxos de conversa automáticos para o WhatsApp
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden import input */}
            <input
              ref={importRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                toast.info("Importação em breve…");
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => importRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Importar
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo Fluxo
            </Button>
          </div>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar fluxos…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        {/* ── Stats Strip ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Total", value: flows.length, color: "text-foreground" },
            { label: "Ativos", value: flows.filter((f) => f.enabled).length, color: "text-emerald-500" },
            { label: "Inativos", value: flows.filter((f) => !f.enabled).length, color: "text-muted-foreground" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Content ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-10 w-10 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold">
                {q ? "Nenhum fluxo encontrado" : "Nenhum fluxo criado ainda"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {q
                  ? "Tente outros termos de busca"
                  : "Crie seu primeiro fluxo para automatizar atendimentos"}
              </p>
            </div>
            {!q && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Criar primeiro fluxo
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onOpen={() => navigate(`/flows/${flow.id}`)}
                onEdit={() => setEditing(flow)}
                onDuplicate={() => handleDuplicate(flow)}
                onDelete={() => setToDelete(flow)}
                onToggle={() => handleToggle(flow)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <FlowFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSave={handleCreate}
      />

      <FlowFormDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        onSave={handleRename}
        initial={editing ?? undefined}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={`Excluir "${toDelete?.name}"?`}
        description="Esta ação não pode ser desfeita. Todas as configurações do fluxo serão perdidas."
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </AppShell>
  );
}
