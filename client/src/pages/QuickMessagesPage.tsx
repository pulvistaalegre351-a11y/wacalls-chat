import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Zap } from "lucide-react";
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
import {
  listQuickMessages,
  createQuickMessage,
  deleteQuickMessage,
} from "@/services/quickMessages";
import type { QuickMessage } from "@/services/quickMessages";

export default function QuickMessagesPage() {
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    shortcut: "",
    message: "",
  });

  const loadData = async () => {
    try {
      const msgs = await listQuickMessages();
      setMessages(msgs || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar respostas rápidas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData.shortcut || !modalData.message) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    
    // Auto add slash
    let shortcut = modalData.shortcut.trim();
    if (!shortcut.startsWith("/")) {
      shortcut = "/" + shortcut;
    }

    try {
      await createQuickMessage({
        shortcut,
        message: modalData.message,
      });
      toast.success("Resposta criada com sucesso!");
      setIsModalOpen(false);
      setModalData({ shortcut: "", message: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar resposta rápida");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuickMessage(id);
      toast.success("Resposta removida");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover resposta");
    }
  };

  return (
    <AppShell
      title="Respostas Rápidas"
      actions={
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Resposta
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Zap className="h-12 w-12 opacity-50 text-yellow-500" />
            <div>
              <p className="text-lg font-medium text-foreground">
                Nenhuma resposta rápida
              </p>
              <p className="text-sm">
                Crie atalhos (ex: /bomdia) para enviar textos longos rapidamente no chat.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-between space-y-4 rounded-xl border bg-card p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-primary">{m.shortcut}</h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                    {m.message}
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                  <ConfirmDialog
                    title="Remover atalho?"
                    description="Esta ação não pode ser desfeita."
                    onConfirm={() => handleDelete(m.id)}
                  >
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" /> Remover
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
            <DialogTitle>Nova Resposta Rápida</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Atalho</Label>
              <Input
                required
                placeholder="Ex: /pix ou /bomdia"
                value={modalData.shortcut}
                onChange={(e) => setModalData({ ...modalData, shortcut: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                required
                className="min-h-[150px]"
                placeholder="Digite o texto completo da resposta..."
                value={modalData.message}
                onChange={(e) => setModalData({ ...modalData, message: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
