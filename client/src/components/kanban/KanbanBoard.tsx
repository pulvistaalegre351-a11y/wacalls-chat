import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useKanbanStore } from "@/stores/kanban";
import { KanbanColumnList } from "./KanbanColumn";

export const KanbanBoard = () => {
  const { columns, moveCard } = useKanbanStore();

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    moveCard(draggableId, source.droppableId, destination.droppableId, destination.index);
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map((col) => (
          <KanbanColumnList key={col.id} column={col} />
        ))}
      </DragDropContext>
    </div>
  );
};
