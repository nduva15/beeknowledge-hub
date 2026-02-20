import { useState, useRef, useEffect } from "react";
import { MessageSquare, BookOpen, Menu, X } from "lucide-react";
import { toast } from "sonner";
import beeHero from "@/assets/bee-hero.jpg";
import KnowledgeDashboard from "@/components/KnowledgeDashboard";

type Message = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What are all the types of honey bees?",
  "Explain Varroa mite disease and how to treat it",
  "What is Manuka honey and why is it special?",
  "What causes Colony Collapse Disorder?",
  "List all bee diseases with symptoms and cures",
  "What are world records related to bees and honey?",
  "How do bees make honey step by step?",
  "What are the health benefits of bee pollen and propolis?",
  "Explain the waggle dance communication",
  "What bee species are endangered?",
];

async function sendToBeegpt(
  history: { role: string; content: string }[],
  onChunk: (c: string) => void,
  onDone: () => void,
  onError: (e: string) => void
) {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beegpt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages: history }),
  });

  if (!resp.ok || !resp.body) {
    const d = await resp.json().catch(() => ({}));
    onError(d.error || `Error ${resp.status}`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { streamDone = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onChunk(c);
      } catch { /* partial chunk */ }
    }
  }
  onDone();
}

function BeeGPTChat({ autoSend }: { autoSend: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [autoSendHandled, setAutoSendHandled] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    let assistantContent = "";

    try {
      await sendToBeegpt(
        newMessages.map((m) => ({ role: m.role, content: m.content })),
        (chunk) => {
          assistantContent += chunk;
          setMessages((p) => {
            const last = p[p.length - 1];
            if (last?.role === "assistant") {
              return p.map((m, i) => (i === p.length - 1 ? { ...m, content: assistantContent } : m));
            }
            return [...p, { id: (Date.now() + 1).toString(), role: "assistant" as const, content: assistantContent }];
          });
        },
        () => setIsLoading(false),
        (err) => { toast.error(err); setIsLoading(false); }
      );
    } catch {
      toast.error("Failed to connect to BeeGPT");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (autoSend && autoSend !== autoSendHandled) {
      setAutoSendHandled(autoSend);
      send(autoSend);
    }
  }, [autoSend]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto custom-scroll p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 animate-fade-in">
            <div className="text-6xl mb-4">🐝</div>
            <h2 className="font-display text-2xl font-bold text-honey mb-2">Ask BeeGPT Anything</h2>
            <p className="text-muted-foreground max-w-md mb-8 text-sm leading-relaxed">
              Powered by 500K+ bee datasets. I know everything about bee species, honey, diseases, treatments, hives, world records, research, and the global bee industry.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-3 py-2.5 rounded-lg text-xs border border-border hover:border-primary/50 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-amber flex items-center justify-center text-sm amber-glow">
                🐝
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "chat-user" : "chat-assistant"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                You
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-amber flex items-center justify-center text-sm">🐝</div>
            <div className="chat-assistant px-4 py-3 flex items-center gap-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-4">
        {messages.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                {s.length > 35 ? s.slice(0, 35) + "…" : s}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask BeeGPT anything about bees, honey, diseases, research..."
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="rounded-xl bg-gradient-amber text-primary-foreground px-4 py-3 hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center min-w-[48px]"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

type View = "chat" | "knowledge";

export default function Index() {
  const [view, setView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatKey, setChatKey] = useState(0);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [autoSend, setAutoSend] = useState<string | null>(null);

  const handleAskFromKnowledge = (question: string) => {
    setView("chat");
    setAutoSend(question);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background honeycomb-bg">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r border-border bg-sidebar transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-14"
        }`}
      >
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-amber flex items-center justify-center text-base amber-glow">
            🐝
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <div className="font-display font-bold text-honey text-base leading-tight">BeeGPT</div>
              <div className="text-xs text-muted-foreground">Bee Knowledge AI</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen((p) => !p)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setView("chat")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              view === "chat"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && "BeeGPT Chat"}
          </button>
          <button
            onClick={() => setView("knowledge")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
              view === "knowledge"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            }`}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            {sidebarOpen && "Knowledge Hub"}
          </button>
        </nav>

        {sidebarOpen && (
          <div className="p-3 border-t border-sidebar-border">
            <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Domains</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              {["🐝 Bee Species", "🍯 Honey Types", "🦠 Diseases", "💊 Treatments", "🏡 Hives", "🔬 Research", "🌍 Industry"].map((d) => (
                <div key={d} className="py-0.5">{d}</div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex-shrink-0 border-b border-border px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-honey text-xl">
              {view === "chat" ? "🐝 BeeGPT — Bee Knowledge AI" : "📚 Knowledge Hub"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {view === "chat"
                ? "Ask anything about bees, honey, diseases, research, hives & more"
                : "Explore 500K+ bee datasets across all knowledge domains"}
            </p>
          </div>
          {view === "chat" && (
            <button
              onClick={() => { setChatKey((k) => k + 1); setAutoSend(null); }}
              className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 px-3 py-1.5 rounded-lg transition-all"
            >
              New Chat
            </button>
          )}
        </header>

        {view === "knowledge" && (
          <div className="relative h-36 flex-shrink-0 overflow-hidden">
            <img src={beeHero} alt="Bee Knowledge System" className="w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
            <div className="absolute inset-0 flex items-center px-6">
              <div>
                <h2 className="font-display text-3xl font-bold text-foreground drop-shadow-lg">The Complete Bee Encyclopedia</h2>
                <p className="text-sm text-muted-foreground mt-1">Click any category to instantly ask BeeGPT</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0">
          {view === "chat" ? (
            <BeeGPTChat key={chatKey} autoSend={autoSend} />
          ) : (
            <KnowledgeDashboard onAsk={handleAskFromKnowledge} />
          )}
        </div>
      </div>
    </div>
  );
}
