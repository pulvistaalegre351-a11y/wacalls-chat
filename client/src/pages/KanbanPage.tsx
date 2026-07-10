import { KanbanBoard } from "@/components/kanban/KanbanBoard";

export const KanbanPage = () => {
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Pipeline Kanban</h2>
        <p className="text-sm text-muted-foreground">Arraste os cards para alterar a etapa do lead no funil.</p>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  );
};

export default KanbanPage;
