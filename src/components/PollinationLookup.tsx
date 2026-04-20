import { useMemo, useState } from "react";
import { X, Sprout, Flower2 } from "lucide-react";

type Crop = {
  name: string;
  perAcre: [number, number];
  perHa: [number, number];
  framesMin: number;
  bloomDays: [number, number];
  notes: string;
};

const CROPS: Crop[] = [
  { name: "Almonds (CA)", perAcre: [2.0, 2.5], perHa: [5.0, 6.2], framesMin: 8, bloomDays: [14, 21], notes: "Largest US managed pollination event. A-grade frames mandatory." },
  { name: "Apples", perAcre: [1.0, 2.0], perHa: [2.5, 5.0], framesMin: 6, bloomDays: [7, 14], notes: "Cool-weather flyers (mason bees) supplement honey bees." },
  { name: "Blueberries (highbush)", perAcre: [3.0, 4.0], perHa: [7.5, 10.0], framesMin: 8, bloomDays: [14, 21], notes: "Buzz-pollination by bumblebees boosts set." },
  { name: "Cranberries", perAcre: [2.0, 3.0], perHa: [5.0, 7.5], framesMin: 6, bloomDays: [10, 14], notes: "Bog access matters; wet conditions reduce flight." },
  { name: "Avocado (Hass)", perAcre: [1.5, 2.5], perHa: [3.7, 6.2], framesMin: 8, bloomDays: [21, 28], notes: "Dichogamous bloom; needs heavy bee saturation." },
  { name: "Sunflower (hybrid seed)", perAcre: [1.5, 3.0], perHa: [3.7, 7.5], framesMin: 6, bloomDays: [14, 21], notes: "Cross between male/female lines requires high PSI." },
  { name: "Canola / Oilseed Rape", perAcre: [1.0, 2.0], perHa: [2.5, 5.0], framesMin: 6, bloomDays: [21, 28], notes: "Excellent honey crop; risk of neonic exposure." },
  { name: "Watermelon", perAcre: [1.0, 3.0], perHa: [2.5, 7.5], framesMin: 6, bloomDays: [30, 60], notes: "Triploid varieties need higher density." },
  { name: "Cucumber (open field)", perAcre: [1.0, 2.5], perHa: [2.5, 6.2], framesMin: 6, bloomDays: [30, 45], notes: "Multiple visits per flower needed for shape." },
  { name: "Strawberry", perAcre: [1.0, 2.5], perHa: [2.5, 6.2], framesMin: 6, bloomDays: [21, 35], notes: "Under-pollination causes deformed berries." },
  { name: "Coffee (Arabica)", perAcre: [1.0, 2.0], perHa: [2.5, 5.0], framesMin: 5, bloomDays: [7, 14], notes: "Boosts yield ~20%; short intense bloom." },
  { name: "Macadamia", perAcre: [4.0, 8.0], perHa: [10, 20], framesMin: 8, bloomDays: [21, 35], notes: "Dense, racemose bloom — highest stocking rate." },
  { name: "Mango", perAcre: [1.0, 2.0], perHa: [2.5, 5.0], framesMin: 6, bloomDays: [14, 28], notes: "Flies and bees co-pollinate; warm weather critical." },
  { name: "Sidr (Yemen / Kenya)", perAcre: [0.5, 1.0], perHa: [1.2, 2.5], framesMin: 8, bloomDays: [30, 45], notes: "Premium honey crop ($40–120/kg)." },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function PollinationLookup({ isOpen, onClose }: Props) {
  const [cropName, setCropName] = useState(CROPS[0].name);
  const [acres, setAcres] = useState<number>(10);
  const [unit, setUnit] = useState<"acre" | "ha">("acre");

  const crop = useMemo(() => CROPS.find((c) => c.name === cropName)!, [cropName]);

  const result = useMemo(() => {
    const range = unit === "acre" ? crop.perAcre : crop.perHa;
    const colMin = Math.ceil(range[0] * acres);
    const colMax = Math.ceil(range[1] * acres);
    const framesMin = colMin * crop.framesMin;
    const framesMax = colMax * crop.framesMin;
    // ~30M visits per acre target (almond benchmark scaled)
    const visitsPerAcre = 30_000_000;
    const acresEquivalent = unit === "acre" ? acres : acres * 2.471;
    const totalVisits = Math.round(visitsPerAcre * acresEquivalent);
    // 55,000 trips/colony/day at peak
    const tripsPerDay = colMax * 55_000;
    const daysToSaturate = Math.ceil(totalVisits / tripsPerDay);
    return { colMin, colMax, framesMin, framesMax, totalVisits, tripsPerDay, daysToSaturate };
  }, [crop, acres, unit]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Flower2 className="w-7 h-7 text-honey" />
            <div>
              <h1 className="font-display text-2xl font-bold text-honey">Pollination Stocking Density Lookup</h1>
              <p className="text-xs text-muted-foreground">BeeYield PSI v2 model • 14 crops • Frames-per-acre math</p>
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

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 rounded-xl border border-border bg-muted/30">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Crop</label>
            <select
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
            >
              {CROPS.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Area ({unit === "acre" ? "acres" : "hectares"})
            </label>
            <input
              type="number"
              min={0.1}
              step={0.5}
              value={acres}
              onChange={(e) => setAcres(Math.max(0.1, Number(e.target.value) || 0))}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:border-primary/50 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Unit</label>
            <div className="flex gap-2">
              <button
                onClick={() => setUnit("acre")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${unit === "acre" ? "bg-honey/20 border-honey text-honey" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                Acres
              </button>
              <button
                onClick={() => setUnit("ha")}
                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition-all ${unit === "ha" ? "bg-honey/20 border-honey text-honey" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                Hectares
              </button>
            </div>
          </div>
        </div>

        {/* Result cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="p-4 rounded-xl border border-honey/30 bg-honey/5">
            <div className="text-xs text-muted-foreground mb-1">Colonies needed</div>
            <div className="font-display text-2xl font-bold text-honey">{result.colMin}–{result.colMax}</div>
            <div className="text-xs text-muted-foreground mt-1">strong A-grade hives</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Frames of bees</div>
            <div className="font-display text-2xl font-bold text-foreground">{result.framesMin}–{result.framesMax}</div>
            <div className="text-xs text-muted-foreground mt-1">min {crop.framesMin} per colony</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Bloom window</div>
            <div className="font-display text-2xl font-bold text-foreground">{crop.bloomDays[0]}–{crop.bloomDays[1]}d</div>
            <div className="text-xs text-muted-foreground mt-1">deploy 2 days pre-bloom</div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Days to PSI = 1.0</div>
            <div className="font-display text-2xl font-bold text-foreground">~{result.daysToSaturate}d</div>
            <div className="text-xs text-muted-foreground mt-1">at peak foraging</div>
          </div>
        </div>

        {/* Math breakdown */}
        <div className="p-5 rounded-xl border border-border bg-card mb-6">
          <h3 className="font-display text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Sprout className="w-4 h-4 text-honey" /> Worked calculation
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground font-mono">
            <div>Stocking density: <span className="text-foreground">{crop.perAcre[0]}–{crop.perAcre[1]} colonies/acre</span> ({crop.perHa[0]}–{crop.perHa[1]} per ha)</div>
            <div>Area: <span className="text-foreground">{acres} {unit === "acre" ? "acres" : "ha"}</span></div>
            <div>→ Colonies = {acres} × ({crop.perAcre[0]}–{crop.perAcre[1]}) = <span className="text-honey font-bold">{result.colMin}–{result.colMax}</span></div>
            <div>→ Frames of bees = colonies × {crop.framesMin} = <span className="text-honey font-bold">{result.framesMin}–{result.framesMax}</span></div>
            <div>→ Visits required ≈ {(result.totalVisits / 1_000_000).toFixed(1)}M (30M / acre target)</div>
            <div>→ Daily forager-trips at peak = {result.colMax} × 55,000 = <span className="text-foreground">{result.tripsPerDay.toLocaleString()}</span></div>
            <div>→ Days to PSI = 1.0: <span className="text-honey font-bold">~{result.daysToSaturate} days</span></div>
          </div>
        </div>

        {/* Notes */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">Crop notes — {crop.name}:</span> {crop.notes}
        </div>
      </div>
    </div>
  );
}
