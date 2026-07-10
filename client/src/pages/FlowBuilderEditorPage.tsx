import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Loader2,
  Save,
  Zap,
  MessageSquare,
  GitBranch,
  Clock,
  Users,
  UserCheck,
  Tag,
  Tags,
  Shuffle,
  Webhook,
  Play,
  Pause,
  ChevronRight,
  Image,
  ListChecks,
  Type,
  Bot,
  Workflow,
  X,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getFlow, updateFlow, parseGraph, serializeGraph } from "@/services/flows";
import type { FlowGraph, FlowNode, FlowNodeType } from "@/types/flow";

// ─── Node palette definition ─────────────────────────────────────────────────
export const NODE_PALETTE: Array<{
  type: FlowNodeType;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}> = [
  { type: "chat_text",        label: "Enviar Texto",    icon: <MessageSquare className="h-4 w-4" />, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",  description: "Envia uma mensagem de texto" },
  { type: "chat_media",       label: "Mídia",           icon: <Image className="h-4 w-4" />,         color: "bg-sky-500/15 text-sky-600 dark:text-sky-400",               description: "Envia imagem, vídeo ou áudio" },
  { type: "chat_menu",        label: "Menu",            icon: <ListChecks className="h-4 w-4" />,    color: "bg-violet-500/15 text-violet-600 dark:text-violet-400",      description: "Exibe um menu numerado de opções" },
  { type: "chat_input",       label: "Aguardar Resp.",  icon: <Type className="h-4 w-4" />,          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",         description: "Captura a resposta do contato" },
  { type: "chat_if_else",     label: "Condição",        icon: <GitBranch className="h-4 w-4" />,     color: "bg-orange-500/15 text-orange-600 dark:text-orange-400",      description: "Bifurca o fluxo com base em uma condição" },
  { type: "chat_interval",    label: "Aguardar",        icon: <Clock className="h-4 w-4" />,         color: "bg-slate-500/15 text-slate-600 dark:text-slate-400",         description: "Aguarda X segundos antes de continuar" },
  { type: "chat_queue",       label: "Transferir Fila", icon: <Users className="h-4 w-4" />,         color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",      description: "Transfere para uma fila de atendimento" },
  { type: "chat_attendant",   label: "Agente",          icon: <UserCheck className="h-4 w-4" />,     color: "bg-teal-500/15 text-teal-600 dark:text-teal-400",            description: "Transfere para um agente específico" },
  { type: "chat_tag_add",     label: "Adicionar Tag",   icon: <Tag className="h-4 w-4" />,           color: "bg-pink-500/15 text-pink-600 dark:text-pink-400",            description: "Adiciona uma tag ao contato" },
  { type: "chat_tag_remove",  label: "Remover Tag",     icon: <Tags className="h-4 w-4" />,          color: "bg-rose-500/15 text-rose-600 dark:text-rose-400",            description: "Remove uma tag do contato" },
  { type: "chat_random",      label: "Randômico",       icon: <Shuffle className="h-4 w-4" />,       color: "bg-lime-500/15 text-lime-600 dark:text-lime-400",            description: "Divide o fluxo aleatoriamente (A/B)" },
  { type: "chat_http",        label: "Webhook HTTP",    icon: <Webhook className="h-4 w-4" />,       color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",            description: "Faz uma requisição HTTP externa" },
  { type: "chat_ai_agent",    label: "Agente IA",       icon: <Zap className="h-4 w-4" />,           color: "bg-purple-500/15 text-purple-600 dark:text-purple-400",      description: "Usa IA para responder automaticamente" },
  { type: "chat_switch_flow", label: "Mudar Fluxo",     icon: <Workflow className="h-4 w-4" />,      color: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400",  description: "Redireciona para outro fluxo" },
  { type: "end",              label: "Fim",             icon: <X className="h-4 w-4" />,             color: "bg-red-500/15 text-red-600 dark:text-red-400",               description: "Encerra o fluxo" },
];

// ─── Custom Node Component ────────────────────────────────────────────────────
function ChatFlowNode({ data, selected }: { data: FlowNode["data"] & { nodeType: FlowNodeType; label: string }; selected?: boolean }) {
  const meta = NODE_PALETTE.find((p) => p.type === data.nodeType);
  return (
    <div
      className={`min-w-[160px] max-w-[220px] rounded-xl border-2 bg-card shadow-md transition-all ${
        selected
          ? "border-primary shadow-lg shadow-primary/20"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className={`flex items-center gap-2 rounded-t-[10px] px-3 py-2 ${meta?.color ?? "bg-muted"}`}>
        {meta?.icon}
        <span className="truncate text-xs font-semibold">{data.label || meta?.label}</span>
      </div>
      {data.prompt || data.template ? (
        <div className="px-3 py-2">
          <p className="line-clamp-2 text-[11px] text-muted-foreground">
            {(data.prompt || data.template) as string}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  chatFlowNode: ChatFlowNode,
};

// ─── Node Properties Panel ───────────────────────────────────────────────────
function NodePropertiesPanel({
  node,
  onClose,
  onUpdate,
}: {
  node: Node | null;
  onClose: () => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [seconds, setSeconds] = useState("5");

  useEffect(() => {
    if (!node) return;
    const d = node.data as Record<string, unknown>;
    setLabel((d.label as string) ?? "");
    setText(((d.prompt ?? d.template) as string) ?? "");
    setSeconds((d.seconds as string) ?? "5");
  }, [node?.id]);

  if (!node) return null;

  const nodeType = (node.data as Record<string, unknown>).nodeType as FlowNodeType;
  const meta = NODE_PALETTE.find((p) => p.type === nodeType);

  const save = () => {
    const updates: Record<string, unknown> = { label };
    if (nodeType === "chat_text" || nodeType === "chat_menu") updates.template = text;
    if (nodeType === "chat_interval") updates.seconds = Number(seconds);
    if (nodeType === "chat_input") updates.prompt = text;
    onUpdate(node.id, updates);
    toast.success("Nó atualizado");
  };

  return (
    <div className="flex h-full w-72 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-md p-1.5 text-sm ${meta?.color ?? "bg-muted"}`}>{meta?.icon}</span>
          <div>
            <p className="text-sm font-semibold">{meta?.label}</p>
            <p className="text-[10px] text-muted-foreground">{meta?.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label>Rótulo do nó</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nome exibido" />
        </div>

        {(nodeType === "chat_text" || nodeType === "chat_menu" || nodeType === "chat_input") && (
          <div className="space-y-1.5">
            <Label>
              {nodeType === "chat_input" ? "Pergunta ao contato" : "Mensagem"}
            </Label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                nodeType === "chat_menu"
                  ? "Olá! Escolha uma opção:\n1 - Suporte\n2 - Vendas\n3 - Financeiro"
                  : "Digite a mensagem…"
              }
              rows={5}
              className="resize-none text-sm"
            />
          </div>
        )}

        {nodeType === "chat_interval" && (
          <div className="space-y-1.5">
            <Label>Segundos de espera</Label>
            <Input
              type="number"
              min={1}
              max={300}
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <Button className="w-full" onClick={save}>
          <Save className="mr-1.5 h-4 w-4" />
          Aplicar
        </Button>
      </div>
    </div>
  );
}

// ─── Palette Panel ───────────────────────────────────────────────────────────
function PalettePanel({ onAdd }: { onAdd: (type: FlowNodeType) => void }) {
  const [q, setQ] = useState("");
  const filtered = NODE_PALETTE.filter(
    (p) =>
      p.label.toLowerCase().includes(q.toLowerCase()) ||
      p.description.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="border-b px-3 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Blocos
        </p>
        <Input
          placeholder="Buscar bloco…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.map((item) => (
          <button
            key={item.type}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted"
            onClick={() => onAdd(item.type)}
            title={item.description}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ring-transparent ${item.color}`}>
              {item.icon}
            </span>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground text-xs">{item.label}</p>
              <p className="truncate text-[10px] text-muted-foreground">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Editor Page ─────────────────────────────────────────────────────────────
let nodeIdCounter = 1;
const newNodeId = () => `node-${Date.now()}-${nodeIdCounter++}`;

function toReactFlowNode(n: FlowNode): Node {
  return {
    id: n.id,
    type: "chatFlowNode",
    position: n.position,
    data: { ...n.data, nodeType: n.type, label: n.data.label ?? n.type },
  };
}

function fromReactFlowNode(n: Node, nodeType: FlowNodeType): FlowNode {
  const { nodeType: _, label, ...rest } = n.data as Record<string, unknown>;
  return {
    id: n.id,
    type: nodeType,
    position: n.position as { x: number; y: number },
    data: { ...rest, label: label as string | undefined },
  };
}

export default function FlowBuilderEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [flow, setFlow] = useState<{ name: string; enabled: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [graphMeta, setGraphMeta] = useState<Partial<FlowGraph>>({});

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(true);

  // Track node types separately for serialization
  const nodeTypeMapRef = useRef<Map<string, FlowNodeType>>(new Map());

  // Load flow
  useEffect(() => {
    if (!id) return;
    void (async () => {
      try {
        setLoading(true);
        const row = await getFlow(id);
        setFlow({ name: row.name, enabled: row.enabled });
        const graph = parseGraph(row.graph);
        setGraphMeta({ kind: graph.kind ?? "chat", startNodeId: graph.startNodeId });

        // Build type map
        graph.nodes.forEach((n) => nodeTypeMapRef.current.set(n.id, n.type));

        setNodes(graph.nodes.map(toReactFlowNode));
        setEdges(
          graph.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            animated: true,
            style: { strokeWidth: 2 },
          })),
        );
      } catch {
        toast.error("Erro ao carregar fluxo");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge({ ...conn, animated: true, style: { strokeWidth: 2 } }, eds),
      ),
    [setEdges],
  );

  const handleAddNode = (type: FlowNodeType) => {
    const nid = newNodeId();
    nodeTypeMapRef.current.set(nid, type);
    const meta = NODE_PALETTE.find((p) => p.type === type);
    const newNode: Node = {
      id: nid,
      type: "chatFlowNode",
      position: { x: 300 + Math.random() * 200, y: 150 + Math.random() * 150 },
      data: { nodeType: type, label: meta?.label ?? type },
    };
    setNodes((ns) => [...ns, newNode]);
  };

  const handleUpdateNodeData = (nodeId: string, data: Record<string, unknown>) => {
    setNodes((ns) =>
      ns.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
    setSelectedNode((prev) =>
      prev?.id === nodeId ? { ...prev, data: { ...prev.data, ...data } } : prev,
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const flowNodes: FlowNode[] = nodes.map((n) => {
        const nodeType = nodeTypeMapRef.current.get(n.id) ?? "chat_text";
        return fromReactFlowNode(n, nodeType);
      });
      const graph: FlowGraph = {
        nodes: flowNodes,
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
        })),
        startNodeId: graphMeta.startNodeId ?? flowNodes[0]?.id ?? "",
        kind: "chat",
      };
      await updateFlow(id, { graph: serializeGraph(graph) });
      toast.success("Fluxo salvo!");
    } catch {
      toast.error("Erro ao salvar fluxo");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    if (!id || !flow) return;
    try {
      const updated = await updateFlow(id, { enabled: !flow.enabled });
      setFlow((f) => (f ? { ...f, enabled: updated.enabled } : f));
      toast.success(updated.enabled ? "Fluxo ativado" : "Fluxo pausado");
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-hidden -mx-4 -my-5 sm:-mx-6">
        {/* ── Toolbar ─────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate("/flows")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-5" />

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Workflow className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate font-semibold">{flow?.name ?? "Fluxo"}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaletteOpen((v) => !v)}
            className="hidden sm:flex"
          >
            <Settings2 className="mr-1.5 h-4 w-4" />
            Blocos
          </Button>

          <Button
            variant={flow?.enabled ? "outline" : "secondary"}
            size="sm"
            onClick={handleToggle}
          >
            {flow?.enabled ? (
              <><Pause className="mr-1.5 h-4 w-4" /> Pausar</>
            ) : (
              <><Play className="mr-1.5 h-4 w-4" /> Ativar</>
            )}
          </Button>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>

        {/* ── Canvas Area ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">
          {/* Left palette */}
          {paletteOpen && (
            <PalettePanel onAdd={handleAddNode} />
          )}

          {/* ReactFlow canvas */}
          <div className="relative flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNode(node)}
              onPaneClick={() => setSelectedNode(null)}
              fitView
              proOptions={{ hideAttribution: true }}
              className="bg-muted/30"
            >
              <Background variant={BackgroundVariant.Dots} gap={16} size={1} className="opacity-40" />
              <Controls className="!bottom-4 !left-4 !top-auto" />
              <MiniMap
                className="!bottom-4 !right-4 !top-auto !rounded-xl !border !bg-background"
                nodeColor={(n) => {
                  const t = (n.data as Record<string, unknown>).nodeType as FlowNodeType;
                  if (t?.startsWith("chat_ai")) return "#a855f7";
                  if (t?.startsWith("chat_text")) return "#22c55e";
                  if (t === "end") return "#ef4444";
                  return "#6366f1";
                }}
              />
              <Panel position="top-center">
                <div className="rounded-full border bg-background/90 px-4 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
                  Arraste blocos da paleta • Conecte as saídas entre nós • Clique num nó para editar
                </div>
              </Panel>
            </ReactFlow>

            {/* Empty state overlay */}
            {nodes.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Canvas em branco</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Adicione blocos da paleta à esquerda para criar seu fluxo
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right properties panel */}
          {selectedNode && (
            <NodePropertiesPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onUpdate={handleUpdateNodeData}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
