import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Image, Mic, X, User, Plus } from "lucide-react";
import { toast } from "sonner";
import beeyieldLogo from "@/assets/beeyield-logo.png";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  audioName?: string;
};

const SUGGESTIONS = [
  "What are all types of honey bees and their subspecies?",
  "Explain Varroa destructor — lifecycle, damage, and all treatment options",
  "Compare all 300 plus honey varieties and their medicinal properties",
  "What causes Colony Collapse Disorder and what are the solutions?",
  "Precision pollination data — which crops need bees and economic value?",
  "List every bee disease with cause, symptoms, and cure",
  "What are world records related to bees, honey, and hives?",
  "Explain bee venom therapy and apitherapy research",
  "How does the waggle dance work and what did Karl von Frisch discover?",
  "What are the latest research findings on bee cognition and intelligence?",
  "Which bee species are endangered and why?",
  "Compare all hive types: Langstroth, Warré, Flow Hive, Top-Bar and more",
];

async function streamBeeyield(
  messages: { role: string; content: string }[],
  imageBase64: string | null,
  imageType: string | null,
  audioBase64: string | null,
  audioType: string | null,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
) {
  const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beegpt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, imageBase64, imageType, audioBase64, audioType }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    onError(data.error || `Error ${resp.status}`);
    return;
  }
  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { done: rdDone, value } = await reader.read();
    if (rdDone) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix, send only base64 string
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Index() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatKey, setChatKey] = useState(0);

  // Media state
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<File | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const clearAttachments = useCallback(() => {
    setAttachedImage(null);
    setImagePreviewUrl(null);
    setAttachedAudio(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10 MB"); return; }
    setAttachedImage(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Audio must be under 20 MB"); return; }
    setAttachedAudio(file);
    setAttachedImage(null);
    setImagePreviewUrl(null);
    toast.success(`Audio attached: ${file.name}`);
  };

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    let imgBase64: string | null = null;
    let imgType: string | null = null;
    let audioBase64: string | null = null;
    let audioType: string | null = null;

    if (attachedImage) {
      imgBase64 = await fileToBase64(attachedImage);
      imgType = attachedImage.type;
    }
    if (attachedAudio) {
      audioBase64 = await fileToBase64(attachedAudio);
      audioType = attachedAudio.type;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      imagePreview: imagePreviewUrl || undefined,
      audioName: attachedAudio?.name,
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    clearAttachments();
    setIsLoading(true);

    const history = newMessages.map((m) => ({ role: m.role, content: m.content }));
    let assistantContent = "";

    try {
      await streamBeeyield(
        history,
        imgBase64,
        imgType,
        audioBase64,
        audioType,
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
      toast.error("Failed to connect to Beeyield AI");
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const resetChat = () => {
    setChatKey((k) => k + 1);
    setMessages([]);
    setInput("");
    clearAttachments();
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background honeycomb-bg overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-sidebar px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={beeyieldLogo} alt="Beeyield" className="h-9 w-auto" />
          <div>
            <div className="font-display font-bold text-foreground text-base leading-tight">Beeyield AI</div>
            <div className="text-xs text-muted-foreground">The World's Most Comprehensive Bee Knowledge System</div>
          </div>
        </div>
        <button
          onClick={resetChat}
          className="text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/50 px-3 py-1.5 rounded-lg transition-all"
        >
          New Chat
        </button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-6 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in max-w-3xl mx-auto w-full">
            <img src={beeyieldLogo} alt="Beeyield" className="h-16 w-auto mb-4 opacity-90" />
            <h1 className="font-display text-3xl font-bold text-honey mb-2">Welcome to Beeyield AI</h1>
            <p className="text-muted-foreground max-w-xl mb-8 text-sm leading-relaxed">
              The world's most comprehensive bee knowledge system. Powered by an extensive dataset covering every bee species, honey variety, disease, treatment, pollination science, and global industry research. Ask anything.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left px-3 py-2.5 rounded-lg text-xs border border-border hover:border-primary/50 hover:bg-muted transition-all text-muted-foreground hover:text-foreground leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-4xl mx-auto w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-background border border-border shadow-sm">
                <img src={beeyieldLogo} alt="Beeyield AI" className="w-6 h-6 object-contain" />
              </div>
            )}
            <div className="flex flex-col gap-1 max-w-[80%]">
              {msg.imagePreview && (
                <img
                  src={msg.imagePreview}
                  alt="Attached"
                  className="rounded-lg max-h-48 object-contain border border-border self-end"
                />
              )}
              {msg.audioName && (
                <div className="text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5 self-end flex items-center gap-2">
                  <Mic className="w-3 h-3" />
                  {msg.audioName}
                </div>
              )}
              <div
                className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user" ? "chat-user" : "chat-assistant"
                }`}
              >
                {msg.content}
              </div>
            </div>
            {msg.role === "user" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3 justify-start max-w-4xl mx-auto w-full">
            <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-background border border-border flex items-center justify-center shadow-sm">
              <img src={beeyieldLogo} alt="Beeyield AI" className="w-6 h-6 object-contain" />
            </div>
            <div className="chat-assistant px-4 py-3 flex items-center gap-1">
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
              <span className="typing-dot w-2 h-2 rounded-full bg-primary inline-block" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 border-t border-border bg-sidebar px-4 pb-4 pt-3">
        {/* Quick suggestions when chat has messages */}
        {messages.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3 max-w-4xl mx-auto">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                {s.length > 40 ? s.slice(0, 40) + "…" : s}
              </button>
            ))}
          </div>
        )}

        {/* Attachment previews */}
        {(attachedImage || attachedAudio) && (
          <div className="flex items-center gap-3 mb-3 max-w-4xl mx-auto">
            {imagePreviewUrl && (
              <div className="relative">
                <img src={imagePreviewUrl} alt="Attached" className="h-16 w-16 object-cover rounded-lg border border-border" />
                <button
                  onClick={() => { setAttachedImage(null); setImagePreviewUrl(null); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            )}
            {attachedAudio && (
              <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground">
                <Mic className="w-3.5 h-3.5 text-honey" />
                <span className="max-w-[200px] truncate">{attachedAudio.name}</span>
                <button
                  onClick={() => { setAttachedAudio(null); if (audioInputRef.current) audioInputRef.current.value = ""; }}
                  className="ml-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex gap-2 items-end max-w-4xl mx-auto">
          {/* Media attach buttons */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="w-9 h-9 rounded-xl border border-border bg-muted hover:border-primary/50 hover:bg-muted/80 flex items-center justify-center transition-all text-muted-foreground hover:text-honey"
              title="Attach image"
            >
              <Image className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="w-9 h-9 rounded-xl border border-border bg-muted hover:border-primary/50 hover:bg-muted/80 flex items-center justify-center transition-all text-muted-foreground hover:text-honey"
              title="Attach audio"
            >
              <Mic className="w-4 h-4" />
            </button>
          </div>

          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Beeyield AI anything about bees, honey, diseases, pollination, research..."
            className="flex-1 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all resize-none min-h-[48px] max-h-[140px]"
            rows={1}
            disabled={isLoading}
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={(!input.trim() && !attachedImage && !attachedAudio) || isLoading}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-amber text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>

        {/* Hidden file inputs */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/m4a,audio/*"
          className="hidden"
          onChange={handleAudioSelect}
        />

        <p className="text-center text-xs text-muted-foreground mt-2 max-w-4xl mx-auto">
          Beeyield AI — Specialized exclusively in bees, honey, apiculture, and pollination science
        </p>
      </div>
    </div>
  );
}
