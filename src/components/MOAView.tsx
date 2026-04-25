import { useEffect, useState, useCallback } from "react";
import { X, Layers, MapPin, Flower2, Plane, Calculator, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Polygon, Marker, Circle, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { useDeviceId } from "@/hooks/use-device-id";

// Crop foraging radii (m) — must match HivePlacementMap
const CROP_RADIUS: Record<string, number> = {
  "Almonds": 800, "Apples": 600, "Blueberries": 500, "Avocado": 700,
  "Sunflower": 1200, "Coffee": 600, "Mango": 700, "Macadamia": 800, "Sidr": 1500,
};

const hiveIcon = L.divIcon({
  html: '<div style="background:hsl(38,92%,50%);width:18px;height:18px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,0.5)"></div>',
  className: "", iconSize: [18, 18], iconAnchor: [9, 9],
});

type Run = {
  id: string; crop: string; region: string; hives: number; acres: number;
  hhi: number; site_layout: { polygon?: [number, number][]; hives?: [number, number][]; crop?: string } | null;
};
type Bloom = { id: string; crop: string; intensity: number; bloom_start: string | null; peak_bloom: string | null; bloom_end: string | null };
type Flight = { id: string; hive_label: string; bees_per_minute: number; pollen_loads: number; florage_source: string | null; observed_at: string };

export default function MOAView({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const deviceId = useDeviceId();
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [blooms, setBlooms] = useState<Bloom[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, b, f] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("harvest_runs").select("id,crop,region,hives,acres,hhi,site_layout").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(20),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("bloom_observations").select("*").eq("device_id", deviceId).order("created_at", { ascending: false }).limit(20),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any).from("bee_flight_logs").select("*").eq("device_id", deviceId).order("observed_at", { ascending: false }).limit(20),
    ]);
    if (r.data) {
      setRuns(r.data);
      if (r.data.length && !selectedRunId) setSelectedRunId(r.data[0].id);
    }
    if (b.data) setBlooms(b.data);
    if (f.data) setFlights(f.data);
    setLoading(false);
  }, [deviceId, selectedRunId]);

  useEffect(() => { if (isOpen) load(); }, [isOpen, load]);

  if (!isOpen) return null;

  const run = runs.find((r) => r.id === selectedRunId);
  const polygon = run?.site_layout?.polygon || [];
  const hives = run?.site_layout?.hives || [];
  const crop = run?.site_layout?.crop || run?.crop || "Almonds";
  const radius = CROP_RADIUS[crop.split(" ")[0]] || 700;
  const center: [number, number] = polygon.length ? polygon[0] : hives[0] || [-2.4078, 37.9658];

  const cropBlooms = blooms.filter((b) => b.crop.toLowerCase().includes(crop.toLowerCase().split(" ")[0]));
  const totalBeesPerMin = flights.reduce((s, f) => s + f.bees_per_minute, 0);
  const avgPollen = flights.length ? Math.round(flights.reduce((s, f) => s + f.pollen_loads, 0) / flights.length) : 0;
  const coverageM2 = hives.length * Math.PI * radius * radius;
  const acreM2 = (run?.acres || 0) * 4046.86;
  const coveragePct = acreM2 > 0 ? Math.min(100, (coverageM2 / acreM2) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-hidden flex flex-col">
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-honey" />
          <div>
            <h1 className="font-display text-lg font-bold text-honey">Multi-Objective Apiary View</h1>
            <p className="text-xs text-muted-foreground">Live map · bloom phenology · bee flight activity · pollination coverage — all synced to a saved run</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={selectedRunId} onChange={(e) => setSelectedRunId(e.target.value)} className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm">
            <option value="">— select run —</option>
            {runs.map((r) => <option key={r.id} value={r.id}>{r.crop} · {r.region} · {r.hives}h</option>)}
          </select>
          <button onClick={onClose} className="w-9 h-9 rounded-lg border border-border hover:border-primary/50 flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-honey" /></div>
      ) : !run ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-6 text-center">
          No saved harvest runs yet. Save a run from the Harvest Calculator to load the MOA view.
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-5 overflow-hidden">
          {/* Left: Map */}
          <div className="md:col-span-3 relative border-r border-border">
            <MapContainer center={center} zoom={15} style={{ width: "100%", height: "100%" }}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri Satellite"
              />
              {polygon.length >= 3 && <Polygon positions={polygon} pathOptions={{ color: "#facc15", fillOpacity: 0.15 }} />}
              {hives.map((h, i) => (
                <Marker key={i} position={h} icon={hiveIcon}>
                  <Popup>Hive {i + 1}<br />Foraging radius: {radius}m</Popup>
                </Marker>
              ))}
              {hives.map((h, i) => (
                <Circle key={`r${i}`} center={h} radius={radius} pathOptions={{ color: "#22c55e", fillOpacity: 0.05, weight: 1 }} />
              ))}
            </MapContainer>
            <div className="absolute bottom-3 left-3 z-[1000] bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs">
              <b className="text-honey">{crop}</b> · {hives.length} hives · {radius}m radius · <b className="text-foreground">{coveragePct.toFixed(0)}%</b> coverage
            </div>
          </div>

          {/* Right: Synced panels */}
          <div className="md:col-span-2 overflow-y-auto custom-scroll p-4 space-y-4 bg-muted/10">
            {/* Coverage */}
            <Panel icon={<Calculator className="w-4 h-4 text-honey" />} title="Pollination Coverage">
              <Stat label="Hives placed" value={`${hives.length}`} />
              <Stat label="Field area" value={`${run.acres} ac (${acreM2.toFixed(0)} m²)`} />
              <Stat label="Single-hive area" value={`${(Math.PI * radius * radius / 10000).toFixed(2)} ha`} />
              <Stat label="Total coverage" value={`${(coverageM2 / 10000).toFixed(2)} ha`} />
              <Stat label="Coverage %" value={`${coveragePct.toFixed(1)}%`} highlight={coveragePct >= 80} />
              <Stat label="HHI score" value={`${run.hhi}/100`} highlight={run.hhi >= 75} />
            </Panel>

            {/* Bloom phenology synced to crop */}
            <Panel icon={<Flower2 className="w-4 h-4 text-honey" />} title={`Bloom Phenology — ${crop}`}>
              {cropBlooms.length === 0 ? (
                <p className="text-xs text-muted-foreground">No bloom observations recorded for this crop yet.</p>
              ) : cropBlooms.slice(0, 3).map((b) => (
                <div key={b.id} className="text-xs space-y-0.5 pb-2 border-b border-border last:border-0">
                  <div className="font-semibold text-foreground">Intensity {b.intensity}%</div>
                  <div className="text-muted-foreground">start {b.bloom_start || "—"} · peak {b.peak_bloom || "—"} · end {b.bloom_end || "—"}</div>
                </div>
              ))}
            </Panel>

            {/* Bee flight activity */}
            <Panel icon={<Plane className="w-4 h-4 text-honey" />} title="Bee Flight Activity">
              <Stat label="Total bees/min (all hives)" value={`${totalBeesPerMin}`} />
              <Stat label="Avg pollen loads" value={`${avgPollen}`} />
              <Stat label="Recent observations" value={`${flights.length}`} />
              {flights.slice(0, 3).map((f) => (
                <div key={f.id} className="text-xs pt-2 border-t border-border space-y-0.5">
                  <div className="font-semibold text-foreground">{f.hive_label} · {f.bees_per_minute}/min</div>
                  <div className="text-muted-foreground">{f.florage_source || "—"} · {new Date(f.observed_at).toLocaleDateString()}</div>
                </div>
              ))}
            </Panel>

            {/* Run summary */}
            <Panel icon={<MapPin className="w-4 h-4 text-honey" />} title="Run Summary">
              <Stat label="Crop" value={run.crop} />
              <Stat label="Region" value={run.region} />
              <Stat label="Apiary" value={`${run.hives} hives · ${run.acres} ac`} />
              <Stat label="HHI" value={`${run.hhi}/100`} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">{icon}<h3 className="font-display text-sm font-bold text-foreground">{title}</h3></div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-semibold ${highlight ? "text-honey" : "text-foreground"}`}>{value}</span>
    </div>
  );
}
