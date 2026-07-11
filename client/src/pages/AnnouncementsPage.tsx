import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react";
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
  listAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
} from "@/services/announcements";
import type { Announcement } from "@/services/announcements";
import { useAuth } from "@/stores/auth";

export default function AnnouncementsPage() {
  const isAdmin = useAuth((s) => s.user?.role === "admin" || s.user?.role === "superadmin");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    title: "",
    message: "",
  });

  const loadData = async () => {
    try {
      const anns = await listAnnouncements();
      setAnnouncements(anns || []);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar avisos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData.title || !modalData.message) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createAnnouncement({
        title: modalData.title,
        message: modalData.message,
      });
      toast.success("Aviso criado com sucesso!");
      setIsModalOpen(false);
      setModalData({ title: "", message: "" });
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar aviso");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      toast.success("Aviso removido");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover aviso");
    }
  };

  return (
    <AppShell>
      <div className="flex items-center justify-between pb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Mural de Avisos</h1>
        {isAdmin && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Aviso
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 opacity-50 text-blue-500" />
            <div>
              <p className="text-lg font-medium text-foreground">
                Nenhum aviso no mural
              </p>
              <p className="text-sm">
                Avisos importantes da administração aparecerão aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="flex flex-col justify-between space-y-4 rounded-xl border bg-blue-50/50 p-6 shadow-sm dark:bg-blue-950/20"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-blue-600 dark:text-blue-400">{a.title}</h3>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                    {a.message}
                  </p>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end space-x-2 pt-4 border-t">
                    <ConfirmDialog
                      title="Remover aviso?"
                      description="Esta ação não pode ser desfeita."
                      onConfirm={() => handleDelete(a.id)}
                    >
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <Trash2 className="h-4 w-4" /> Remover
                      </Button>
                    </ConfirmDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Aviso Geral</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                required
                placeholder="Ex: Atualização do Sistema"
                value={modalData.title}
                onChange={(e) => setModalData({ ...modalData, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                required
                className="min-h-[150px]"
                placeholder="Detalhes do aviso para todos os atendentes..."
                value={modalData.message}
                onChange={(e) => setModalData({ ...modalData, message: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Publicar Aviso</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
