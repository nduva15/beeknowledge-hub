import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, ArrowLeft, Calculator, Sparkles, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MarkdownRenderer from "@/components/MarkdownRenderer";

type SharedRunRow = {
  id: string;
  hives: number;
  acres: number;
  crop: string;
  frame_type: string;
  fill_pct: number;
  hhi: number;
  region: string;
  local_estimate_kg: number | null;
  ai_forecast: string | null;
  notes: string | null;
  created_at: string;
};

export default function SharedRun() {
  const { id } = useParams<{ id: string }>();
  const [run, setRun] = useState<SharedRunRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("harvest_runs")
        .select("id,hives,acres,crop,frame_type,fill_pct,hhi,region,local_estimate_kg,ai_forecast,notes,created_at")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      if (error || !data) {
        setError("This shared harvest run could not be found. The link may be invalid or the run was deleted.");
      } else {
        setRun(data as SharedRunRow);
      }
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  return (
    <div className="min-h-screen bg-background">
      {/* Branded header */}
      <header className="border-b border-border bg-gradient-amber">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-background/20 backdrop-blur flex items-center justify-center">
              <Calculator className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-primary-foreground">BeeYield Harvest Forecast</h1>
              <p className="text-xs text-primary-foreground/80">Shared read-only report</p>
            </div>
          </div>
          <Link
            to="/"
            className="px-3 h-9 rounded-lg bg-background/15 hover:bg-background/25 text-primary-foreground text-sm flex items-center gap-1.5 backdrop-blur"
          >
            <ArrowLeft className="w-4 h-4" /> Open BeeYield
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground py-20 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading shared run...
          </div>
        )}

        {error && (
          <div className="p-6 rounded-xl border border-destructive/40 bg-destructive/5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-foreground mb-1">Run not available</h2>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        )}

        {run && (
          <>
            <div className="mb-2 text-xs text-muted-foreground">
              Forecast generated {new Date(run.created_at).toLocaleString()}
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-4">
              {run.crop} · {run.hives} hives
            </h2>

            {/* Inputs */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Stat label="Hives" value={String(run.hives)} />
              <Stat label="Acreage" value={`${run.acres}`} />
              <Stat label="Frame type" value={run.frame_type} />
              <Stat label="Frame fill" value={`${run.fill_pct}%`} />
              <Stat label="HHI" value={`${run.hhi}/100`} highlight />
              <Stat label="Region" value={run.region} />
              <Stat
                label="Apiary harvest"
                value={`${Number(run.local_estimate_kg ?? 0).toFixed(0)} kg`}
                highlight
              />
              <Stat label="Per hive (avg)" value={`${(Number(run.local_estimate_kg ?? 0) / Math.max(1, run.hives)).toFixed(1)} kg`} />
            </section>

            {/* Notes */}
            {run.notes && run.notes.trim().length > 0 && (
              <section className="mb-6 p-4 rounded-xl border border-honey/30 bg-honey/5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-honey mb-1.5">Notes from beekeeper</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{run.notes}</p>
              </section>
            )}

            {/* AI forecast */}
            {run.ai_forecast ? (
              <section className="p-5 rounded-xl border border-honey/30 bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-honey" />
                  <h3 className="font-display text-base font-bold text-honey">Beeyield AI Forecast</h3>
                </div>
                <MarkdownRenderer content={run.ai_forecast} />
              </section>
            ) : (
              <section className="p-5 rounded-xl border border-border bg-muted/20 text-sm text-muted-foreground">
                No AI forecast was attached to this run — only the local numeric estimate was saved.
              </section>
            )}

            <footer className="mt-8 pt-6 border-t border-border text-xs text-muted-foreground text-center">
              This is a read-only shared forecast generated by the BeeYield platform. Visit{" "}
              <Link to="/" className="text-honey hover:underline">BeeYield</Link> to run your own harvest forecast.
            </footer>
          </>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "border-honey/40 bg-honey/5" : "border-border bg-muted/30"}`}>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`font-display text-lg font-bold ${highlight ? "text-honey" : "text-foreground"}`}>{value}</div>
    </div>
  );
}
