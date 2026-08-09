import { ArrowLeft, Share2, Edit2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { dbService, type TicketRecord } from "@/services/dbService";

export type PassengerDetails = {
  name: string;
  age: string;
  idType: string;
  idNumber: string;
  source: string;
  destination: string;
  distance: string;
};

type BookingDetailsProps = {
  ticketRecord: TicketRecord;
  onEdit: () => void;
};

type EditableText = {
  [key: string]: string;
};

type TextPosition = {
  [key: string]: { x: number; y: number };
};

const TIMER_DURATION = 300;
const TIME_ROLL_DURATION_MS = 600;

export const generateTicketCode = () => {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const l1 = letters[Math.floor(Math.random() * letters.length)];
  const l2 = letters[Math.floor(Math.random() * letters.length)];
  const l3 = letters[Math.floor(Math.random() * letters.length)];
  const l4 = letters[Math.floor(Math.random() * letters.length)];
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${l1}${l2}${l3}${l4}${num}`;
};

const BookingDetails = ({ ticketRecord, onEdit }: BookingDetailsProps) => {
  const passenger = ticketRecord.passenger;
  const [seconds, setSeconds] = useState(TIMER_DURATION);
  const initialMm = String(Math.floor(TIMER_DURATION / 60)).padStart(2, "0");
  const initialSs = String(TIMER_DURATION % 60).padStart(2, "0");
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayTime, setDisplayTime] = useState({
    previousMm: initialMm,
    currentMm: initialMm,
    previousSs: initialSs,
    currentSs: initialSs,
    animateMm: false,
    animateSs: false,
  });

  const [editableText, setEditableText] = useState<EditableText>(() => ({
    ticketType: "Season Ticket",
    ticketCode: ticketRecord.ticketCode || generateTicketCode(),
    bookingLabel: "Ticket Booking Date & Time",
    validTillLabel: "*Valid Till",
    fareInfo: "MONTHLY | SUPERFAST | SECOND | ₹ 665.00",
    noteText: "Note: This ticket is non refundable. Ticket is stored locally on the device. Please do not change your handset or perform factory reset.",
    bookingButton: "Book Connecting Journey",
    ...ticketRecord.editableText,
  }));

  const [editingField, setEditingField] = useState<string | null>(null);
  const [positions, setPositions] = useState<TextPosition>(ticketRecord.positions || {});
  const [dragging, setDragging] = useState<{ field: string; startX: number; startY: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    dbService.updateTicketState(editableText, positions);
  }, [editableText, positions]);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : TIMER_DURATION));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const timerProgress = ((TIMER_DURATION - seconds) / TIMER_DURATION) * 100;

  useEffect(() => {
    setDisplayTime((previous) => {
      const mmChanged = previous.currentMm !== mm;
      const ssChanged = previous.currentSs !== ss;

      if (!mmChanged && !ssChanged) {
        return previous;
      }

      return {
        previousMm: mmChanged ? previous.currentMm : previous.previousMm,
        currentMm: mm,
        previousSs: ssChanged ? previous.currentSs : previous.previousSs,
        currentSs: ss,
        animateMm: mmChanged,
        animateSs: ssChanged,
      };
    });
  }, [mm, ss]);

  useEffect(() => {
    if (!displayTime.animateMm && !displayTime.animateSs) return;
    const timeout = window.setTimeout(() => {
      setDisplayTime((previous) => ({
        ...previous,
        previousMm: previous.currentMm,
        previousSs: previous.currentSs,
        animateMm: false,
        animateSs: false,
      }));
    }, TIME_ROLL_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [displayTime.animateMm, displayTime.animateSs]);

  const bookedOnDate = new Date(ticketRecord.bookedOnTimestamp);
  const bookedOn = `${String(bookedOnDate.getDate()).padStart(2, "0")}/${String(bookedOnDate.getMonth() + 1).padStart(2, "0")}/${bookedOnDate.getFullYear()} ${String(bookedOnDate.getHours()).padStart(2, "0")}:${String(bookedOnDate.getMinutes()).padStart(2, "0")}`;

  const validFromDate = new Date(bookedOnDate);
  const validFrom = `${String(validFromDate.getDate()).padStart(2, "0")}/${String(validFromDate.getMonth() + 1).padStart(2, "0")}/${validFromDate.getFullYear()}`;

  const validTillDate = new Date(bookedOnDate);
  validTillDate.setMonth(validTillDate.getMonth() + 1);
  validTillDate.setDate(validTillDate.getDate() - 1);
  const validTill = `${String(validTillDate.getDate()).padStart(2, "0")}/${String(validTillDate.getMonth() + 1).padStart(2, "0")}/${validTillDate.getFullYear()}`;

  const handleMouseDown = (field: string, e: React.MouseEvent) => {
    if (!isEditMode) return;
    const pos = positions[field] || { x: 0, y: 0 };
    setDragging({
      field,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: pos.x,
      offsetY: pos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !isEditMode) return;
    const deltaX = e.clientX - dragging.startX;
    const deltaY = e.clientY - dragging.startY;
    setPositions((prev) => ({
      ...prev,
      [dragging.field]: {
        x: dragging.offsetX + deltaX,
        y: dragging.offsetY + deltaY,
      },
    }));
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  const EditableField = ({ field, value }: { field: string; value: string }) => {
    const pos = positions[field] || { x: 0, y: 0 };
    if (!isEditMode) {
      return <span onClick={() => setEditingField(field)} className="cursor-pointer hover:bg-yellow-100/50 px-1 rounded transition">{value}</span>;
    }
    if (editingField === field) {
      return (
        <input
          autoFocus
          type="text"
          value={editableText[field] || value}
          onChange={(e) => setEditableText({ ...editableText, [field]: e.target.value })}
          onBlur={() => setEditingField(null)}
          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
          onMouseDown={(e) => e.stopPropagation()}
          className="border-2 border-blue-500 rounded px-2 py-1 w-full max-w-xs text-black"
        />
      );
    }
    return (
      <span
        draggable
        onMouseDown={(e) => {
          e.preventDefault();
          handleMouseDown(field, e);
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setEditingField(field)}
        style={{
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          display: 'inline-block',
          cursor: 'grab',
          background: 'rgba(255,200,0,0.2)',
          padding: '4px 6px',
          borderRadius: '4px',
          transition: dragging?.field === field ? 'none' : 'all 0.2s',
          userSelect: 'none',
        }}
        className="hover:bg-yellow-100/50 rounded"
      >
        {editableText[field] || value}
      </span>
    );
  };

  const RollingTimeUnit = ({
    previousValue,
    currentValue,
    animate,
  }: {
    previousValue: string;
    currentValue: string;
    animate: boolean;
  }) => (
    <span className="time-roll-window" aria-hidden="true">
      <span className={`time-roll-track ${animate ? "time-roll-track--animate" : ""}`}>
        <span className="time-roll-value">{currentValue}</span>
        <span className="time-roll-value">{previousValue}</span>
      </span>
    </span>
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--ticket-bg))] flex justify-center" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="w-full max-w-[420px] bg-[hsl(var(--ticket-bg))] shadow-2xl relative overflow-hidden">
        {/* Status bar */}
        <div className="bg-primary h-6" />

        {/* Header */}
        <div className="bg-primary text-primary-foreground px-[clamp(1rem,4vw,1.25rem)] pb-[clamp(1.25rem,5vw,1.5rem)] pt-[clamp(0.5rem,2vw,0.75rem)]">
          <div className="flex items-center justify-between gap-[clamp(0.5rem,2vw,0.75rem)]">
            <button
              aria-label="Back"
              onClick={onEdit}
              className="w-[clamp(2rem,8vw,2.5rem)] h-[clamp(2rem,8vw,2.5rem)] rounded-full border border-primary-foreground/80 flex items-center justify-center hover:bg-primary-foreground/10 transition flex-shrink-0"
            >
              <ArrowLeft className="w-[clamp(1.2rem,4vw,1.4rem)] h-[clamp(1.2rem,4vw,1.4rem)]" />
            </button>
            <div className="flex-1 ml-[clamp(0.75rem,3vw,1rem)] min-w-0">
              <h1 className="text-[clamp(1.3rem,4.8vw,1.9rem)] font-bold leading-tight">Booking Details</h1>
              <p className="text-[clamp(0.75rem,2.8vw,0.9rem)] text-primary-foreground/90">Mobile: 8776045632</p>
            </div>
            <button
              aria-label={isEditMode ? "Save" : "Edit"}
              onClick={() => {
                if (isEditMode) {
                  setEditingField(null);
                }
                setIsEditMode(!isEditMode);
              }}
              className="w-[clamp(2rem,8vw,2.5rem)] h-[clamp(2rem,8vw,2.5rem)] rounded-full border border-primary-foreground/80 flex items-center justify-center hover:bg-primary-foreground/10 transition flex-shrink-0"
            >
              {isEditMode ? <Save className="w-[clamp(1.2rem,4vw,1.4rem)] h-[clamp(1.2rem,4vw,1.4rem)]" /> : <Edit2 className="w-[clamp(1.2rem,4vw,1.4rem)] h-[clamp(1.2rem,4vw,1.4rem)]" />}
            </button>
            <button aria-label="Share" className="p-[clamp(0.4rem,1.5vw,0.6rem)] flex-shrink-0">
              <Share2 className="w-[clamp(1.2rem,4vw,1.4rem)] h-[clamp(1.2rem,4vw,1.4rem)]" />
            </button>
          </div>
        </div>

        {/* Thank you */}
        <div className="bg-white px-[clamp(1rem,4vw,1.25rem)] py-[clamp(1rem,4vw,1.25rem)]">
          <p className="text-[hsl(var(--muted-foreground))] text-[clamp(0.95rem,3.5vw,1.05rem)]">
            Thank You {passenger.name}, Happy Journey !
          </p>
        </div>

        {/* Ticket */}
        <div className="mt-[clamp(0.5rem,1.8vw,0.7rem)] px-[clamp(0.7rem,2.5vw,0.9rem)]">
          {/* Top green strip with rounded top corners */}
          <div className="bg-[hsl(var(--ticket-green))] h-[10px] rounded-t-2xl" />

          {/* Dynamic preview header */}
          <div
            className="relative text-center text-white overflow-hidden flex items-stretch bg-center bg-cover bg-no-repeat"
            style={{ backgroundImage: "url('/card.png')" }}
          >
            <div className="absolute inset-0 bg-black/15 pointer-events-none" />
            {/* Left side - INDIAN RAILWAYS with dotted line */}
            {isEditMode && (
              <div
                style={{
                  transform: `translate(${positions['leftBorder'] ? positions['leftBorder'].x : 0}px, ${positions['leftBorder'] ? positions['leftBorder'].y : 0}px)`,
                  cursor: 'grab',
                }}
                className="absolute left-0 top-0 bottom-0 flex items-center justify-center gap-[clamp(0.4rem,1.5vw,0.6rem)] px-[clamp(0.45rem,1.5vw,0.65rem)] border-r-2 border-dashed border-white/60 bg-white/5 hover:bg-white/10 transition"
                onMouseDown={(e) => handleMouseDown('leftBorder', e)}
              >
                <span className="rail-vertical inline-flex h-full items-center justify-center text-center text-[clamp(0.9rem,2.8vw,1.15rem)] leading-none tracking-[0.08em] font-bold text-slate-300/35 pointer-events-none">
                  INDIAN RAILWAYS
                </span>
              </div>
            )}
            {!isEditMode && (
              <div className="absolute left-0 top-0 bottom-0 flex items-center justify-center gap-[clamp(0.4rem,1.5vw,0.6rem)] px-[clamp(0.45rem,1.5vw,0.65rem)] border-r-2 border-dashed border-white/60">
                <span className="rail-vertical inline-flex h-full items-center justify-center text-center text-[clamp(0.9rem,2.8vw,1.15rem)] leading-none tracking-[0.08em] font-bold text-slate-300/35">
                  INDIAN RAILWAYS
                </span>
              </div>
            )}

            {/* Right side - भारतीय रेल with dotted line */}
            {isEditMode && (
              <div
                style={{
                  transform: `translate(${positions['rightBorder'] ? positions['rightBorder'].x : 0}px, ${positions['rightBorder'] ? positions['rightBorder'].y : 0}px)`,
                  cursor: 'grab',
                }}
                className="absolute right-0 top-0 bottom-0 flex items-center justify-center gap-[clamp(0.4rem,1.5vw,0.6rem)] px-[clamp(0.45rem,1.5vw,0.65rem)] border-l-2 border-dashed border-white/60 bg-white/5 hover:bg-white/10 transition"
                onMouseDown={(e) => handleMouseDown('rightBorder', e)}
              >
                <span className="rail-vertical rail-vertical-hindi inline-flex h-full items-center justify-center text-center text-[clamp(0.9rem,2.8vw,1.15rem)] leading-none tracking-[0.06em] font-bold text-slate-300/35 pointer-events-none">
                  भारतीय रेल
                </span>
              </div>
            )}
            {!isEditMode && (
              <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center gap-[clamp(0.4rem,1.5vw,0.6rem)] px-[clamp(0.45rem,1.5vw,0.65rem)] border-l-2 border-dashed border-white/60">
                <span className="rail-vertical rail-vertical-hindi inline-flex h-full items-center justify-center text-center text-[clamp(0.9rem,2.8vw,1.15rem)] leading-none tracking-[0.06em] font-bold text-slate-300/35">
                  भारतीय रेल
                </span>
              </div>
            )}

            {/* Center content */}
            <div className="relative z-10 w-full px-[clamp(1rem,4.2vw,1.45rem)] py-[clamp(1rem,3.8vw,1.3rem)]">
              <p className="text-[clamp(0.88rem,3.4vw,1rem)] font-semibold mb-[clamp(0.35rem,1.5vw,0.55rem)]">Dynamic preview will close in</p>
              <p
                aria-label={`${mm}:${ss}`}
                className="flex items-center justify-center gap-[0.04em] text-[clamp(2.45rem,10.5vw,3.5rem)] leading-none font-extrabold text-[hsl(var(--ticket-orange))] tracking-tight tabular-nums"
              >
                <RollingTimeUnit
                  previousValue={displayTime.previousMm}
                  currentValue={displayTime.currentMm}
                  animate={displayTime.animateMm}
                />
                <span className="time-roll-colon">:</span>
                <RollingTimeUnit
                  previousValue={displayTime.previousSs}
                  currentValue={displayTime.currentSs}
                  animate={displayTime.animateSs}
                />
              </p>
              <p className="text-[clamp(0.72rem,2.6vw,0.84rem)] text-white/80 mt-[clamp(0.35rem,1.4vw,0.55rem)]">Ticket Booking Date & Time</p>
              <p className="text-[clamp(1.3rem,4.8vw,1.6rem)] leading-tight font-bold text-[hsl(var(--ticket-amber))] mt-[clamp(0.28rem,1.2vw,0.45rem)]">
                {bookedOn}
              </p>
              <p className="text-[clamp(0.62rem,2vw,0.72rem)] text-white/70 mt-[clamp(0.3rem,1.2vw,0.45rem)]">R13731</p>
              <p className="text-[clamp(0.76rem,2.8vw,0.88rem)] text-white/90">Ticket is Non-Transferable</p>
            </div>
          </div>
          <div className="h-[4px] bg-[hsl(var(--muted-foreground))]/35 overflow-hidden">
            <div
              className="h-full bg-[hsl(var(--ticket-green))] transition-[width] duration-1000 ease-linear"
              style={{ width: `${timerProgress}%` }}
            />
          </div>

          {/* White ticket body */}
          <div className="bg-white relative">
            {/* TOP SECTION */}
            <div className="px-[clamp(0.8rem,3vw,1.2rem)] pt-[clamp(0.9rem,3.3vw,1.2rem)] pb-[clamp(0.6rem,2.1vw,0.85rem)] space-y-[clamp(0.72rem,2.7vw,1rem)]">
              <div className="flex items-start justify-between gap-[clamp(0.6rem,2.2vw,0.85rem)]">
                <h3 className="text-[clamp(0.96rem,3.4vw,1.08rem)] font-bold text-foreground"><EditableField field="ticketType" value={editableText.ticketType} /></h3>
                <div className="text-[clamp(0.8rem,2.9vw,0.92rem)] font-bold text-foreground"><EditableField field="ticketCode" value={editableText.ticketCode} /></div>
              </div>

              <div className="flex items-center justify-between gap-[clamp(0.75rem,3vw,1.1rem)] px-[clamp(0.2rem,1vw,0.35rem)]">
                <div
                  style={isEditMode ? {
                    transform: `translate(${positions['source'] ? positions['source'].x : 0}px, ${positions['source'] ? positions['source'].y : 0}px)`,
                    cursor: 'grab',
                  } : {}}
                  onMouseDown={(e) => isEditMode && handleMouseDown('source', e)}
                  className={`text-[clamp(0.95rem,3.6vw,1.18rem)] font-bold leading-none tracking-tight ${isEditMode ? 'bg-yellow-100/20 px-2 py-1 rounded' : ''}`}
                >
                  {passenger.source}
                </div>
                <div className="flex items-center gap-0">
                  <span className="w-[clamp(0.65rem,2.5vw,1rem)] h-[clamp(0.1rem,0.3vw,0.18rem)] bg-gradient-to-r from-foreground/30 to-foreground/10" />
                  <span className="text-[clamp(0.72rem,2.5vw,0.88rem)] font-semibold text-foreground/80 px-[clamp(0.22rem,0.8vw,0.4rem)]">{passenger.distance} km</span>
                  <span className="w-[clamp(0.65rem,2.5vw,1rem)] h-[clamp(0.1rem,0.3vw,0.18rem)] bg-gradient-to-l from-foreground/30 to-foreground/10" />
                </div>
                <div
                  style={isEditMode ? {
                    transform: `translate(${positions['destination'] ? positions['destination'].x : 0}px, ${positions['destination'] ? positions['destination'].y : 0}px)`,
                    cursor: 'grab',
                  } : {}}
                  onMouseDown={(e) => isEditMode && handleMouseDown('destination', e)}
                  className={`text-[clamp(0.95rem,3.6vw,1.18rem)] font-bold leading-none tracking-tight ${isEditMode ? 'bg-yellow-100/20 px-2 py-1 rounded' : ''}`}
                >
                  {passenger.destination}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-[clamp(0.25rem,1vw,0.4rem)]">
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground">Via</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground text-right">Booked on</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-foreground">------</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-foreground text-right font-medium">{bookedOn}</p>
              </div>

              <div className="grid grid-cols-2 gap-y-[clamp(0.25rem,1vw,0.4rem)] pt-[clamp(0.35rem,1.2vw,0.55rem)]">
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground">Valid From</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground text-right">Valid Till</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-foreground font-medium">{validFrom}</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-foreground text-right font-medium">{validTill}</p>
              </div>

              <p className="text-[clamp(0.74rem,2.6vw,0.88rem)] font-semibold text-foreground pt-[clamp(0.2rem,0.8vw,0.35rem)]">
                <EditableField field="fareInfo" value={editableText.fareInfo} />
              </p>
            </div>

            {/* U-CUT NOTCH */}
            <div className="ticket-notch ticket-notch-grey mt-[clamp(0.15rem,0.6vw,0.25rem)]">
              <span className="ticket-notch-line" aria-hidden="true" />
            </div>

            {/* MIDDLE SECTION — Name / ID details */}
            <div className="px-[clamp(0.8rem,3vw,1.2rem)] pt-[clamp(0.35rem,1.2vw,0.55rem)] pb-[clamp(0.75rem,3vw,1rem)] space-y-[clamp(0.55rem,2vw,0.8rem)]">
              <div className="grid grid-cols-2 gap-x-[clamp(1rem,3.8vw,1.45rem)] gap-y-[clamp(0.2rem,0.8vw,0.35rem)]">
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground">Name</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground text-right">Age</p>
                <p className="text-[clamp(0.88rem,2.8vw,0.94rem)] text-foreground font-medium">{passenger.name}</p>
                <p className="text-[clamp(0.88rem,2.8vw,0.94rem)] text-foreground text-right font-medium">{passenger.age} years</p>
              </div>

              <div className="grid grid-cols-2 gap-x-[clamp(1rem,3.8vw,1.45rem)] gap-y-[clamp(0.2rem,0.8vw,0.35rem)]">
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground">ID Type</p>
                <p className="text-[clamp(0.72rem,2.5vw,0.84rem)] text-muted-foreground text-right">ID Number</p>
                <p className="text-[clamp(0.84rem,2.6vw,0.9rem)] text-foreground font-medium">{passenger.idType}</p>
                <p className="text-[clamp(0.84rem,2.6vw,0.9rem)] text-foreground text-right font-medium">{passenger.idNumber}</p>
              </div>
            </div>
          </div>

          {/* Bottom green strip */}
          <div className="bg-[hsl(var(--ticket-green))] h-[10px] rounded-b-2xl" />
        </div>

        {/* Note */}
        <div className="px-[clamp(0.25rem,1vw,0.35rem)] pt-[clamp(0.8rem,3vw,0.95rem)] pb-[clamp(0.7rem,2.6vw,0.9rem)]">
          <div className="rounded-[1.15rem] bg-[#f9e3e5] px-[clamp(1rem,4vw,1.35rem)] py-[clamp(0.78rem,2.9vw,1rem)] text-center text-[clamp(0.73rem,2.7vw,0.87rem)] leading-[1.24] font-normal text-[#ef4f4a] tracking-[-0.015em] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <EditableField field="noteText" value={editableText.noteText} />
          </div>
        </div>

        {/* Book connecting journey */}
        <div className="px-[clamp(0.25rem,1vw,0.35rem)] pb-[clamp(1.25rem,4.5vw,1.6rem)]">
          <button className="w-full rounded-full border-[2px] border-[#2f80ed] bg-[#ffffff] py-[clamp(0.84rem,3.15vw,1rem)] text-[clamp(0.84rem,3vw,0.96rem)] font-normal tracking-[-0.005em] text-[#2f80ed] shadow-[0_0_0_1px_rgba(255,255,255,0.9)_inset] transition hover:bg-[#f8fbff]">
            <EditableField field="bookingButton" value={editableText.bookingButton} />
          </button>
        </div>

        {/* QR card */}
        <div className="bg-[hsl(var(--muted))] px-[clamp(0.9rem,3.5vw,1rem)] pt-[clamp(0.2rem,1vw,0.35rem)] pb-[clamp(0.7rem,2.8vw,0.9rem)]">
          <div className="bg-white flex justify-center px-[clamp(1rem,4vw,1.5rem)] py-[clamp(1rem,4vw,1.3rem)]">
            <img
              src="/QR.png"
              alt="Ticket QR Code"
              className="block w-full max-w-[clamp(12rem,58vw,21rem)] h-auto object-contain"
            />
          </div>
        </div>

        {/* Do you know card */}
        <div className="bg-[hsl(var(--muted))] px-[clamp(0.9rem,3.5vw,1rem)] pt-[clamp(0.2rem,1vw,0.35rem)] pb-[clamp(1rem,4vw,1.2rem)]">
          <div className="bg-white px-[clamp(1rem,4vw,1.5rem)] py-[clamp(1.4rem,5vw,1.8rem)] space-y-[clamp(0.9rem,3.5vw,1.25rem)]">
            <h2 className="text-[clamp(1.4rem,5vw,1.6rem)] font-bold text-foreground">Do you know?</h2>
            <p className="text-[clamp(0.88rem,3.2vw,1rem)] text-foreground/80 leading-relaxed">
              IR recovers only 57% of cost of travel on an average.
            </p>
            <p className="text-[clamp(0.88rem,3.2vw,1rem)] text-foreground/80 leading-relaxed">
              This ticket is booked on a personal user ID. It's sale/purchase is an offence u/s 143 of the Railways Act, 1989
            </p>
            <p className="text-[clamp(0.88rem,3.2vw,1rem)] text-foreground/80 leading-relaxed">
              For enquiry and integrated railway helpline. please dial 139.
            </p>
          </div>
        </div>

        <div className="h-[clamp(1rem,4vw,1.5rem)] bg-[hsl(var(--ticket-bg))]" />
      </div>
    </div>
  );
};

export default BookingDetails;
