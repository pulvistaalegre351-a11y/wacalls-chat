import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface KanbanCard {
  id: string;
  title: string; // Ex: Nome do contato
  description?: string; // Ex: Última mensagem ou nota
  tags?: string[];
  createdAt: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanState {
  columns: KanbanColumn[];
  moveCard: (cardId: string, sourceColId: string, destColId: string, destIndex: number) => void;
  addCard: (colId: string, card: Omit<KanbanCard, "id" | "createdAt">) => void;
  updateColumn: (colId: string, title: string) => void;
}

// Initial mock data
const initialColumns: KanbanColumn[] = [
  {
    id: "col-1-leads",
    title: "Novos Leads",
    cards: [
      { id: "card-1", title: "João Silva", description: "Interesse no plano premium", tags: ["Urgente", "Novo"], createdAt: Date.now() },
      { id: "card-2", title: "Maria Oliveira", description: "Dúvida sobre os preços", tags: ["Novo"], createdAt: Date.now() },
    ],
  },
  {
    id: "col-2-contact",
    title: "Contatados",
    cards: [
      { id: "card-3", title: "Carlos Santos", description: "Pediu para retornar à tarde", tags: ["Retorno"], createdAt: Date.now() },
    ],
  },
  {
    id: "col-3-nego",
    title: "Em Negociação",
    cards: [
      { id: "card-4", title: "Empresa ABC", description: "Analisando a proposta", tags: ["B2B", "Quente"], createdAt: Date.now() },
    ],
  },
  {
    id: "col-4-won",
    title: "Fechados",
    cards: [],
  },
  {
    id: "col-5-lost",
    title: "Perdidos",
    cards: [],
  },
];

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set) => ({
      columns: initialColumns,

      moveCard: (cardId, sourceColId, destColId, destIndex) =>
        set((state) => {
          const sourceCol = state.columns.find((c) => c.id === sourceColId);
          const destCol = state.columns.find((c) => c.id === destColId);
          
          if (!sourceCol || !destCol) return state;

          const sourceCards = [...sourceCol.cards];
          const destCards = sourceColId === destColId ? sourceCards : [...destCol.cards];
          
          const cardIndex = sourceCards.findIndex((c) => c.id === cardId);
          if (cardIndex === -1) return state;
          
          const [movedCard] = sourceCards.splice(cardIndex, 1);
          destCards.splice(destIndex, 0, movedCard);

          return {
            columns: state.columns.map((c) => {
              if (c.id === sourceColId && sourceColId === destColId) {
                return { ...c, cards: destCards };
              }
              if (c.id === sourceColId) {
                return { ...c, cards: sourceCards };
              }
              if (c.id === destColId) {
                return { ...c, cards: destCards };
              }
              return c;
            }),
          };
        }),

      addCard: (colId, card) =>
        set((state) => ({
          columns: state.columns.map((c) =>
            c.id === colId
              ? {
                  ...c,
                  cards: [
                    ...c.cards,
                    { ...card, id: `card-${Math.random().toString(36).substring(2, 9)}`, createdAt: Date.now() },
                  ],
                }
              : c
          ),
        })),

      updateColumn: (colId, title) =>
        set((state) => ({
          columns: state.columns.map((c) => (c.id === colId ? { ...c, title } : c)),
        })),
    }),
    {
      name: "primevoip.kanban.storage",
    }
  )
);
