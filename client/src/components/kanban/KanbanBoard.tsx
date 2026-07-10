import { useEffect, useMemo } from "react";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { useKanbanStore } from "@/stores/kanban";
import { KanbanColumnList } from "./KanbanColumn";
import type { ChatSummary } from "@/types/chat";

interface Props {
  chats: ChatSummary[];
}

export const KanbanBoard = ({ chats }: Props) => {
  const { columns, cardsByColumn, moveCard, registerChats } = useKanbanStore();

  useEffect(() => {
    if (chats.length > 0) {
      registerChats(chats.map(c => c.chatJid));
    }
  }, [chats, registerChats]);

  // Group chats by column order
  const chatsByCol = useMemo(() => {
    const map: Record<string, ChatSummary[]> = {};
    const chatByJid = new Map(chats.map(c => [c.chatJid, c]));
    
    for (const col of columns) {
      const order = cardsByColumn[col.id] || [];
      const colChats: ChatSummary[] = [];
      for (const jid of order) {
        const c = chatByJid.get(jid);
        if (c) colChats.push(c);
      }
      map[col.id] = colChats;
    }
    return map;
  }, [chats, columns, cardsByColumn]);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    moveCard(draggableId, source.droppableId, destination.droppableId, destination.index);
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto pb-4 p-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {columns.map((col) => (
          <KanbanColumnList key={col.id} column={col} chats={chatsByCol[col.id] || []} />
        ))}
      </DragDropContext>
    </div>
  );
};
