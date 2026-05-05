// src/components/page/Seatingpayment.tsx
"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Check, Mail, Lock, Ticket, Info, MapPin,
  X, CheckCircle, Minus, Plus, AlertCircle,
  ChevronRight, ChevronLeft, Theater, Trophy,
  Music, Building2, Rows3, Circle, LayoutGrid,
} from "lucide-react";
import Image from "next/image";
import logo from "@/assets/logo.png";

const API_URL        = process.env.NEXT_PUBLIC_API_URL;
const PROCESSING_FEE = 0.00;

// ── Types ──────────────────────────────────────────────────────────────────────
interface SeatRow {
  id:            number;
  plan_id:       number;
  section_id:    number | null;
  row_label:     string | null;
  seat_number:   string;
  label:         string | null;
  status:        "available" | "reserved" | "sold" | "blocked";
  price:         number | null;
  section_name:  string | null;
  section_color: string | null;
}

interface Section {
  id:       number;
  name:     string;
  color:    string;
  price:    number | null;
  currency: string | null;
}

interface SeatingPlan {
  id:          number;
  awardid:     string;
  name:        string;
  description: string | null;
  image_url:   string | null;
}

type WizardStep = "quantity" | "section" | "seats" | "pay";

// ── Venue type detection from plan name / sections ─────────────────────────────
// Used to render a contextual layout hint to the user.
function detectVenueType(plan: SeatingPlan, sections: Section[]): string {
  const allNames = [
    plan.name,
    ...sections.map((s) => s.name),
  ].join(" ").toLowerCase();

  if (/pitch|north|south|east|west|stand|terrace/.test(allNames)) return "stadium";
  if (/stalls|circle|gallery|balcony|dress/.test(allNames))        return "theatre";
  if (/floor|block|pit|tier/.test(allNames))                       return "arena";
  if (/screen|front|middle|back|row/.test(allNames))               return "cinema";
  if (/table|cabaret|club/.test(allNames))                         return "cabaret";
  if (/lecture|conference|podium/.test(allNames))                  return "conference";
  return "generic";
}

// ── Venue icon ────────────────────────────────────────────────────────────────
function VenueIcon({ type, size = 16 }: { type: string; size?: number }) {
  const props = { size, className: "text-[#5871A7]" };
  switch (type) {
    case "stadium":    return <Trophy    {...props} />;
    case "theatre":    return <Theater   {...props} />;
    case "arena":      return <Music     {...props} />;
    case "cinema":     return <Building2 {...props} />;
    case "cabaret":    return <Circle    {...props} />;
    case "conference": return <Rows3     {...props} />;
    default:           return <LayoutGrid {...props} />;
  }
}

// ── Venue hint banner ─────────────────────────────────────────────────────────
function VenueHint({ type }: { type: string }) {
  const hints: Record<string, string> = {
    stadium:    "Seats are arranged by stand and row. Select your stand section first, then choose individual seats.",
    theatre:    "Seats are arranged in rows from Stalls (closest) to Gallery (highest). Select your preferred level.",
    arena:      "Floor seats are closest to the stage. Higher block numbers are further back and elevated.",
    cinema:     "Rows A–C are at the front, J onwards are at the back with the best view.",
    cabaret:    "Tables seat up to 8. All seats at the same table share the same view.",
    conference: "Lower row numbers are closest to the podium/screen.",
    generic:    "Select your preferred seats from the map below.",
  };
  return hints[type] ? (
    <div className="flex items-start gap-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800 px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
      <Info size={13} className="flex-shrink-0 mt-0.5" />
      <span>{hints[type]}</span>
    </div>
  ) : null;
}

// ── Spinner ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ── Step indicator ─────────────────────────────────────────────────────────────
function StepIndicator({
  steps,
  current,
}: {
  steps:   { id: WizardStep; label: string }[];
  current: WizardStep;
}) {
  const currentIdx = steps.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
              transition-colors duration-200
              ${i < currentIdx  ? "bg-green-500 text-white"
              : i === currentIdx ? "bg-[#5871A7] text-white ring-4 ring-[#5871A7]/20"
              : "bg-gray-200 dark:bg-gray-700 text-gray-400"}
            `}>
              {i < currentIdx ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-[10px] font-medium ${
              i === currentIdx ? "text-[#5871A7]"
              : i < currentIdx  ? "text-green-500"
              : "text-gray-400"
            }`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-0.5 mb-5 mx-1 transition-colors duration-200
              ${i < currentIdx ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Section picker ─────────────────────────────────────────────────────────────
// Lets user pick which section they want before seeing the seat map.
// For venues with many sections (stadiums, arenas) this avoids overwhelming the user.
function SectionPicker({
  sections,
  seats,
  activeSection,
  onSelect,
  currency,
  unitPrice,
}: {
  sections:      Section[];
  seats:         SeatRow[];
  activeSection: number | null;
  onSelect:      (id: number | null) => void;
  currency:      string;
  unitPrice:     number;
}) {
  const availableBySection: Record<number, number> = {};
  seats.forEach((s) => {
    if (s.section_id && s.status === "available") {
      availableBySection[s.section_id] = (availableBySection[s.section_id] || 0) + 1;
    }
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Choose a section to see available seats:
      </p>

      {/* "All sections" option */}
      <button
        hidden
        type="button"
        onClick={() => onSelect(null)}
        className={`
          w-full flex items-center justify-between rounded-xl border-2 px-4 py-3
          transition-all text-left
          ${activeSection === null
            ? "border-[#5871A7] bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
            : "border-gray-200 dark:border-[#2E4066] hover:border-[#5871A7]/50"
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#5871A7] to-[#8B5CF6]" />
          <span className="font-medium text-sm">View All Sections</span>
        </div>
        <span className="text-xs text-gray-400">
          {seats.filter((s) => s.status === "available").length} available
        </span>
      </button>

      {/* Individual sections */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sections.map((sec) => {
          const avail    = availableBySection[sec.id] || 0;
          const isActive = activeSection === sec.id;
          const secPrice = sec.price != null ? Number(sec.price) : unitPrice;

          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => onSelect(isActive ? null : sec.id)}
              disabled={avail === 0}
              className={`
                flex items-center justify-between rounded-xl border-2 px-4 py-3
                transition-all text-left
                ${isActive
                  ? "border-[#5871A7] bg-[#5871A7]/8 dark:bg-[#5871A7]/15"
                  : avail === 0
                  ? "border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed"
                  : "border-gray-200 dark:border-[#2E4066] hover:border-[#5871A7]/50 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                }
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: sec.color }} />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{sec.name}</p>
                  <p className="text-xs text-gray-400">
                    {avail > 0 ? `${avail} available` : "Sold out"}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <p className="text-sm font-semibold text-[#5871A7]">
                  {currency} {secPrice.toFixed(2)}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Natural sort helper ────────────────────────────────────────────────────────
// Splits a string into alternating alpha and numeric chunks so that
// "A2" < "A10" instead of "A2" > "A10" (which is what string sort gives you).
function naturalSort(a: string, b: string): number {
  const splitIntoChunks = (s: string) =>
    s.match(/(\d+)|([^\d]+)/g)?.map((chunk) =>
      /^\d+$/.test(chunk) ? parseInt(chunk, 10) : chunk.toLowerCase()
    ) ?? [s.toLowerCase()];

  const chunksA = splitIntoChunks(a);
  const chunksB = splitIntoChunks(b);

  for (let i = 0; i < Math.max(chunksA.length, chunksB.length); i++) {
    const ca = chunksA[i];
    const cb = chunksB[i];

    // One list ran out — shorter one comes first
    if (ca === undefined) return -1;
    if (cb === undefined) return  1;

    if (typeof ca === "number" && typeof cb === "number") {
      if (ca !== cb) return ca - cb;
    } else {
      const sa = String(ca);
      const sb = String(cb);
      if (sa !== sb) return sa.localeCompare(sb);
    }
  }
  return 0;
}

// ── Seat grid ─────────────────────────────────────────────────────────────────
function SeatGrid({
  seats,
  sections,
  selectedSeatIds,
  requiredQty,
  filterSection,
  onToggle,
  disabled,
}: {
  seats:           SeatRow[];
  sections:        Section[];
  selectedSeatIds: Set<number>;
  requiredQty:     number;
  filterSection:   number | null;
  onToggle:        (seat: SeatRow) => void;
  disabled:        boolean;
}) {
  // Filter to active section if one is chosen
  const visibleSeats = filterSection != null
    ? seats.filter((s) => s.section_id === filterSection)
    : seats;

  // Group by row
  const rows: Record<string, SeatRow[]> = {};
  visibleSeats.forEach((s) => {
    const key = s.row_label || "—";
    if (!rows[key]) rows[key] = [];
    rows[key].push(s);
  });

  const sectionMap: Record<number, Section> = {};
  sections.forEach((s) => { sectionMap[s.id] = s; });

  const atLimit = selectedSeatIds.size >= requiredQty;

  const seatClass = (seat: SeatRow): string => {
    if (seat.status === "sold")
      return "bg-red-100 dark:bg-red-900/30 text-red-400 border-red-300 cursor-not-allowed opacity-60";
    if (seat.status === "blocked")
      return "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 cursor-not-allowed opacity-50";
    if (seat.status === "reserved")
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 border-yellow-400 cursor-not-allowed";
    if (selectedSeatIds.has(seat.id))
      return "bg-[#5871A7] text-white border-[#5871A7] cursor-pointer shadow-lg scale-110 ring-2 ring-[#5871A7]/30";
    if (atLimit)
      return "bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-700 border-gray-200 dark:border-gray-800 cursor-not-allowed";
    return "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-[#5871A7]/10 hover:border-[#5871A7] hover:scale-105 cursor-pointer";
  };

  // Section header shown when browsing all sections
  const sectionGroups: Record<string, SeatRow[][]> = {};
  if (filterSection === null && sections.length > 1) {
    sections.forEach((sec) => {
      const secSeats = visibleSeats.filter((s) => s.section_id === sec.id);
      if (secSeats.length > 0) {
        const rowsInSec: Record<string, SeatRow[]> = {};
        secSeats.forEach((s) => {
          const k = s.row_label || "—";
          if (!rowsInSec[k]) rowsInSec[k] = [];
          rowsInSec[k].push(s);
        });
        sectionGroups[sec.name] = Object.values(rowsInSec);
      }
    });
  }

  if (Object.keys(rows).length === 0) {
    return (
      <div className="text-center py-6 text-sm text-gray-400">
        No seats found for this section.
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* Progress bar */}
      <div className={`
        flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-medium
        transition-colors duration-300
        ${selectedSeatIds.size === requiredQty
          ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300"
          : "bg-[#5871A7]/5 dark:bg-[#5871A7]/15 border border-[#5871A7]/20 text-[#5871A7]"
        }
      `}>
        <span className="flex items-center gap-2">
          {selectedSeatIds.size === requiredQty
            ? <CheckCircle size={15} />
            : <Info size={15} />
          }
          {selectedSeatIds.size === requiredQty
            ? `All ${requiredQty} seat${requiredQty !== 1 ? "s" : ""} selected ✓`
            : selectedSeatIds.size === 0
            ? `Tap ${requiredQty} seat${requiredQty !== 1 ? "s" : ""} on the map`
            : `${requiredQty - selectedSeatIds.size} more to go`
          }
        </span>
        <span className="text-xs tabular-nums font-bold opacity-80">
          {selectedSeatIds.size} / {requiredQty}
        </span>
      </div>

      {/* Status + section legend */}
      <div className="flex flex-wrap gap-1.5">
        {sections.filter((sec) => filterSection === null || sec.id === filterSection).map((sec) => (
          <span key={sec.id}
            className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium"
            style={{ borderColor: sec.color, color: sec.color, background: sec.color + "12" }}
          >
            <span className="w-2 h-2 rounded-full" style={{ background: sec.color }} />
            {sec.name}
            {sec.price != null && (
              <span className="opacity-70 font-normal">
                · {sec.currency?.toUpperCase() ?? ""} {Number(sec.price).toFixed(2)}
              </span>
            )}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-red-200 text-red-400 bg-red-50 dark:bg-red-900/10">
          <span className="w-2 h-2 rounded-full bg-red-300" /> Sold
        </span>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-yellow-300 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/10">
          <span className="w-2 h-2 rounded-full bg-yellow-300" /> Reserved
        </span>
      </div>

      {/* Stage */}
      <div className="w-full text-center py-2 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-xs font-bold tracking-widest text-gray-500 uppercase shadow-inner">
        ── PITCH / STAGE / SCREEN ──
      </div>

      {/* Seat map */}
      <div className="overflow-x-auto pb-3 pt-1">
        <div className="space-y-1.5 w-fit mx-auto">
          {Object.entries(rows)
  .sort(([a], [b]) => naturalSort(a, b))   // ← sort row labels naturally
  .map(([rowLabel, rowSeats]) => (
    <div key={rowLabel} className="flex items-center gap-1">
      <span className="w-7 text-center text-xs font-mono font-bold text-gray-400 flex-shrink-0">
        {rowLabel !== "—" ? rowLabel : ""}
      </span>
      {[...rowSeats]
        .sort((a, b) =>                    // ← sort seats within the row naturally
          naturalSort(
            a.label || a.seat_number,
            b.label || b.seat_number
          )
        )
        .map((seat) => {
                const isSelected  = selectedSeatIds.has(seat.id);
                const sec         = seat.section_id ? sectionMap[seat.section_id] : null;
                const isClickable =
                  seat.status === "available" &&
                  !disabled &&
                  (isSelected || !atLimit);

                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => isClickable && onToggle(seat)}
                    title={
                      !isClickable && seat.status === "available" && atLimit
                        ? "Limit reached — deselect a seat first"
                        : `${seat.label || seat.seat_number}${seat.section_name ? ` · ${seat.section_name}` : ""}${seat.price != null ? ` · ${Number(seat.price).toFixed(2)}` : ""}`
                    }
                    className={`
                      w-8 h-8 rounded-lg border-2 text-[9px] font-bold
                      flex items-center justify-center flex-shrink-0
                      transition-all duration-150
                      ${seatClass(seat)}
                    `}
                    style={
                      seat.status === "available" && !isSelected && !atLimit && sec?.color
                        ? { borderColor: sec.color + "80", backgroundColor: sec.color + "10" }
                        : {}
                    }
                  >
                    {isSelected ? <CheckCircle size={12} /> : (seat.label || seat.seat_number)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Price summary ─────────────────────────────────────────────────────────────
function PriceSummary({
  selectedSeats,
  sections,
  unitPrice,
  processingFee,
  currency,
}: {
  selectedSeats:  SeatRow[];
  sections:       Section[];
  unitPrice:      number;
  processingFee:  number;
  currency:       string;
}) {
  const sectionMap: Record<number, Section> = {};
  sections.forEach((s) => { sectionMap[s.id] = s; });

  const subtotal = selectedSeats.reduce((sum, seat) => {
    const p =
      seat.price != null ? Number(seat.price)
      : seat.section_id && sectionMap[seat.section_id]?.price != null
      ? Number(sectionMap[seat.section_id].price)
      : unitPrice;
    return sum + p;
  }, 0);

  return (
    <div className="w-full space-y-2">
      {selectedSeats.map((seat) => {
        const p =
          seat.price != null ? Number(seat.price)
          : seat.section_id && sectionMap[seat.section_id]?.price != null
          ? Number(sectionMap[seat.section_id].price)
          : unitPrice;
        return (
          <div key={seat.id}
            className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1.5">
              <Ticket size={12} className="text-[#5871A7]" />
              Seat {seat.label || seat.seat_number}
              {seat.section_name && (
                <span className="text-xs text-gray-400">({seat.section_name})</span>
              )}
            </span>
            <span className="font-medium">{currency} {p.toFixed(2)}</span>
          </div>
        );
      })}

      {processingFee > 0 && (
        <div className="flex justify-between text-sm text-gray-500">
          <span className="flex items-center gap-1">
            Processing fee <Info size={12} className="text-gray-400" />
          </span>
          <span>{currency} {processingFee.toFixed(2)}</span>
        </div>
      )}

      <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-2">
        <div className="flex justify-between font-black text-lg">
          <span>Total</span>
          <span className="text-[#5871A7]">
            {currency} {(subtotal + processingFee).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SeatingPaymentPage() {
  const params       = useParams();
  const searchParams = useSearchParams();

  let awardId = params?.id as string;
  if (!awardId) awardId = searchParams.get("id") || "notfound";

  // Auth
  const [username,        setUsername]        = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [signupUsername,  setSignupUsername]  = useState("");
  const [signupPassword,  setSignupPassword]  = useState("");

  // Pricing
  const [currentName,     setCurrentName]     = useState<string | null>(null);
  const [currentPrice,    setCurrentPrice]    = useState<string | null>(null);
  const [currentCurrency, setCurrentCurrency] = useState<string | null>(null);
  const [currentFee,      setCurrentFee]      = useState<string | null>(null);

  // Ticket qty
  const [ticketQty, setTicketQty] = useState(1);

  // Seating
  const [seatingPlan,    setSeatingPlan]    = useState<SeatingPlan | null>(null);
  const [sections,       setSections]       = useState<Section[]>([]);
  const [seats,          setSeats]          = useState<SeatRow[]>([]);
  const [loadingSeats,   setLoadingSeats]   = useState(true);
  const [selectedSeats,  setSelectedSeats]  = useState<SeatRow[]>([]);
  const [activeSection,  setActiveSection]  = useState<number | null>(null);

  // Wizard step
  const [step, setStep] = useState<WizardStep>("quantity");

  const selectedSeatIds  = new Set(selectedSeats.map((s) => s.id));
  const availableSeatCnt = seats.filter((s) => s.status === "available").length;
  const hasSeatingPlan   = !!seatingPlan;

  // Use section picker when there are multiple sections (stadium / arena etc.)
  const usesSectionPicker = sections.length > 2;

  // ── Wizard steps definition ─────────────────────────────────────────────────
  const wizardSteps: { id: WizardStep; label: string }[] = hasSeatingPlan
    ? usesSectionPicker
      ? [
          { id: "quantity", label: "Tickets"  },
          { id: "section",  label: "Section"  },
          { id: "seats",    label: "Seats"    },
          { id: "pay",      label: "Payment"  },
        ]
      : [
          { id: "quantity", label: "Tickets"  },
          { id: "seats",    label: "Seats"    },
          { id: "pay",      label: "Payment"  },
        ]
    : [
        { id: "quantity", label: "Tickets"  },
        { id: "pay",      label: "Payment"  },
      ];

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) { setUsername(stored); setIsAuthenticated(true); }
  }, []);

  // ── Subscription type ───────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/getsubscriptiontype/${awardId}`)
      .then((r) => r.json())
      .then((d) => {
        setCurrentName(d.billingname);
        setCurrentPrice(d.price);
        setCurrentCurrency(d.currency);
        setCurrentFee(d.fee);
      })
      .catch(console.error);
  }, [awardId]);

  // ── Seating plan ────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoadingSeats(true);
      try {
        const plans = await fetch(`${API_URL}/seating/plans/${awardId}`)
          .then((r) => r.json());

        if (!Array.isArray(plans) || plans.length === 0) {
          setLoadingSeats(false);
          return;
        }

        const detail = await fetch(
          `${API_URL}/seating/plans/${awardId}/${plans[0].id}`
        ).then((r) => r.json());

        setSeatingPlan(detail.plan);
        setSections(detail.sections || []);
        setSeats(detail.seats || []);
      } catch (err) {
        console.error("Error loading seating plan:", err);
      } finally {
        setLoadingSeats(false);
      }
    };
    load();
  }, [awardId]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const processingFee = parseFloat(String(currentFee ?? PROCESSING_FEE)) || PROCESSING_FEE;
  const unitPrice     = parseFloat(currentPrice || "9.99") || 0;
  const currencyUpper = currentCurrency?.toUpperCase() ?? "GBP";
  const venueType     = seatingPlan ? detectVenueType(seatingPlan, sections) : "generic";

  const sectionMap: Record<number, Section> = {};
  sections.forEach((s) => { sectionMap[s.id] = s; });

  const seatedSubtotal = selectedSeats.reduce((sum, seat) => {
    const p =
      seat.price != null ? Number(seat.price)
      : seat.section_id && sectionMap[seat.section_id]?.price != null
      ? Number(sectionMap[seat.section_id].price)
      : unitPrice;
    return sum + p;
  }, 0);

  const flatTotal   = unitPrice * ticketQty + processingFee;
  const seatedTotal = seatedSubtotal + processingFee;
  const planTier    = `${currentName || "Single Payment"}singlepayment`;

  // ── Seat toggle ─────────────────────────────────────────────────────────────
  const toggleSeat = (seat: SeatRow) => {
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.id === seat.id);
      if (exists) return prev.filter((s) => s.id !== seat.id);
      if (prev.length >= ticketQty) {
        toast.error(`Select exactly ${ticketQty} seat${ticketQty !== 1 ? "s" : ""} — deselect one first.`);
        return prev;
      }
      return [...prev, seat];
    });
  };

  const handleQtyChange = (n: number) => {
    setTicketQty(n);
    setSelectedSeats((prev) => prev.slice(0, n));
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNextFromQuantity = () => {
    if (hasSeatingPlan && availableSeatCnt < ticketQty) {
      toast.error(`Only ${availableSeatCnt} seat${availableSeatCnt !== 1 ? "s" : ""} available.`);
      return;
    }
    if (hasSeatingPlan) {
      setStep(usesSectionPicker ? "section" : "seats");
    } else {
      setStep("pay");
    }
  };

  const handleNextFromSection = () => {
    setStep("seats");
  };

  const handleNextFromSeats = () => {
    if (selectedSeats.length !== ticketQty) {
      toast.error(`Please select exactly ${ticketQty} seat${ticketQty !== 1 ? "s" : ""}.`);
      return;
    }
    setStep("pay");
  };

  const goBack = () => {
    if (step === "seats")    setStep(usesSectionPicker ? "section" : "quantity");
    else if (step === "section") setStep("quantity");
    else if (step === "pay") setStep(hasSeatingPlan ? "seats" : "quantity");
  };

  // ── Checkout ────────────────────────────────────────────────────────────────
  const createCheckoutSession = async (userid: string) => {
    const formData: Record<string, any> = {
      userid,
      awardid:       awardId,
      tier:          planTier,
      processingFee: processingFee.toFixed(2),
      successurl:    `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/dashboard/award-details/${awardId}`,
      cancelurl:     `https://${process.env.NEXT_PUBLIC_DNSPREFIX}.geo-drops.com/dashboard/award-details/${awardId}`,
    };

    if (hasSeatingPlan && selectedSeats.length > 0) {
      const reserveRes  = await fetch(`${API_URL}/seating/reserve`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          userid,
          awardid:  awardId,
          seat_ids: selectedSeats.map((s) => s.id),
        }),
      });
      const reserveData = await reserveRes.json();

      if (!reserveRes.ok) {
        toast.error(reserveData.error || "Some seats are no longer available — please re-select.");
        const detail = await fetch(
          `${API_URL}/seating/plans/${awardId}/${seatingPlan!.id}`
        ).then((r) => r.json());
        setSeats(detail.seats || []);
        setSelectedSeats([]);
        setStep("seats");
        setIsProcessing(false);
        return;
      }

      formData.quantity    = selectedSeats.length;
      formData.totalAmount = seatedTotal.toFixed(2);
      formData.seat_ids    = selectedSeats.map((s) => s.id);
      formData.seat_labels = selectedSeats.map((s) => s.label || s.seat_number);
      formData.plan_id     = seatingPlan!.id;
    } else {
      formData.quantity    = ticketQty;
      formData.totalAmount = flatTotal.toFixed(2);
    }

    const res  = await fetch(`${API_URL}/singlepayment/create-checkout-session`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(formData),
    });
    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error(data.error || "Error creating payment session");
      setIsProcessing(false);
    }
  };

  const handleSignupAndPay = async () => {
    if (!signupUsername || !signupPassword) { toast.error("Please enter both username and password"); return; }
    setIsProcessing(true);
    try {
      const signupRes  = await fetch(`${API_URL}/signupmobile`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname: signupUsername, username: signupUsername, password: signupPassword }),
      });
      const signupData = await signupRes.json();

      if (!signupRes.ok || !signupData.success) {
        const loginRes  = await fetch(`${API_URL}/loginmobile`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: signupUsername, password: signupPassword }),
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok || !loginData.success) {
          toast.error(signupData.message || loginData.message || "Authentication failed.");
          setIsProcessing(false);
          return;
        }
      }
      localStorage.setItem("username", signupUsername);
      setUsername(signupUsername);
      setIsAuthenticated(true);
      await createCheckoutSession(signupUsername);
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  const handlePay = async () => {
    if (!username) { toast.error("User not logged in"); return; }
    setIsProcessing(true);
    try {
      await createCheckoutSession(username);
    } catch {
      toast.error("Failed to process payment.");
      setIsProcessing(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 lg:w-[95%] py-8">

      <div className="flex justify-center">
        <Image src={process.env.NEXT_PUBLIC_LOGO_PATH || logo}
          alt="Logo" width={100} height={100} />
      </div>

      <h1 className="text-3xl font-semibold text-center">
        Buy your drop ticket/pass
      </h1>

      {isAuthenticated && (
        <p className="text-center text-lg text-[#61667A] dark:text-gray-400">
          Logged in as: <span className="font-medium">{username}</span>
        </p>
      )}

      <div className="flex justify-center">
        <Button variant="outline"
          onClick={() => window.open(
            isAuthenticated
              ? `/dashboard/award-details/${awardId}`
              : `/award-details/${awardId}/public`,
            "_self"
          )}>
          Back to the Drop
        </Button>
      </div>

      {/* ── Main card ─────────────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl px-4 mx-auto">
        <div className="bg-white dark:bg-[#1C2541] rounded-2xl shadow-xl p-6 flex flex-col gap-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold">{currentName || "Single Payment"}</h3>
            {hasSeatingPlan && seatingPlan && (
              <p className="text-sm text-gray-500 flex items-center justify-center gap-1.5">
                <VenueIcon type={venueType} size={14} />
                {seatingPlan.name}
                {seatingPlan.description && ` — ${seatingPlan.description}`}
              </p>
            )}
          </div>

          {/* Feature bullet */}
          <ul>
            <li className="flex items-start gap-2 text-sm">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 dark:text-gray-300">
                Download the drop pass(es)/ticket(s) to your mobile wallet
              </span>
            </li>
          </ul>

          {/* Loading */}
          {loadingSeats ? (
            <div className="flex items-center justify-center py-10 gap-2 text-gray-400">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#5871A7]" />
              Loading…
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <StepIndicator steps={wizardSteps} current={step} />

              {/* ── STEP 1: Quantity ──────────────────────────────────────── */}
              {step === "quantity" && (
                <div className="space-y-5">

                  {/* Venue image preview */}
                  {hasSeatingPlan && seatingPlan?.image_url && (
                    <img src={seatingPlan.image_url} alt="Venue"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain max-h-40" />
                  )}

                  {/* Venue hint */}
                  {hasSeatingPlan && <VenueHint type={venueType} />}

                  {/* Stepper */}
                  <div className="flex flex-col items-center gap-3 py-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      How many tickets?
                    </span>
                    <div className="flex items-center gap-4">
                      <button type="button"
                        onClick={() => handleQtyChange(Math.max(1, ticketQty - 1))}
                        disabled={isProcessing || ticketQty <= 1}
                        className="w-11 h-11 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-[#5871A7] hover:text-[#5871A7] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Minus size={16} />
                      </button>
                      <div className="flex flex-col items-center">
                        <span className="text-4xl font-black tabular-nums text-gray-800 dark:text-white">
                          {ticketQty}
                        </span>
                        <span className="text-xs text-gray-400 mt-0.5">
                          ticket{ticketQty !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <button type="button"
                        onClick={() => handleQtyChange(Math.min(hasSeatingPlan ? availableSeatCnt : 10, ticketQty + 1))}
                        disabled={isProcessing || ticketQty >= (hasSeatingPlan ? availableSeatCnt : 10)}
                        className="w-11 h-11 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-[#5871A7] hover:text-[#5871A7] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    {hasSeatingPlan && (
                      <p className="text-xs text-gray-400">
                        {availableSeatCnt} seat{availableSeatCnt !== 1 ? "s" : ""} available
                      </p>
                    )}
                  </div>

                  {/* Insufficient seats */}
                  {hasSeatingPlan && availableSeatCnt < ticketQty && (
                    <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 px-4 py-3 text-sm text-orange-700 dark:text-orange-300">
                      <AlertCircle size={15} className="flex-shrink-0" />
                      Only {availableSeatCnt} seat{availableSeatCnt !== 1 ? "s" : ""} available.
                    </div>
                  )}

                  {/* Price preview */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Price per ticket</span>
                      <span>{currencyUpper} {unitPrice.toFixed(2)}</span>
                    </div>
                    {ticketQty > 1 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>× {ticketQty} tickets</span>
                        <span>{currencyUpper} {(unitPrice * ticketQty).toFixed(2)}</span>
                      </div>
                    )}
                    {processingFee > 0 && (
                      <div className="flex justify-between text-sm text-gray-500">
                        <span>Processing fee</span>
                        <span>{currencyUpper} {processingFee.toFixed(2)}</span>
                      </div>
                    )}
                    {hasSeatingPlan && (
                      <p className="text-xs text-gray-400 pt-1">* Final total may vary by section</p>
                    )}
                    {!hasSeatingPlan && (
                      <div className="flex justify-between font-black text-base border-t-2 border-gray-200 dark:border-gray-700 pt-2">
                        <span>Total</span>
                        <span className="text-[#5871A7]">{currencyUpper} {flatTotal.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full bg-[#5871A7] hover:bg-[#4560A0] text-white h-12 font-semibold"
                    onClick={handleNextFromQuantity}
                    disabled={hasSeatingPlan && availableSeatCnt < ticketQty}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {hasSeatingPlan ? "Choose seats" : "Continue to payment"}
                      <ChevronRight size={18} />
                    </span>
                  </Button>
                </div>
              )}

              {/* ── STEP 2: Section (multi-section venues only) ───────────── */}
              {step === "section" && hasSeatingPlan && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={goBack}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#5871A7] transition-colors">
                      <ChevronLeft size={15} /> Back
                    </button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                      <VenueIcon type={venueType} />
                      Choose a section
                    </span>
                    <span className="text-sm font-mono font-bold text-[#5871A7]">
                      {ticketQty} ticket{ticketQty !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <VenueHint type={venueType} />

                  {seatingPlan?.image_url && (
                    <img src={seatingPlan.image_url} alt="Venue map"
                      className="w-full rounded-xl border border-gray-200 dark:border-gray-700 object-contain max-h-44" />
                  )}

                  <SectionPicker
                    sections={sections}
                    seats={seats}
                    activeSection={activeSection}
                    onSelect={setActiveSection}
                    currency={currencyUpper}
                    unitPrice={unitPrice}
                  />

                  <Button
                    className="w-full bg-[#5871A7] hover:bg-[#4560A0] text-white h-12 font-semibold"
                    onClick={handleNextFromSection}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {activeSection
                        ? `View seats in ${sections.find((s) => s.id === activeSection)?.name}`
                        : "View all seats"
                      }
                      <ChevronRight size={18} />
                    </span>
                  </Button>
                </div>
              )}

              {/* ── STEP 3: Seat selection ────────────────────────────────── */}
              {step === "seats" && hasSeatingPlan && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button type="button" onClick={goBack}
                      className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#5871A7] transition-colors">
                      <ChevronLeft size={15} /> Back
                    </button>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {activeSection
                        ? sections.find((s) => s.id === activeSection)?.name
                        : seatingPlan?.name
                      }
                    </span>
                    <span className="text-sm font-mono font-bold text-[#5871A7]">
                      {selectedSeats.length}/{ticketQty}
                    </span>
                  </div>

                  <SeatGrid
                    seats={seats}
                    sections={sections}
                    selectedSeatIds={selectedSeatIds}
                    requiredQty={ticketQty}
                    filterSection={activeSection}
                    onToggle={toggleSeat}
                    disabled={isProcessing}
                  />

                  {/* Selected chips */}
                  {selectedSeats.length > 0 && (
                    <div className="rounded-xl border border-[#5871A7]/30 bg-blue-50/50 dark:bg-blue-900/10 p-3 space-y-2">
                      <p className="text-xs font-semibold text-[#5871A7] uppercase tracking-wide">
                        Selected
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedSeats.map((s) => (
                          <span key={s.id}
                            className="inline-flex items-center gap-1 text-xs bg-[#5871A7] text-white px-2.5 py-1 rounded-full font-medium">
                            {s.label || s.seat_number}
                            {s.section_name && <span className="opacity-70">· {s.section_name}</span>}
                            <button type="button" onClick={() => toggleSeat(s)}
                              disabled={isProcessing}
                              className="ml-0.5 hover:opacity-70 disabled:opacity-40">
                              <X size={10} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full bg-[#5871A7] hover:bg-[#4560A0] text-white h-12 font-semibold"
                    onClick={handleNextFromSeats}
                    disabled={selectedSeats.length !== ticketQty}
                  >
                    {selectedSeats.length !== ticketQty
                      ? `Select ${ticketQty - selectedSeats.length} more seat${(ticketQty - selectedSeats.length) !== 1 ? "s" : ""}`
                      : <span className="flex items-center justify-center gap-2">
                          Continue to payment <ChevronRight size={18} />
                        </span>
                    }
                  </Button>
                </div>
              )}

              {/* ── STEP 4: Payment ───────────────────────────────────────── */}
              {step === "pay" && (
                <div className="space-y-5">
                  <button type="button" onClick={goBack}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#5871A7] transition-colors">
                    <ChevronLeft size={15} /> Back
                  </button>

                  {/* Order summary */}
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Order Summary
                    </p>

                    {hasSeatingPlan && selectedSeats.length > 0 ? (
                      <PriceSummary
                        selectedSeats={selectedSeats}
                        sections={sections}
                        unitPrice={unitPrice}
                        processingFee={processingFee}
                        currency={currencyUpper}
                      />
                    ) : (
                      <>
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1.5">
                            <Ticket size={12} className="text-[#5871A7]" />
                            {ticketQty} × ticket
                          </span>
                          <span className="font-medium">
                            {currencyUpper} {(unitPrice * ticketQty).toFixed(2)}
                          </span>
                        </div>
                        {processingFee > 0 && (
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Processing fee</span>
                            <span>{currencyUpper} {processingFee.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-lg border-t-2 border-gray-200 dark:border-gray-700 pt-2">
                          <span>Total</span>
                          <span className="text-[#5871A7]">
                            {currencyUpper} {flatTotal.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Signup form */}
                  {!isAuthenticated && (
                    <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-center">Sign up / in to continue</h4>
                      <div>
                        <Label htmlFor="su-email" className="text-sm mb-2 block">Username (Email)</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <Input id="su-email" type="email" autoComplete="email" required
                            className="pl-10" placeholder="your.email@example.com"
                            value={signupUsername} onChange={(e) => setSignupUsername(e.target.value)}
                            disabled={isProcessing} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="su-pass" className="text-sm mb-2 block">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                          <Input id="su-pass" type="password" autoComplete="new-password" required
                            className="pl-10" placeholder="Type in a password"
                            value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                            disabled={isProcessing} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pay button */}
                  {isAuthenticated ? (
                    <Button className="w-full bg-clgeodrops hover:opacity-70 text-white h-13 text-base font-bold"
                      onClick={handlePay} disabled={isProcessing}>
                      {isProcessing ? (
                        <span className="flex items-center justify-center"><Spinner />Processing…</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Ticket size={17} />
                          Pay {currencyUpper}{" "}
                          {hasSeatingPlan ? seatedTotal.toFixed(2) : flatTotal.toFixed(2)}
                          <span className="text-white/70 text-sm">
                            · {ticketQty} ticket{ticketQty !== 1 ? "s" : ""}
                          </span>
                        </span>
                      )}
                    </Button>
                  ) : (
                    <Button className="w-full bg-clgeodrops hover:opacity-70 text-white h-13 text-base font-bold"
                      onClick={handleSignupAndPay} disabled={isProcessing}>
                      {isProcessing ? (
                        <span className="flex items-center justify-center"><Spinner />Processing…</span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Ticket size={17} />
                          Sign Up/In & Pay {currencyUpper}{" "}
                          {hasSeatingPlan ? seatedTotal.toFixed(2) : flatTotal.toFixed(2)}
                        </span>
                      )}
                    </Button>
                  )}

                  {!isAuthenticated && (
                    <p className="text-center text-xs text-gray-600 dark:text-gray-400">
                      Already have an account?{" "}
                      <a href={`/signin?id=${awardId}&tf=1`}
                        className="font-medium text-clgeodrops hover:opacity-80">
                        Log in
                      </a>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-center text-sm text-[#61667A] dark:text-gray-400 space-y-2">
        <p>All payments are processed securely through Stripe.</p>
        <p>Contact <span className="font-medium">support@ega-tech.co</span> for refunds.</p>
      </div>
    </div>
  );
}