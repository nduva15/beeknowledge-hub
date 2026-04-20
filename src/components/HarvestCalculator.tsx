import { useState } from "react";
import { X, Calculator, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import MarkdownRenderer from "@/components/MarkdownRenderer";

const CROP_OPTIONS = [
  "Almonds (CA)", "Apples", "Blueberries (highbush)", "Cranberries", "Avocado (Hass)",
  "Sunflower (hybrid seed)", "Canola/Oilseed Rape", "Watermelon", "Cucumber", "Strawberry",
  "Coffee (Arabica)", "Macadamia", "Mango", "Sidr", "Mixed wildflower / honey only",
];

const FRAME_TYPES = [
  { name: "Langstroth deep", kgPerFrame: 2.5 },
  { name: "Langstroth medium", kgPerFrame: 1.6 },
  { name: "Langstroth shallow", kgPerFrame: 1.1 },
  { name: "National deep", kgPerFrame: 1.8 },
  { name: "Dadant deep", kgPerFrame: 3.2 },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HarvestCalculator({ isOpen, onClose }: Props) {
  const [hives, setHives] = useState(10);
  const [acres, setAcres] = useState(0);
  const [crop, setCrop] = useState(CROP_OPTIONS[0]);
  const [frameType, setFrameType] = useState(FRAME_TYPES[0].name);
  const [framesPerHive, setFramesPerHive] = useState(8);
  const [fillPct, setFillPct] = useState(75);
  const [hhi, setHhi] = useState(80);
  const [region, setRegion] = useState("Kenya / East Africa");

  // Local quick estimate
  const frame = FRAME_TYPES.find((f) => f.name === frameType)!;
  const grossPerHive = frame.kgPerFrame * framesPerHive * (fillPct / 100);
  const reserveByRegion: Record<string, number> = {
    "Kenya / East Africa": 6,
    "Subtropical": 10,
    "Temperate (US/EU)": 22,
  };
  const reserve = reserveByRegion[region] ?? 8;
  const netPerHive = Math.max(0, grossPerHive - reserve);
  const ethicalPerHive = Math.min(0.5 * grossPerHive, netPerHive);
  const colonyHealth = hhi / 100;
  const apiaryHarvest = ethicalPerHive * hives * colonyHealth;

  // AI forecast
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  const buildPrompt = () =>
    `Use the BeeYield Harvest Math (Section 18) and Pollination PSI v2 model (Section 18) to produce a fully worked numeric forecast for the following operation. Show every formula step. Apply the 50/50 ethical harvest rule. Then add a Pollination Saturation Index assessment for the listed crop, recommended colonies vs supplied colonies, and a 7-bullet action plan.\n\n` +
    `INPUTS:\n` +
    `- Hive count: ${hives}\n` +
    `- Crop / forage: ${crop}\n` +
    `- Acreage of crop: ${acres} acres\n` +
    `- Frame type: ${frameType} (${frame.kgPerFrame} kg/capped frame)\n` +
    `- Honey frames per hive: ${framesPerHive}\n` +
    `- Average frame fill (capped %): ${fillPct}%\n` +
    `- Hive Health Index (HHI 0–100): ${hhi}\n` +
    `- Region: ${region}\n\n` +
    `Required output sections (markdown): ## Executive Summary, ## Situation Assessment, ## Recommendations (Prioritized), ## Implementation Plan, ## Risks & Mitigations, ## Metrics to Track, ## Sources & Assumptions.`;

  const runAI = async () => {
    setAiLoading(true);
    setAiText("");
    setAiOpen(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/beegpt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: buildPrompt() }],
        }),
      });
      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({}));
        toast.error(err.error || `Error ${resp.status}`);
        setAiLoading(false);
        return;
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      let acc = "";
      while (!done) {
        const { done: rd, value } = await reader.read();
        if (rd) break;
        buf += decoder.decode(value, { stream: true });
        let nl;
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
            if (c) { acc += c; setAiText(acc); }
          } catch { /* partial */ }
        }
      }
    } catch {
      toast.error("Failed to reach Beeyield AI");
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto custom-scroll">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calculator className="w-7 h-7 text-honey" />
            <div>
              <h1 className="font-display text-2xl font-bold text-honey">Harvest Calculator</h1>
              <p className="text-xs text-muted-foreground">BeeYield Harvest Math • Frame yield × HHI × 50/50 ethical rule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-border hover:border-primary/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 rounded-xl border border-border bg-muted/30">
          <Field label="Hive count">
            <input type="number" min={1} value={hives} onChange={(e) => setHives(Math.max(1, +e.target.value || 1))} className={inputCls} />
          </Field>
          <Field label="Acreage (crop forage)">
            <input type="number" min={0} value={acres} onChange={(e) => setAcres(Math.max(0, +e.target.value || 0))} className={inputCls} />
          </Field>
          <Field label="Crop / forage type">
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className={inputCls}>
              {CROP_OPTIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Frame type">
            <select value={frameType} onChange={(e) => setFrameType(e.target.value)} className={inputCls}>
              {FRAME_TYPES.map((f) => <option key={f.name}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Honey frames per hive">
            <input type="number" min={1} max={30} value={framesPerHive} onChange={(e) => setFramesPerHive(Math.max(1, +e.target.value || 1))} className={inputCls} />
          </Field>
          <Field label={`Frame fill capped: ${fillPct}%`}>
            <input type="range" min={0} max={100} value={fillPct} onChange={(e) => setFillPct(+e.target.value)} className="w-full accent-honey" />
          </Field>
          <Field label={`Hive Health Index (HHI): ${hhi}`}>
            <input type="range" min={0} max={100} value={hhi} onChange={(e) => setHhi(+e.target.value)} className="w-full accent-honey" />
          </Field>
          <Field label="Region (winter reserve)">
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={inputCls}>
              <option>Kenya / East Africa</option>
              <option>Subtropical</option>
              <option>Temperate (US/EU)</option>
            </select>
          </Field>
        </div>

        {/* Quick local estimate */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Stat label="Gross / hive" value={`${grossPerHive.toFixed(1)} kg`} />
          <Stat label="Reserve held back" value={`${reserve} kg`} />
          <Stat label="Ethical / hive" value={`${ethicalPerHive.toFixed(1)} kg`} highlight />
          <Stat label="Apiary total (× HHI)" value={`${apiaryHarvest.toFixed(0)} kg`} highlight />
        </div>

        <div className="p-4 rounded-xl border border-border bg-card mb-6 text-sm text-muted-foreground font-mono space-y-1">
          <div>H_frame = {frame.kgPerFrame} kg × ({fillPct}%/100) = <span className="text-foreground">{(frame.kgPerFrame * fillPct / 100).toFixed(2)} kg/frame</span></div>
          <div>H_gross/hive = {framesPerHive} × {(frame.kgPerFrame * fillPct / 100).toFixed(2)} = <span className="text-foreground">{grossPerHive.toFixed(1)} kg</span></div>
          <div>Reserve ({region}) = {reserve} kg → Net = <span className="text-foreground">{netPerHive.toFixed(1)} kg</span></div>
          <div>Ethical (50/50 rule) = min(50% × gross, net) = <span className="text-honey font-bold">{ethicalPerHive.toFixed(1)} kg/hive</span></div>
          <div>Apiary = {ethicalPerHive.toFixed(1)} × {hives} × ({hhi}/100) = <span className="text-honey font-bold">{apiaryHarvest.toFixed(0)} kg</span></div>
        </div>

        <button
          onClick={runAI}
          disabled={aiLoading}
          className="w-full px-4 py-3 rounded-xl bg-gradient-amber text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all mb-4"
        >
          {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {aiLoading ? "Beeyield AI is forecasting..." : "Generate Full AI Forecast (Beeyield AI)"}
        </button>

        {aiOpen && (
          <div className="p-5 rounded-xl border border-honey/30 bg-card">
            <h3 className="font-display text-base font-bold text-honey mb-3">Beeyield AI Forecast</h3>
            {aiText ? (
              <MarkdownRenderer content={aiText} />
            ) : (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Streaming worked forecast...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "border-honey/40 bg-honey/5" : "border-border bg-muted/30"}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-xl font-bold ${highlight ? "text-honey" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
