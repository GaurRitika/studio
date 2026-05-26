import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  List,
  Percent,
  Quote,
  Layout,
  ArrowRight,
  Trash2,
  Copy,
  Plus,
} from "lucide-react";
import { RenderSlide } from "./slides/SlideLayouts";
import type { SlideData, SlideStyle, SlideKind } from "./slides/types";

type Props = {
  slides: SlideData[];
  style: SlideStyle;
  accent: string;
  watermark?: string;
  activeIndex: number;
  onChangeActiveIndex: (index: number) => void;
  onAddSlide: (kind: SlideKind) => void;
  onDeleteSlide: (index: number) => void;
  onDuplicateSlide: (index: number) => void;
  onMoveSlide: (index: number, direction: "left" | "right") => void;
};

const LAYOUT_INFO = {
  hook: { icon: Sparkles, label: "Hook" },
  bullets: { icon: List, label: "Bullets" },
  stat: { icon: Percent, label: "Stat" },
  quote: { icon: Quote, label: "Quote" },
  split: { icon: Layout, label: "Split" },
  cta: { icon: ArrowRight, label: "CTA" },
} as const;

export function CarouselPreview({
  slides,
  style,
  accent,
  watermark,
  activeIndex,
  onChangeActiveIndex,
  onAddSlide,
  onDeleteSlide,
  onDuplicateSlide,
  onMoveSlide,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth || 600;
      const h = el.clientHeight || 500;
      let s = Math.min(w / 1080, h / 1350) * 0.90; // scaled for 4:5 portrait (1080x1350)
      if (s <= 0.05 || isNaN(s)) s = 0.35; // absolute minimum default so it's never invisible
      setScale(s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const current = slides[activeIndex];
  const prev = () => onChangeActiveIndex(Math.max(0, activeIndex - 1));
  const next = () => onChangeActiveIndex(Math.min(slides.length - 1, activeIndex + 1));

  return (
    <div className="relative h-full w-full flex flex-col min-h-[500px]">
      {/* Canvas view */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden rounded-3xl w-full min-h-[350px] border border-border bg-slate-950/20"
      >
        {/* Glow under canvas */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        {current && (
          <div className="absolute inset-0 float-in pointer-events-none">
            <div
              className="rounded-[40px] overflow-hidden pointer-events-auto"
              style={{
                width: "1080px",
                height: "1350px", // Premium 4:5 Portrait height
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: "center center",
                boxShadow: "0 40px 100px -25px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
              }}
              key={activeIndex}
            >
              <RenderSlide data={current} style={style} accent={accent} watermark={watermark} />
            </div>
          </div>
        )}



        {/* Nav overlays */}
        <button
          onClick={prev}
          disabled={activeIndex === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 glass-strong rounded-full size-11 grid place-items-center hover:scale-110 active:scale-95 transition disabled:opacity-30 disabled:hover:scale-100 cursor-pointer z-10"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          onClick={next}
          disabled={activeIndex >= slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 glass-strong rounded-full size-11 grid place-items-center hover:scale-110 active:scale-95 transition disabled:opacity-30 disabled:hover:scale-100 cursor-pointer z-10"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Slide timeline strip */}
      <div className="mt-5 p-3 rounded-2xl glass border border-border flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1.5">
          <span className="font-semibold text-foreground">Slide Timeline</span>
          <span className="font-mono tabular-nums">
            Active: Slide {activeIndex + 1} of {slides.length}
          </span>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin w-full max-w-full">
          {slides.map((slide, idx) => {
            const isActive = idx === activeIndex;
            const LayoutIcon = LAYOUT_INFO[slide.kind]?.icon || Sparkles;
            const layoutLabel = LAYOUT_INFO[slide.kind]?.label || "Slide";

            return (
              <div
                key={idx}
                onClick={() => onChangeActiveIndex(idx)}
                className={`group relative shrink-0 w-28 aspect-[4/5] rounded-xl overflow-hidden cursor-pointer transition-all border ${
                  isActive
                    ? "border-primary glow-border scale-[1.03] z-10"
                    : "border-border hover:border-white/30 hover:scale-[1.01]"
                }`}
                style={{ background: style.bg }}
              >
                {/* Visual miniature layout style overlay */}
                <div className="absolute inset-0 flex flex-col justify-between p-2.5 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                  {/* Slide number */}
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md self-start ${
                    isActive ? "gradient-primary text-white" : "bg-white/10 text-white/80"
                  }`}>
                    {idx + 1}
                  </span>

                  {/* Icon Representation */}
                  <div className="flex flex-col items-center gap-1 my-auto text-center">
                    <LayoutIcon className="size-5 text-white/90 drop-shadow" style={{ color: isActive ? accent : style.title }} />
                    <span className="text-[9px] font-medium tracking-wide uppercase text-white/80 select-none">
                      {layoutLabel}
                    </span>
                  </div>

                  {/* Mini Slide Title / Indicator */}
                  <span className="text-[8px] text-white/60 truncate max-w-full text-center">
                    {slide.title || slide.quote || "Untitled"}
                  </span>
                </div>

                {/* Timeline slide actions overlay on hover */}
                <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(idx, "left");
                    }}
                    disabled={idx === 0}
                    className="size-6 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    title="Move Left"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSlide(idx);
                    }}
                    className="size-6 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                    title="Duplicate"
                  >
                    <Copy className="size-3" />
                  </button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSlide(idx);
                    }}
                    disabled={slides.length <= 1}
                    className="size-6 rounded-md bg-red-500/20 hover:bg-red-500/40 text-red-300 flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="size-3" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveSlide(idx, "right");
                    }}
                    disabled={idx === slides.length - 1}
                    className="size-6 rounded-md bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-20 cursor-pointer"
                    title="Move Right"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Slide Trigger */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="w-28 aspect-[4/5] rounded-xl border border-dashed border-border hover:border-white/40 hover:bg-white/[0.02] transition flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="size-5" />
              <span className="text-[10px] font-semibold">Add Slide</span>
            </button>

            {/* Layout Kind Selection Popover */}
            {showAddMenu && (
              <>
                <div
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setShowAddMenu(false)}
                />
                <div className="absolute bottom-[110%] right-0 z-50 w-44 rounded-xl glass-strong border border-border p-2 flex flex-col gap-1 shadow-2xl float-in">
                  <div className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase px-2 py-1 select-none">
                    Choose Layout
                  </div>
                  {Object.entries(LAYOUT_INFO).map(([kind, info]) => {
                    const KindIcon = info.icon;
                    return (
                      <button
                        key={kind}
                        onClick={() => {
                          onAddSlide(kind as SlideKind);
                          setShowAddMenu(false);
                        }}
                        className="flex items-center gap-2.5 w-full px-2 py-1.5 rounded-lg text-xs hover:bg-white/5 transition text-foreground/90 hover:text-foreground cursor-pointer text-left"
                      >
                        <KindIcon className="size-3.5 text-primary" />
                        <span>{info.label} Layout</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

