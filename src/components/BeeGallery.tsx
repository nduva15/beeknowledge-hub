import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Bug } from "lucide-react";

interface BeeSpecies {
  name: string;
  scientific: string;
  description: string;
  habitat: string;
  emoji: string;
  traits: string[];
}

const BEE_SPECIES: BeeSpecies[] = [
  {
    name: "Western Honey Bee",
    scientific: "Apis mellifera",
    description: "The most widely managed bee species in the world, responsible for the majority of commercial honey production and crop pollination.",
    habitat: "Worldwide (managed colonies)",
    emoji: "🐝",
    traits: ["Social", "Honey producer", "Wax builder", "Waggle dance"],
  },
  {
    name: "Eastern Honey Bee",
    scientific: "Apis cerana",
    description: "Native to southern and southeastern Asia. More resistant to Varroa mites than its western counterpart due to co-evolution.",
    habitat: "South & Southeast Asia",
    emoji: "🐝",
    traits: ["Varroa resistant", "Smaller colonies", "Tropical adapted"],
  },
  {
    name: "Giant Honey Bee",
    scientific: "Apis dorsata",
    description: "The largest honey bee species, building single massive combs on tree branches and cliff faces. Known for aggressive defensive behavior.",
    habitat: "South & Southeast Asia",
    emoji: "🐝",
    traits: ["Open-air nesting", "Migratory", "Aggressive defense", "Large size"],
  },
  {
    name: "Dwarf Honey Bee",
    scientific: "Apis florea",
    description: "One of the smallest honey bee species. Builds a single small comb on tree branches. Important pollinator in tropical ecosystems.",
    habitat: "Southern Asia",
    emoji: "🐝",
    traits: ["Tiny size", "Single comb", "Gentle temperament"],
  },
  {
    name: "Bumblebee",
    scientific: "Bombus spp.",
    description: "Fuzzy, robust bees essential for buzz pollination. They can fly in cooler temperatures and lower light than most bees.",
    habitat: "Temperate regions worldwide",
    emoji: "🐝",
    traits: ["Buzz pollination", "Cold tolerant", "Fuzzy body", "Short tongue"],
  },
  {
    name: "Mason Bee",
    scientific: "Osmia spp.",
    description: "Solitary bees that are exceptionally efficient pollinators — a single mason bee can do the work of 100 honey bees for fruit trees.",
    habitat: "North America, Europe, Asia",
    emoji: "🐝",
    traits: ["Solitary", "Super pollinator", "Mud nester", "Non-aggressive"],
  },
  {
    name: "Leafcutter Bee",
    scientific: "Megachile spp.",
    description: "Named for their habit of cutting circular pieces from leaves to construct their nests. Important pollinators for alfalfa and wildflowers.",
    habitat: "Worldwide",
    emoji: "🐝",
    traits: ["Leaf cutting", "Solitary", "Alfalfa pollinator"],
  },
  {
    name: "Carpenter Bee",
    scientific: "Xylocopa spp.",
    description: "Large, robust bees that bore into wood to create nests. Often mistaken for bumblebees but have a shiny, hairless abdomen.",
    habitat: "Worldwide (tropical & subtropical)",
    emoji: "🐝",
    traits: ["Wood boring", "Solitary", "Large body", "Buzz pollination"],
  },
  {
    name: "Stingless Bee",
    scientific: "Meliponini tribe",
    description: "Tropical bees that produce a unique, tangy honey called pot honey. They have vestigial stingers and defend by biting instead.",
    habitat: "Tropical regions worldwide",
    emoji: "🐝",
    traits: ["No sting", "Pot honey", "Resin collector", "Tropical"],
  },
  {
    name: "Sweat Bee",
    scientific: "Halictidae family",
    description: "Small, often metallic-colored bees attracted to human perspiration. They are important pollinators of wildflowers and crops.",
    habitat: "Worldwide",
    emoji: "🐝",
    traits: ["Metallic colors", "Tiny size", "Ground nester", "Attracted to sweat"],
  },
  {
    name: "Mining Bee",
    scientific: "Andrena spp.",
    description: "One of the largest genera of bees, with over 1,500 species. They nest in the ground and are important early-spring pollinators.",
    habitat: "Northern Hemisphere",
    emoji: "🐝",
    traits: ["Ground nester", "Spring active", "Solitary", "Gentle"],
  },
  {
    name: "Orchid Bee",
    scientific: "Euglossini tribe",
    description: "Brilliantly metallic tropical bees. Males collect fragrant compounds from orchids to attract females — a remarkable co-evolutionary relationship.",
    habitat: "Central & South America",
    emoji: "🐝",
    traits: ["Iridescent", "Orchid pollinator", "Long tongue", "Fragrance collector"],
  },
];

interface BeeGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BeeGallery({ isOpen, onClose }: BeeGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const selected = selectedIndex !== null ? BEE_SPECIES[selectedIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Bug className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Bee Species Gallery</h2>
              <p className="text-xs text-muted-foreground">{BEE_SPECIES.length} species documented</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {selected ? (
          /* Detail View */
          <div className="p-6">
            <button
              onClick={() => setSelectedIndex(null)}
              className="text-xs text-primary hover:underline mb-4 flex items-center gap-1"
            >
              <ChevronLeft className="w-3 h-3" /> Back to all species
            </button>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex-shrink-0 w-full sm:w-48 h-48 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border flex items-center justify-center text-7xl">
                {selected.emoji}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">{selected.name}</h3>
                  <p className="text-sm text-primary italic">{selected.scientific}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{selected.description}</p>
                <div>
                  <span className="text-xs font-semibold text-foreground">Habitat:</span>
                  <span className="text-xs text-muted-foreground ml-1">{selected.habitat}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.traits.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    disabled={selectedIndex === 0}
                    onClick={() => setSelectedIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3 h-3" /> Previous
                  </button>
                  <button
                    disabled={selectedIndex === BEE_SPECIES.length - 1}
                    onClick={() => setSelectedIndex((i) => (i !== null && i < BEE_SPECIES.length - 1 ? i + 1 : i))}
                    className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)] custom-scroll">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {BEE_SPECIES.map((bee, i) => (
                <button
                  key={bee.scientific}
                  onClick={() => setSelectedIndex(i)}
                  className="text-left p-4 rounded-xl border border-border hover:border-primary/50 bg-card hover:bg-muted transition-all group"
                >
                  <div className="text-4xl mb-2">{bee.emoji}</div>
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {bee.name}
                  </h4>
                  <p className="text-xs text-muted-foreground italic mt-0.5">{bee.scientific}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{bee.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
