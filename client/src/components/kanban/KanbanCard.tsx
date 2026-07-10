import { Draggable } from "@hello-pangea/dnd";
import { type KanbanCard } from "@/stores/kanban";

interface Props {
  card: KanbanCard;
  index: number;
}

export const KanbanCardItem = ({ card, index }: Props) => {
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(card.createdAt));

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm transition-colors ${
            snapshot.isDragging ? "ring-2 ring-primary ring-offset-1 shadow-md rotate-2 opacity-90" : "hover:border-primary/40"
          }`}
          style={provided.draggableProps.style}
        >
          <div className="font-semibold text-sm leading-tight text-foreground">
            {card.title}
          </div>
          {card.description && (
            <div className="text-xs text-muted-foreground line-clamp-2">
              {card.description}
            </div>
          )}
          
          {(card.tags?.length || card.createdAt) && (
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-1">
                {card.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="text-[10px] text-muted-foreground/80">
                {formattedDate}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};
