import { Draggable } from "@hello-pangea/dnd";
import type { ChatSummary } from "@/types/chat";
import { formatTime } from "@/components/domain/chat/format";
import { MessageSquare, PhoneCall } from "lucide-react";
import { setActiveChat } from "@/stores/chats";
import { resolveLidPhone } from "@/services/chats";
import { useDialerUI } from "@/stores/dialerUI";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  chat: ChatSummary;
  index: number;
  sessionId: string;
}

export const KanbanCardItem = ({ chat, index, sessionId }: Props) => {
  const formattedDate = chat.lastTs ? formatTime(chat.lastTs) : "";

  const navigate = useNavigate();
  const openDialer = useDialerUI((s) => s.openDialer);

  const handleOpenChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveChat(sessionId, chat.chatJid);
    navigate("/chats");
  };

  const handleCall = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (chat.chatJid.endsWith("@lid")) {
      try {
        const resolved = await resolveLidPhone(sessionId, chat.chatJid);
        if (resolved && resolved.phone) {
          openDialer(resolved.phone);
        } else {
          toast.error("Não foi possível descobrir o número oculto deste contato.");
        }
      } catch (err) {
        toast.error("Erro ao resolver o número oculto.");
      }
    } else {
      const phone = chat.chatJid.split("@")[0];
      openDialer(phone);
    }
  };

  return (
    <Draggable draggableId={chat.chatJid} index={index}>
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
          <div className="flex items-center gap-2">
            {chat.avatarUrl ? (
              <img src={chat.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary uppercase">
                {(chat.name || "C").charAt(0)}
              </div>
            )}
            <div className="font-semibold text-sm leading-tight text-foreground truncate">
              {chat.name || chat.chatJid.split("@")[0]}
            </div>
          </div>
          
          {chat.lastMessage && (
            <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {chat.lastMessage}
            </div>
          )}
          
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleOpenChat}
                className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Abrir Conversa"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCall}
                className="grid h-6 w-6 place-items-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Ligar"
              >
                <PhoneCall className="h-3.5 w-3.5" />
              </button>
              {chat.unread > 0 && (
                <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600 flex items-center">
                  {chat.unread}
                </span>
              )}
            </div>
            
            <div className="text-[10px] text-muted-foreground/80">
              {formattedDate}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};
