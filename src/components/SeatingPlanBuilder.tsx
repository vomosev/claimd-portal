// dashboard/components/SeatingPlanBuilder.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import {
  Plus, Trash2, Save, ArrowLeft, RefreshCw,
  LayoutGrid, Circle, Rows3, Theater,
  Building2, Music, Trophy,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ── Types ──────────────────────────────────────────────────────────────────────
interface SectionPreset {
  name:        string;
  color:       string;
  rows:        readonly string[];
  seatsPerRow: number;
}

// ── Natural sort helper ────────────────────────────────────────────────────────
// Sorts "A1, A2, A10" correctly instead of "A1, A10, A2"
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

// ── Venue layout presets ───────────────────────────────────────────────────────
const VENUE_PRESETS = [
  {
    id:          "theatre",
    label:       "Theatre / Concert Hall",
    icon:        Theater,
    description: "Curved rows facing a stage",
    hasStage:    true,
    sections: [
      { name: "Stalls",       color: "#5871A7", rows: ["A","B","C","D","E","F","G","H"], seatsPerRow: 20 },
      { name: "Royal Circle", color: "#8B5CF6", rows: ["A","B","C","D","E"],            seatsPerRow: 18 },
      { name: "Grand Circle", color: "#3B82F6", rows: ["A","B","C","D"],               seatsPerRow: 16 },
      { name: "Gallery",      color: "#610bf5", rows: ["A","B","C"],                   seatsPerRow: 14 },
    ],
  },
  {
    id:          "stadium",
    label:       "Football Stadium",
    icon:        Trophy,
    description: "Four stands surrounding a pitch",
    hasStage:    false,
    sections: [
      { name: "North Stand", color: "#5871A7", rows: ["A","B","C","D","E","F","G","H"], seatsPerRow: 30 },
      { name: "South Stand", color: "#8B5CF6", rows: ["A","B","C","D","E","F","G","H"], seatsPerRow: 30 },
      { name: "East Stand",  color: "#3B82F6", rows: ["A","B","C","D","E","F","G","H"], seatsPerRow: 20 },
      { name: "West Stand",  color: "#610bf5", rows: ["A","B","C","D","E","F","G","H"], seatsPerRow: 20 },
    ],
  },
  {
    id:          "arena",
    label:       "Arena / Amphitheatre",
    icon:        Music,
    description: "Floor + tiered seating around a central stage",
    hasStage:    true,
    sections: [
      { name: "Floor",     color: "#5871A7", rows: ["A","B","C","D","E"], seatsPerRow: 25 },
      { name: "Block 100", color: "#8B5CF6", rows: ["A","B","C","D","E"], seatsPerRow: 22 },
      { name: "Block 200", color: "#3B82F6", rows: ["A","B","C","D","E"], seatsPerRow: 20 },
      { name: "Block 300", color: "#610bf5", rows: ["A","B","C","D","E"], seatsPerRow: 18 },
    ],
  },
  {
    id:          "cinema",
    label:       "Cinema / Screening Room",
    icon:        Building2,
    description: "Straight rows facing a screen",
    hasStage:    true,
    sections: [
      { name: "Front",  color: "#5871A7", rows: ["A","B","C"],             seatsPerRow: 14 },
      { name: "Middle", color: "#8B5CF6", rows: ["D","E","F","G","H","I"], seatsPerRow: 16 },
      { name: "Back",   color: "#3B82F6", rows: ["J","K","L","M"],         seatsPerRow: 18 },
    ],
  },
  {
    id:          "conference",
    label:       "Conference / Lecture Hall",
    icon:        Rows3,
    description: "Tiered rows with a central aisle",
    hasStage:    true,
    sections: [
      { name: "Front Rows",  color: "#5871A7", rows: ["1 ","2 ","3 ","4 "],          seatsPerRow: 12 },
      { name: "Middle Rows", color: "#8B5CF6", rows: ["5 ","6 ","7 ","8 ","9 ","10 "], seatsPerRow: 14 },
      { name: "Back Rows",   color: "#3B82F6", rows: ["11 ","12 ","13 ","14 ","15 "], seatsPerRow: 16 },
    ],
  },
  {
    id:          "cabaret",
    label:       "Cabaret / Club",
    icon:        Circle,
    description: "Round tables arranged around a central stage",
    hasStage:    true,
    sections: [
      { name: "Front Tables",  color: "#5871A7", rows: ["T1 ","T2 "],       seatsPerRow: 8 },
      { name: "Middle Tables", color: "#8B5CF6", rows: ["T3 ","T4 ","T5 "], seatsPerRow: 8 },
      { name: "Back Tables",   color: "#3B82F6", rows: ["T6 ","T7 ","T8 "], seatsPerRow: 8 },
    ],
  },
  {
    id:          "custom",
    label:       "Custom / Blank",
    icon:        LayoutGrid,
    description: "Start from scratch",
    hasStage:    false,
    sections:    [],
  },
] as const;

type PresetId = typeof VENUE_PRESETS[number]["id"];

// ── Venue layout diagram (SVG) ────────────────────────────────────────────────
function VenueLayoutDiagram({ presetId }: { presetId: PresetId }) {
  if (presetId === "theatre") return (
    <svg viewBox="0 0 200 140" className="w-full h-28 text-gray-400">
      <rect x="70" y="5" width="60" height="20" rx="3" fill="#5871A7" opacity=".8"/>
      <text x="100" y="19" textAnchor="middle" fontSize="9" fill="white" fontWeight="bold">STAGE</text>
      {[0,1,2,3,4,5,6].map((i) => (
        <ellipse key={i} cx="100" cy={40 + i*13} rx={30 + i*8} ry="5"
          fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.5 - i*0.05} />
      ))}
      <text x="100" y="130" textAnchor="middle" fontSize="8" fill="currentColor">Stalls → Circle → Gallery</text>
    </svg>
  );

  if (presetId === "stadium") return (
    <svg viewBox="0 0 200 160" className="w-full h-28 text-gray-400">
      <rect x="60" y="55" width="80" height="50" rx="4" fill="#16a34a" opacity=".3" stroke="#22c55e"/>
      <text x="100" y="84" textAnchor="middle" fontSize="9" fill="#000000" fontWeight="bold">PITCH</text>
      <rect x="60"  y="10"  width="80" height="38" rx="3" fill="#5871A7" opacity=".4"/>
      <text x="100" y="33" textAnchor="middle" fontSize="8" fill="#000000">North</text>
      <rect x="60"  y="112" width="80" height="38" rx="3" fill="#8B5CF6" opacity=".4"/>
      <text x="100" y="135" textAnchor="middle" fontSize="8" fill="#000000">South</text>
      <rect x="5"   y="55"  width="48" height="50" rx="3" fill="#3B82F6" opacity=".4"/>
      <text x="29"  y="84" textAnchor="middle" fontSize="8" fill="#000000">East</text>
      <rect x="147" y="55"  width="48" height="50" rx="3" fill="#610bf5" opacity=".4"/>
      <text x="171" y="84" textAnchor="middle" fontSize="8" fill="#000000">West</text>
    </svg>
  );

  if (presetId === "arena") return (
    <svg viewBox="0 0 200 160" className="w-full h-28 text-gray-400">
      <ellipse cx="100" cy="80" rx="95" ry="70" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4"/>
      <ellipse cx="100" cy="80" rx="65" ry="48" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4"/>
      <ellipse cx="100" cy="80" rx="35" ry="26" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4"/>
      <ellipse cx="100" cy="80" rx="16" ry="12" fill="#5871A7" opacity=".6"/>
      <text x="100" y="84" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">STAGE</text>
      <text x="100" y="58" textAnchor="middle" fontSize="7" fill="currentColor">Floor</text>
      <text x="100" y="42" textAnchor="middle" fontSize="7" fill="currentColor">100</text>
      <text x="100" y="26" textAnchor="middle" fontSize="7" fill="currentColor">200/300</text>
    </svg>
  );

  if (presetId === "cinema") return (
    <svg viewBox="0 0 200 140" className="w-full h-28 text-gray-400">
      <rect x="20" y="5" width="160" height="12" rx="3" fill="#1e293b" opacity=".8"/>
      <text x="100" y="15" textAnchor="middle" fontSize="8" fill="white">SCREEN</text>
      {[0,1,2,3,4,5,6,7,8,9,10,11].map((i) => (
        <rect key={i} x="20" y={25 + i*9} width="160" height="6" rx="1"
          fill="currentColor" opacity={0.1 + (i > 2 ? 0.08 : 0)} />
      ))}
      <text x="2"   y="35"  fontSize="7" fill="currentColor">A</text>
      <text x="2"   y="62"  fontSize="7" fill="currentColor">D</text>
      <text x="2"   y="98"  fontSize="7" fill="currentColor">J</text>
      <text x="100" y="135" textAnchor="middle" fontSize="7" fill="currentColor">Front → Middle → Back</text>
    </svg>
  );

  if (presetId === "cabaret") return (
    <svg viewBox="0 0 200 160" className="w-full h-28 text-gray-400">
      <ellipse cx="100" cy="75" rx="20" ry="14" fill="#5871A7" opacity=".7"/>
      <text x="100" y="79" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">STAGE</text>
      {([[55,45],[145,45],[30,80],[170,80],[55,110],[145,110],[85,120],[115,120]] as [number,number][]).map(([cx,cy],i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="10" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".6"/>
          {[0,1,2,3,4,5,6,7].map((j) => (
            <circle key={j}
              cx={cx + 8 * Math.cos(j * Math.PI / 4)}
              cy={cy + 8 * Math.sin(j * Math.PI / 4)}
              r="2" fill="currentColor" opacity=".5" />
          ))}
        </g>
      ))}
    </svg>
  );

  if (presetId === "conference") return (
    <svg viewBox="0 0 200 140" className="w-full h-28 text-gray-400">
      <rect x="70" y="5" width="60" height="15" rx="3" fill="#5871A7" opacity=".7"/>
      <text x="100" y="16" textAnchor="middle" fontSize="8" fill="white">PODIUM</text>
      {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map((i) => (
        <g key={i}>
          <rect x="15"  y={28 + i*7} width="80" height="5" rx="1" fill="currentColor" opacity=".15"/>
          <rect x="105" y={28 + i*7} width="80" height="5" rx="1" fill="currentColor" opacity=".15"/>
        </g>
      ))}
      <line x1="100" y1="25" x2="100" y2="130" stroke="currentColor" strokeWidth="1" strokeDasharray="3" opacity=".3"/>
    </svg>
  );

  return (
    <div className="w-full h-28 flex items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center text-gray-400 space-y-1">
        <LayoutGrid size={28} className="mx-auto opacity-50" />
        <p className="text-xs">Custom layout — add sections and seats manually below</p>
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SeatingPlanBuilderProps {
  awardId: string;
}

export default function SeatingPlanBuilder({ awardId }: SeatingPlanBuilderProps) {

  useEffect(() => {
    console.log("[SeatingPlanBuilder] awardId prop:", awardId);
    if (!awardId) console.error("[SeatingPlanBuilder] awardId is missing!");
  }, [awardId]);

  // Plan
  const [planName,       setPlanName]       = useState("");
  const [planDesc,       setPlanDesc]       = useState("");
  const [planImg,        setPlanImg]        = useState("");
  const [planId,         setPlanId]         = useState<number | null>(null);
  const [saving,         setSaving]         = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("custom");
  const [presetApplied,  setPresetApplied]  = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [planHasStage,   setPlanHasStage]   = useState(false);

  // Sections
  const [sections,    setSections]    = useState<any[]>([]);
  const [newSecName,  setNewSecName]  = useState("");
  const [newSecColor, setNewSecColor] = useState("#5871A7");
  const [newSecPrice, setNewSecPrice] = useState("");
  const [newSecCurr,  setNewSecCurr]  = useState("GBP");

  // Seat generator
  const [genSection,  setGenSection]  = useState<number | null>(null);
  const [genRow,      setGenRow]      = useState("A");
  const [genFrom,     setGenFrom]     = useState("1");
  const [genTo,       setGenTo]       = useState("10");
  const [genPrice,    setGenPrice]    = useState("");
  const [generating,  setGenerating]  = useState(false);

  // Seats
  const [seats, setSeats] = useState<any[]>([]);

  const router = useRouter();

  // Auto-select first section in generator when sections load
  useEffect(() => {
    if (sections.length > 0 && genSection === null) {
      setGenSection(sections[0].id);
    }
  }, [sections, genSection]);

  // When the generator section changes, sync row and seat range to preset constraints
  useEffect(() => {
    if (!genSection || !sections.length) return;
    const sec       = sections.find((s) => s.id === genSection);
    const preset    = selectedPreset !== "custom" ? VENUE_PRESETS.find((p) => p.id === selectedPreset) : null;
    const presetSec = preset
      ? (preset.sections as readonly SectionPreset[]).find((ps) => ps.name === sec?.name)
      : null;
    if (!presetSec) return;
    const used  = [...new Set(seats.filter((s) => s.section_id === genSection).map((s) => s.row_label as string))];
    const avail = ([...presetSec.rows] as string[]).filter((r) => !used.includes(r));
    if (avail.length > 0) setGenRow(avail[0]);
    setGenFrom("1");
    setGenTo(String(presetSec.seatsPerRow));
  }, [genSection, sections, selectedPreset]); // intentionally excludes seats to avoid resetting on each generate

  // Keep planHasStage in sync with selected preset (new plans only)
  useEffect(() => {
    if (!planId) {
      const preset = VENUE_PRESETS.find((p) => p.id === selectedPreset);
      setPlanHasStage(preset?.hasStage ?? false);
    }
  }, [selectedPreset, planId]);

  // ── Load existing plan ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!awardId) return;
    const load = async () => {
      try {
        const plans = await fetch(`${API_URL}/seating/plans/${awardId}`)
          .then((r) => r.json());

        if (Array.isArray(plans) && plans.length > 0) {
          const p = plans[0];
          setPlanName(p.name        || "");
          setPlanDesc(p.description || "");
          setPlanImg(p.image_url    || "");
          setPlanId(p.id);
          setPresetApplied(true);

          const venueType = (p.type || p.preset_id) as PresetId | undefined;
          if (venueType) {
            const match = VENUE_PRESETS.find((x) => x.id === venueType);
            setSelectedPreset(venueType);
            setPlanHasStage(match?.hasStage ?? false);
          } else {
            setPlanHasStage(true);
          }

          const detail = await fetch(
            `${API_URL}/seating/plans/${awardId}/${p.id}`
          ).then((r) => r.json());

          setSections(detail.sections || []);
          setSeats(detail.seats       || []);
        }
      } catch (err) {
        console.error("Error loading seating plan:", err);
      }
    };
    load();
  }, [awardId]);

  // ── Refresh ─────────────────────────────────────────────────────────────────
  const refreshSeats = async (explicitPlanId?: number) => {
    const id = explicitPlanId ?? planId;
    if (!id) return;
    try {
      const detail = await fetch(
        `${API_URL}/seating/plans/${awardId}/${id}`
      ).then((r) => r.json());
      setSections(detail.sections || []);
      setSeats(detail.seats       || []);
    } catch (err) {
      console.error("Error refreshing seats:", err);
      toast.error("Could not refresh seat map.");
    }
  };

  // ── Apply venue preset ──────────────────────────────────────────────────────
  const handleApplyPreset = async (id: number) => {
    const preset = VENUE_PRESETS.find((p) => p.id === selectedPreset);
    if (!preset || preset.sections.length === 0) {
      setPresetApplied(true);
      return;
    }

    setApplyingPreset(true);
    try {
      const presetSections = [...preset.sections] as SectionPreset[];

      for (const sec of presetSections) {
        const secRes = await fetch(`${API_URL}/seating/sections`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ plan_id: id, name: sec.name, color: sec.color }),
        });

        if (!secRes.ok) {
          const err = await secRes.json().catch(() => ({}));
          throw new Error(`Failed to create section "${sec.name}": ${err.error || secRes.status}`);
        }

        const secData = await secRes.json();
        const secId   = secData.id;

        if (!secId) {
          throw new Error(`No id returned for section "${sec.name}"`);
        }

        // Generate all rows in this section in parallel - STOPPED AS NOT CREATING ALL OF THE SEATS
        // await Promise.all(
        //   [...sec.rows].map((row) => {
        //     const seatList = Array.from({ length: sec.seatsPerRow }, (_, i) => ({
        //       seat_number: String(i + 1),
        //       label:       `${row}${i + 1}`,
        //       price:       null,
        //     }));

        //     return fetch(`${API_URL}/seating/seats/bulk`, {
        //       method:  "POST",
        //       headers: { "Content-Type": "application/json" },
        //       body:    JSON.stringify({
        //         plan_id:    id,
        //         section_id: secId,
        //         row_label:  row,
        //         seats:      seatList,
        //       }),
        //     }).then((r) => {
        //       if (!r.ok) throw new Error(`Failed to create row ${row} in "${sec.name}"`);
        //       return r.json();
        //     });
        //   })
        // );
      }

      // Fetch using passed id — NOT state planId (which may not have flushed yet)
      const detail = await fetch(
        `${API_URL}/seating/plans/${awardId}/${id}`
      ).then((r) => r.json());

      setSections(detail.sections || []);
      setSeats(detail.seats       || []);
      setPresetApplied(true);
      setPlanHasStage(preset.hasStage);
      toast.success(
        `${preset.label} applied — ${preset.sections.length} sections, ` +
        `${detail.seats?.length ?? 0} seats`
      );
    } catch (err: any) {
      console.error("[handleApplyPreset] Error:", err);
      toast.error("Failed to apply preset: " + (err.message || "Unknown error"));
    } finally {
      setApplyingPreset(false);
    }
  };

  // ── Save / create plan ──────────────────────────────────────────────────────
  const handleSavePlan = async () => {
    if (!planName.trim()) { toast.error("Plan name is required"); return; }
    if (!awardId || awardId === "notfound") {
      toast.error("Award ID is missing.");
      return;
    }

    setSaving(true);
    try {
      if (planId) {
        const res = await fetch(`${API_URL}/seating/plans/${planId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ name: planName, description: planDesc, image_url: planImg }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Server error ${res.status}`);
        }
        toast.success("Plan updated!");
      } else {
        const payload = {
          awardid:     String(awardId),
          name:        planName,
          description: planDesc || null,
          image_url:   planImg  || null,
          preset_id:   selectedPreset,
          type:        selectedPreset,
        };
        const res  = await fetch(`${API_URL}/seating/plans`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

        const newId = data.id;
        setPlanId(newId);
        toast.success("Plan created!");

        if (selectedPreset !== "custom") {
          await handleApplyPreset(newId);
        } else {
          setPresetApplied(true);
        }
      }
    } catch (err: any) {
      console.error("[handleSavePlan] Error:", err);
      toast.error("Failed to save plan: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  // ── Add section manually ────────────────────────────────────────────────────
  const handleAddSection = async () => {
    if (!planId) { toast.error("Save the plan first"); return; }
    if (!newSecName.trim()) { toast.error("Section name is required"); return; }
    try {
      const res = await fetch(`${API_URL}/seating/sections`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          plan_id:  planId,
          name:     newSecName,
          color:    newSecColor,
          price:    newSecPrice || null,
          currency: newSecCurr,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      setNewSecName("");
      setNewSecPrice("");
      await refreshSeats(planId);
      toast.success("Section added!");
    } catch (err: any) {
      toast.error("Failed to add section: " + (err.message || "Unknown error"));
    }
  };

  // ── Delete section ──────────────────────────────────────────────────────────
  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm("Delete this section and all its seats?")) return;
    try {
      const res = await fetch(`${API_URL}/seating/sections/${sectionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      if (genSection === sectionId) setGenSection(null);
      await refreshSeats(planId ?? undefined);
      toast.success("Section deleted");
    } catch (err: any) {
      toast.error("Failed to delete section: " + (err.message || "Unknown error"));
    }
  };

  // ── Bulk generate seats ─────────────────────────────────────────────────────
  const handleGenerateSeats = async () => {
    if (!planId) { toast.error("Save the plan first"); return; }
    if (!genSection) {
      toast.error("Please select a section before generating seats.");
      return;
    }

    const from = parseInt(genFrom);
    const to   = parseInt(genTo);
    if (isNaN(from) || isNaN(to) || from > to) {
      toast.error("Invalid seat range");
      return;
    }

    setGenerating(true);
    try {
      const seatList = Array.from({ length: to - from + 1 }, (_, i) => ({
        seat_number: String(from + i),
        label:       `${genRow}${from + i}`,
        price:       genPrice || null,
      }));

      const res = await fetch(`${API_URL}/seating/seats/bulk`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          plan_id:    planId,
          section_id: genSection,
          row_label:  genRow,
          seats:      seatList,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }
      console.log(`---------- ${res.status}`);

      await refreshSeats(planId);
      toast.success(`Generated ${seatList.length} seats in row ${genRow}`);
    } catch (err: any) {
      toast.error("Failed to generate seats: " + (err.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  // ── Delete single seat ──────────────────────────────────────────────────────
  const handleDeleteSeat = async (seatId: number) => {
    if (!confirm("Delete this seat?")) return;
    try {
      const res = await fetch(`${API_URL}/seating/seats/${seatId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setSeats((prev) => prev.filter((s) => s.id !== seatId));
      toast.success("Seat deleted");
    } catch (err: any) {
      toast.error("Failed to delete seat: " + (err.message || "Unknown error"));
    }
  };

  // ── Row constraints for the seat generator ───────────────────────────────────
  const genSectionObj = sections.find((s) => s.id === genSection) ?? null;
  const genPreset     = selectedPreset !== "custom"
    ? (VENUE_PRESETS.find((p) => p.id === selectedPreset) ?? null)
    : null;
  const genPresetSec  = genPreset
    ? ((genPreset.sections as readonly SectionPreset[]).find((ps) => ps.name === genSectionObj?.name) ?? null)
    : null;
  const usedRowsInSec = genSection
    ? [...new Set(seats.filter((s) => s.section_id === genSection).map((s) => s.row_label as string))]
    : [];
  const availableRows = genPresetSec
    ? ([...genPresetSec.rows] as string[]).filter((r) => !usedRowsInSec.includes(r))
    : null;

  // ── Status colours — semantic only, distinct from section brand colours ─────
  const statusColors: Record<string, string> = {
    available: "bg-green-100  text-green-700  border-green-300",
    reserved:  "bg-yellow-100 text-yellow-700 border-yellow-400",
    sold:      "bg-red-100    text-red-600    border-red-300",
    blocked:   "bg-gray-100   text-gray-500   border-gray-300",
  };

  const totalSeats     = seats.length;
  const availableSeats = seats.filter((s) => s.status === "available").length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm"
          onClick={() => router.push("/dashboard/my-geo-drops")}
        >
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <h1 className="text-xl md:text-3xl font-semibold">Edit Seating Plan</h1>
      </div>

      {/* Dev indicator */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-900 px-3 py-1.5 rounded">
          Award ID: <strong>{awardId || "⚠️ MISSING"}</strong>
        </div>
      )}

      {/* ── Venue type picker — shown only before a plan exists ───────────── */}
      {!planId && (
        <section className="space-y-4 bg-white dark:bg-[#151E3A] rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] p-6">
          <div>
            <h2 className="text-lg font-semibold">Choose Venue Type</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select a layout template to pre-populate sections and seats, or start from scratch.
            </p>
          </div>

          {/* Preset grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {VENUE_PRESETS.map((preset) => {
              const Icon     = preset.icon;
              const isChosen = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPreset(preset.id as PresetId)}
                  className={`
                    flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center
                    transition-all duration-150 cursor-pointer
                    ${isChosen
                      ? "border-[#5871A7] bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                      : "border-gray-200 dark:border-[#2E4066] hover:border-[#5871A7]/50 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    }
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    ${isChosen ? "bg-[#5871A7] text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"}
                  `}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isChosen ? "text-[#5871A7]" : "text-gray-700 dark:text-gray-200"}`}>
                      {preset.label}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                      {preset.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Live preview of the selected venue type ─────────────────────── */}
          <div className="rounded-xl border border-[#5871A7]/30 bg-gray-50 dark:bg-gray-900/50 p-5 space-y-4">
            <p className="text-xs font-semibold text-[#5871A7] uppercase tracking-wide">
              Selected layout preview
            </p>

            {/* SVG diagram */}
            <VenueLayoutDiagram presetId={selectedPreset} />

            {/* Section pills + seat estimate */}
            {selectedPreset !== "custom" && (() => {
              const p        = VENUE_PRESETS.find((x) => x.id === selectedPreset)!;
              const secs     = [...p.sections] as SectionPreset[];
              const estTotal = secs.reduce((sum, s) => sum + s.rows.length * s.seatsPerRow, 0);
              return (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {secs.map((sec) => (
                      <span key={sec.name}
                        className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border font-medium"
                        style={{ borderColor: sec.color, color: sec.color, background: sec.color + "15" }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ background: sec.color }} />
                        {sec.name}
                        <span className="opacity-60 font-normal">
                          · {sec.rows.length} rows × {sec.seatsPerRow} seats
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span>{secs.length} section{secs.length !== 1 ? "s" : ""}</span>
                    <span className="font-semibold text-[#5871A7]">
                      ~{estTotal.toLocaleString()} seats total
                    </span>
                  </div>
                </div>
              );
            })()}

            {selectedPreset === "custom" && (
              <p className="text-xs text-gray-400 text-center py-2">
                You will add sections and generate seats manually after creating the plan.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ── Plan details ──────────────────────────────────────────────────── */}
      <section className="space-y-4 bg-white dark:bg-[#151E3A] rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] p-6">
        <h2 className="text-lg font-semibold">
          {planId ? "Seating Plan" : "Plan Details"}
        </h2>

        {planId && (
          <>
            {/* ── Live preview of the selected venue type ─────────────────────── */}
            <div className="rounded-xl border border-[#5871A7]/30 bg-gray-50 dark:bg-gray-900/50 p-5 space-y-4">
              <p className="text-xs font-semibold text-[#5871A7] uppercase tracking-wide">
                Selected layout preview
              </p>

              {/* SVG diagram */}
              <VenueLayoutDiagram presetId={selectedPreset} />

              {/* Section pills + seat estimate */}
              {selectedPreset !== "custom" && (() => {
                const p        = VENUE_PRESETS.find((x) => x.id === selectedPreset)!;
                const secs     = [...p.sections] as SectionPreset[];
                const estTotal = secs.reduce((sum, s) => sum + s.rows.length * s.seatsPerRow, 0);
                return (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {secs.map((sec) => (
                        <span key={sec.name}
                          className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border font-medium"
                          style={{ borderColor: sec.color, color: sec.color, background: sec.color + "15" }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: sec.color }} />
                          {sec.name}
                          <span className="opacity-60 font-normal">
                            · {sec.rows.length} rows × {sec.seatsPerRow} seats
                          </span>
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span>{secs.length} section{secs.length !== 1 ? "s" : ""}</span>
                      <span className="font-semibold text-[#5871A7]">
                        ~{estTotal.toLocaleString()} seats total
                      </span>
                    </div>
                  </div>
                );
              })()}

              {selectedPreset === "custom" && (
                <p className="text-xs text-gray-400 text-center py-2">
                  You will add sections and generate seats manually after creating the plan.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 pb-2">
              <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full border border-blue-200 dark:border-blue-700 font-medium">
                {sections.length} section{sections.length !== 1 ? "s" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-700 font-medium">
                {availableSeats} / {totalSeats} available
              </span>
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Plan Name *</label>
            <Input value={planName} onChange={(e) => setPlanName(e.target.value)}
              placeholder="e.g. Main Auditorium" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Venue Image / Map URL (optional)</label>
            <Input value={planImg} onChange={(e) => setPlanImg(e.target.value)}
              placeholder="https://…/venue-map.png" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <Input value={planDesc} onChange={(e) => setPlanDesc(e.target.value)}
              placeholder="e.g. Ground floor — rows A–Z" />
          </div>
        </div>

        <Button onClick={handleSavePlan} disabled={saving || applyingPreset}
          className="bg-[#5871A7] hover:bg-[#4560A0] text-white">
          {saving || applyingPreset ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              {applyingPreset ? "Applying layout…" : "Saving…"}
            </>
          ) : (
            <><Save size={15} className="mr-2" />{planId ? "Update Plan" : "Create Plan"}</>
          )}
        </Button>
      </section>

      {planId && (
        <>
          {/* ── Sections ────────────────────────────────────────────────── */}
          <section className="space-y-4 bg-white dark:bg-[#151E3A] rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] p-6">
            <h2 className="text-lg font-semibold">Sections</h2>

            {sections.length > 0 && (
              <div className="space-y-2">
                {sections.map((sec) => (
                  <div key={sec.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#2E4066] px-4 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ background: sec.color }} />
                      <span className="font-medium text-sm truncate">{sec.name}</span>
                      {sec.price && (
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {sec.currency?.toUpperCase()} {Number(sec.price).toFixed(2)}
                        </span>
                      )}
                      <span className="text-xs text-gray-300 dark:text-gray-600 flex-shrink-0 font-mono">
                        {seats.filter((s) => s.section_id === sec.id).length} seats
                      </span>
                    </div>
                    {/* <Button type="button" variant="ghost" size="sm"
                      onClick={() => handleDeleteSection(sec.id)}
                      className="text-red-500 hover:text-red-700 h-7 w-7 p-0 flex-shrink-0">
                      <Trash2 size={13} />
                    </Button> */}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 dark:border-[#2E4066] space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Add Section Manually
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Input placeholder="Section name" value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)} />
                <div className="flex items-center gap-2">
                  <input type="color" value={newSecColor}
                    onChange={(e) => setNewSecColor(e.target.value)}
                    className="w-10 h-10 rounded border cursor-pointer flex-shrink-0" />
                  <span className="text-xs text-gray-400 font-mono">{newSecColor}</span>
                </div>
                <Input placeholder="Price (optional)" value={newSecPrice}
                  onChange={(e) => setNewSecPrice(e.target.value)} type="number" />
                <select value={newSecCurr}
                  onChange={(e) => setNewSecCurr(e.target.value)}
                  className="text-sm rounded-lg border border-gray-300 dark:border-[#2E4066] bg-white dark:bg-[#1A2235] px-3 py-2">
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                <Button onClick={handleAddSection}
                  className="bg-[#5871A7] hover:bg-[#4560A0] text-white">
                  <Plus size={14} className="mr-1.5" /> Add
                </Button>
              </div>
            </div>
          </section>

          {/* ── Seat generator ────────────────────────────────────────────── */}
          <section className="space-y-4 bg-white dark:bg-[#151E3A] rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] p-6">
            <div>
              <h2 className="text-lg font-semibold">Generate Seats</h2>
              <p className="text-sm text-gray-500 mt-1">
                Bulk-create a row of seats. A section must be selected.
              </p>
            </div>

            {sections.length === 0 ? (
              <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
                Add at least one section above before generating seats.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Section *</label>
                    <select
                      value={genSection ?? ""}
                      onChange={(e) => setGenSection(Number(e.target.value))}
                      className="w-full text-sm rounded-lg border border-gray-300 dark:border-[#2E4066] bg-white dark:bg-[#1A2235] px-3 py-2"
                    >
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Row Label</label>
                    {availableRows !== null ? (
                      availableRows.length > 0 ? (
                        <select
                          value={genRow}
                          onChange={(e) => setGenRow(e.target.value)}
                          className="w-full text-sm rounded-lg border border-gray-300 dark:border-[#2E4066] bg-white dark:bg-[#1A2235] px-3 py-2"
                        >
                          {availableRows.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="text-xs text-amber-600 dark:text-amber-400 px-3 py-2 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                          All rows filled
                        </div>
                      )
                    ) : (
                      <Input value={genRow}
                        onChange={(e) => setGenRow(e.target.value.toUpperCase())}
                        placeholder="A" maxLength={4} />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">From #</label>
                    <Input type="number" value={genFrom}
                      onChange={(e) => setGenFrom(e.target.value)}
                      readOnly={!!genPresetSec}
                      className={genPresetSec ? "opacity-60 cursor-not-allowed" : ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">To #</label>
                    <Input type="number" value={genTo}
                      onChange={(e) => setGenTo(e.target.value)}
                      readOnly={!!genPresetSec}
                      className={genPresetSec ? "opacity-60 cursor-not-allowed" : ""} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500">Price override</label>
                    <Input type="number" placeholder="optional" value={genPrice}
                      onChange={(e) => setGenPrice(e.target.value)} />
                  </div>
                </div>

                <Button
                  onClick={handleGenerateSeats}
                  disabled={generating || !genSection || (availableRows !== null && availableRows.length === 0)}
                  className="bg-[#5871A7] hover:bg-[#4560A0] text-white"
                >
                  {generating
                    ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Generating…</>
                    : <><Plus size={14} className="mr-1.5" />Generate Row {genRow}</>
                  }
                </Button>
              </>
            )}
          </section>

          {/* ── Seat map ──────────────────────────────────────────────────── */}
          {seats.length > 0 && (
            <section className="space-y-4 bg-white dark:bg-[#151E3A] rounded-xl border border-[#D4D8EA] dark:border-[#2E4066] p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  Seat Map
                  <span className="text-sm font-normal text-gray-400">
                    ({availableSeats} available / {totalSeats} total)
                  </span>
                </h2>
                <Button variant="outline" size="sm" onClick={() => refreshSeats(planId ?? undefined)}>
                  <RefreshCw size={13} className="mr-1.5" /> Refresh
                </Button>
              </div>

              {/* Stage bar — only for stage-oriented venues */}
              {planHasStage && (
                <div className="w-full text-center py-2 rounded-lg bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-xs font-bold tracking-widest text-gray-500 uppercase">
                  ── PITCH / STAGE / SCREEN ──
                </div>
              )}

              {/* Seats grouped by section, rows sorted naturally */}
              <div className="overflow-x-auto pb-2 space-y-6">
                {sections.map((sec) => {
                  const secSeats = seats.filter((s) => s.section_id === sec.id);
                  if (secSeats.length === 0) return null;

                  // ── Group by row ─────────────────────────────────────────
                  const secRowsMap: Record<string, any[]> = {};
                  secSeats.forEach((s) => {
                    const k = s.row_label || "—";
                    if (!secRowsMap[k]) secRowsMap[k] = [];
                    secRowsMap[k].push(s);
                  });

                  // ── Sort rows naturally: A, B, … Z, AA, AB … ────────────
                  const sortedRowKeys = Object.keys(secRowsMap).sort(naturalSort);

                  const secAvail = secSeats.filter((s) => s.status === "available").length;

                  return (
                    <div key={sec.id} className="space-y-2">

                      {/* Section header */}
                      <div
                        className="flex items-center justify-between px-3 py-2 rounded-lg"
                        style={{
                          background: sec.color + "18",
                          borderLeft: `4px solid ${sec.color}`,
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ background: sec.color }} />
                          <span className="text-sm font-bold" style={{ color: sec.color }}>
                            {sec.name}
                          </span>
                          {sec.price && (
                            <span className="text-xs opacity-70" style={{ color: sec.color }}>
                              · {sec.currency?.toUpperCase()} {Number(sec.price).toFixed(2)} / seat
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium opacity-60" style={{ color: sec.color }}>
                          {secAvail} / {secSeats.length} available
                        </span>
                      </div>

                      {/* Rows — sorted naturally */}
                      <div className="space-y-1 pl-2">
                        {sortedRowKeys.map((row) => {
                          // ── Sort seats within each row naturally ─────────
                          const rowSeats = [...secRowsMap[row]].sort((a, b) =>
                            naturalSort(
                              a.label || a.seat_number,
                              b.label || b.seat_number
                            )
                          );

                          return (
                            <div key={row} className="flex items-center gap-1 min-w-max">
                              <span className="w-7 text-center text-xs font-mono font-bold text-gray-400 flex-shrink-0">
                                {row !== "—" ? row : ""}
                              </span>
                              {rowSeats.map((seat) => {
                                const isAvailable = seat.status === "available";
                                return (
                                  <div key={seat.id} className="relative group">
                                    <div
                                      className={`
                                        w-8 h-8 rounded-md border-2 text-[9px] font-bold
                                        flex items-center justify-center transition-colors
                                        ${!isAvailable ? statusColors[seat.status] || "" : ""}
                                      `}
                                      style={isAvailable ? {
                                        borderColor: sec.color,
                                        background:  sec.color + "22",
                                        color:       sec.color,
                                      } : {}}
                                      title={`${seat.label || seat.seat_number} · ${sec.name} · ${seat.status}${seat.price ? ` · ${Number(seat.price).toFixed(2)}` : ""}`}
                                    >
                                      {seat.label || seat.seat_number}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSeat(seat.id)}
                                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center shadow-sm z-10"
                                    >
                                      <Trash2 size={7} />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100 dark:border-[#2E4066]">
                {sections.map((sec) => (
                  <span key={sec.id}
                    className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border font-medium"
                    style={{ borderColor: sec.color, color: sec.color, background: sec.color + "12" }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: sec.color }} />
                    {sec.name}
                  </span>
                ))}

                {sections.length > 0 && (
                  <span className="text-gray-200 dark:text-gray-700 self-center select-none">|</span>
                )}

                {Object.entries(statusColors).map(([status, cls]) => (
                  <span key={status}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium capitalize ${cls}`}>
                    {status}
                    <span className="ml-1 opacity-60">
                      ({seats.filter((s) => s.status === status).length})
                    </span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}