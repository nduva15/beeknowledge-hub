import { MessageSquare, Trash2, Plus } from "lucide-react";

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

interface ChatHistoryProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatHistory({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isOpen,
  onClose,
}: ChatHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar panel */}
      <div className="relative w-72 max-w-[80vw] h-full bg-card border-r border-border flex flex-col shadow-lg animate-fade-in">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-bold text-foreground text-sm">Chat History</h2>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all"
          >
            <Plus className="w-3 h-3" />
            New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll p-2 space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-all text-sm ${
                c.id === activeId
                  ? "bg-primary/10 text-foreground border border-primary/30"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => { onSelect(c.id); onClose(); }}
            >
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                title="Delete conversation"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
