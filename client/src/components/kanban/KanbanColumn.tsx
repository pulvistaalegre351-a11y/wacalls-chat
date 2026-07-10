import { Droppable } from "@hello-pangea/dnd";
import { type KanbanColumn } from "@/stores/kanban";
import { KanbanCardItem } from "./KanbanCard";

interface Props {
  column: KanbanColumn;
}

export const KanbanColumnList = ({ column }: Props) => {
  return (
    <div className="flex h-full min-w-[280px] max-w-[280px] flex-col rounded-xl border bg-muted/40">
      <div className="flex items-center justify-between p-3 border-b bg-muted/60 rounded-t-xl">
        <h3 className="font-semibold text-sm">{column.title}</h3>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background text-[10px] font-medium text-muted-foreground shadow-sm">
          {column.cards.length}
        </span>
      </div>

      <Droppable droppableId={column.id} type="CARD">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 overflow-y-auto p-3 flex flex-col gap-3 transition-colors ${
              snapshot.isDraggingOver ? "bg-muted/80" : ""
            }`}
          >
            {column.cards.map((card, index) => (
              <KanbanCardItem key={card.id} card={card} index={index} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};
