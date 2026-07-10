import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KanbanColumnDef {
  id: string;
  title: string;
}

export interface KanbanState {
  columns: KanbanColumnDef[];
  cardsByColumn: Record<string, string[]>;
  moveCard: (chatJid: string, sourceColId: string, destColId: string, destIndex: number) => void;
  registerChats: (chatJids: string[]) => void;
}

const initialColumns: KanbanColumnDef[] = [
  { id: "col-1-leads", title: "Novos Leads" },
  { id: "col-2-contact", title: "Contatados" },
  { id: "col-3-nego", title: "Em Negociação" },
  { id: "col-4-won", title: "Fechados" },
  { id: "col-5-lost", title: "Perdidos" },
];

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      columns: initialColumns,
      cardsByColumn: {
        "col-1-leads": [],
        "col-2-contact": [],
        "col-3-nego": [],
        "col-4-won": [],
        "col-5-lost": [],
      },

      moveCard: (chatJid, sourceColId, destColId, destIndex) =>
        set((state) => {
          const sourceCards = [...(state.cardsByColumn[sourceColId] || [])];
          const destCards = sourceColId === destColId ? sourceCards : [...(state.cardsByColumn[destColId] || [])];
          
          const cardIndex = sourceCards.indexOf(chatJid);
          if (cardIndex === -1) return state; // Should not happen
          
          sourceCards.splice(cardIndex, 1);
          destCards.splice(destIndex, 0, chatJid);

          return {
            cardsByColumn: {
              ...state.cardsByColumn,
              [sourceColId]: sourceCards,
              [destColId]: destCards,
            },
          };
        }),

      registerChats: (chatJids) =>
        set((state) => {
          // Find which chats are not in ANY column
          const allKnownJids = new Set<string>();
          Object.values(state.cardsByColumn).forEach((list) => {
            list.forEach((jid) => allKnownJids.add(jid));
          });

          const newJids = chatJids.filter((jid) => !allKnownJids.has(jid));
          if (newJids.length === 0) return state; // Nothing to add

          // Add to the first column (Novos Leads)
          const firstCol = state.columns[0].id;
          return {
            cardsByColumn: {
              ...state.cardsByColumn,
              [firstCol]: [...(state.cardsByColumn[firstCol] || []), ...newJids],
            },
          };
        }),
    }),
    {
      name: "primevoip.kanban.storage.v2",
    }
  )
);

