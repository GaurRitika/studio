import { Check, Quote, ArrowRight, Sparkles } from "lucide-react";
import type { SlideData, SlideStyle } from "./types";

type Props = { data: SlideData; style: SlideStyle; accent: string; watermark?: string };

const wrap = (style: SlideStyle, accent: string): React.CSSProperties => ({
  background: style.bg,
  color: style.title,
  fontFamily: style.font,
  ["--bg-color" as any]: style.bg,
  ["--title-color" as any]: style.title,
  ["--body-color" as any]: style.body,
  ["--accent" as any]: accent || style.accent,
});

function Watermark({ handle, style }: { handle?: string; style: SlideStyle }) {
  if (!handle) return null;
  return (
    <div
      className="absolute bottom-10 left-10 flex items-center gap-3 text-[28px] opacity-80"
      style={{ color: style.body }}
    >
      <div
        className="size-12 rounded-full grid place-items-center font-semibold"
        style={{ background: `var(--accent)`, color: style.bg.includes("#fff") || style.bg.includes("fafa") ? "#fff" : "#0a0a0a" }}
      >
        {handle.replace("@", "")[0]?.toUpperCase()}
      </div>
      <span style={{ color: style.body }}>{handle}</span>
    </div>
  );
}

export function HookSlide({ data, style, accent, watermark }: Props) {
  return (
    <div className="relative w-full h-full p-24 flex flex-col justify-center" style={wrap(style, accent)}>
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full mb-10 self-start" style={{ background: `${accent}22`, color: accent }}>
        <Sparkles className="size-7" />
        <span className="text-[28px] font-medium">{data.subtitle || "Insight"}</span>
      </div>
      <h1 className="text-[110px] leading-[1.02] font-bold tracking-tight" style={{ color: style.title }}>
        {data.title || "The hook that stops the scroll"}
      </h1>
      <p className="mt-10 text-[40px] max-w-[80%]" style={{ color: style.body }}>
        {data.body || "Tap to read more →"}
      </p>
      <Watermark handle={watermark} style={style} />
    </div>
  );
}

export function BulletsSlide({ data, style, accent, watermark }: Props) {
  const bullets = data.bullets?.length ? data.bullets : ["First key insight", "Second important point", "Third takeaway"];
  const isCompact = bullets.length > 3;
  return (
    <div className="relative w-full h-full p-24 flex flex-col" style={wrap(style, accent)}>
      <h2 className={`leading-[1.05] font-bold tracking-tight ${isCompact ? "text-[70px]" : "text-[80px]"}`} style={{ color: style.title }}>
        {data.title || "3 things you need to know"}
      </h2>
      <p className={`mt-6 max-w-[85%] ${isCompact ? "text-[28px] mt-4" : "text-[32px]"}`} style={{ color: style.body }}>
        {data.body || "Here's the breakdown that changes everything."}
      </p>
      <div className={`flex flex-col ${isCompact ? "mt-10 gap-6" : "mt-16 gap-10"}`}>
        {bullets.slice(0, 4).map((b, i) => (
          <div key={i} className="flex items-start gap-8">
            <div className={`shrink-0 rounded-2xl grid place-items-center ${isCompact ? "size-16" : "size-20"}`} style={{ background: `${accent}22`, color: accent }}>
              <Check className={isCompact ? "size-10" : "size-12"} strokeWidth={3} />
            </div>
            <p className={`leading-[1.2] font-medium pt-2 ${isCompact ? "text-[36px]" : "text-[42px]"}`} style={{ color: style.title }}>{b}</p>
          </div>
        ))}
      </div>
      <Watermark handle={watermark} style={style} />
    </div>
  );
}

export function StatSlide({ data, style, accent, watermark }: Props) {
  return (
    <div className="relative w-full h-full p-24 flex flex-col items-center justify-center text-center" style={wrap(style, accent)}>
      <p className="text-[36px] uppercase tracking-[0.3em] mb-10" style={{ color: style.body }}>
        {data.title || "The reality"}
      </p>
      <div
        className="text-[280px] leading-none font-bold tracking-tighter"
        style={{
          color: accent,
          textShadow: `0 0 80px ${accent}88, 0 0 160px ${accent}44`,
        }}
      >
        {data.stat || "93%"}
      </div>
      <p className="mt-12 text-[44px] max-w-[80%] leading-[1.2] font-medium" style={{ color: style.title }}>
        {data.statLabel || "of creators never make it past slide 2"}
      </p>
      <Watermark handle={watermark} style={style} />
    </div>
  );
}

export function QuoteSlide({ data, style, accent, watermark }: Props) {
  return (
    <div className="relative w-full h-full p-24 flex flex-col justify-center" style={wrap(style, accent)}>
      <Quote className="size-40 mb-6" style={{ color: accent, opacity: 0.4 }} strokeWidth={1.5} />
      <div className="border-l-[8px] pl-12" style={{ borderColor: accent }}>
        <p className="text-[64px] leading-[1.2] font-medium italic" style={{ color: style.title }}>
          "{data.quote || "The best carousels feel like a single thought, broken across panels."}"
        </p>
        <p className="mt-12 text-[32px]" style={{ color: style.body }}>
          — {data.author || "Anonymous Creator"}
        </p>
      </div>
      <Watermark handle={watermark} style={style} />
    </div>
  );
}

export function SplitSlide({ data, style, accent, watermark }: Props) {
  return (
    <div className="relative w-full h-full grid grid-cols-2" style={wrap(style, accent)}>
      <div className="p-24 flex flex-col justify-center" style={{ background: `${accent}11` }}>
        <div className="h-2 w-24 mb-8" style={{ background: accent }} />
        <h2 className="text-[88px] leading-[1.02] font-bold tracking-tight" style={{ color: style.title }}>
          {data.title || "The framework"}
        </h2>
      </div>
      <div className="p-24 flex flex-col justify-center">
        <p className="text-[36px] leading-[1.35]" style={{ color: style.body }}>
          {data.body || "Break complex ideas into bite-size, scannable moments. Each slide must earn the next swipe by ending on tension."}
        </p>
      </div>
      <Watermark handle={watermark} style={style} />
    </div>
  );
}

export function CTASlide({ data, style, accent, watermark }: Props) {
  const items = data.ctaItems?.length ? data.ctaItems : [watermark || "@yourhandle", "youremail@domain.com"];
  return (
    <div className="relative w-full h-full p-24 flex flex-col items-center justify-center text-center" style={wrap(style, accent)}>
      <div
        className="size-44 rounded-full mb-12 grid place-items-center text-[80px] font-bold"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}88)`, color: "#fff", boxShadow: `0 20px 80px ${accent}66` }}
      >
        {(watermark || "@you").replace("@", "")[0]?.toUpperCase()}
      </div>
      <h2 className="text-[88px] leading-[1.02] font-bold tracking-tight mb-8" style={{ color: style.title }}>
        {data.title || "Save this for later"}
      </h2>
      <p className="text-[36px] mb-16 max-w-[80%]" style={{ color: style.body }}>
        {data.body || "Follow for more on building in public."}
      </p>
      <div className="flex flex-col gap-5 w-full max-w-[700px]">
        {items.slice(0, 2).map((v, i) => (
          <div key={i} className="rounded-2xl px-8 py-6 text-[32px] text-left flex items-center justify-between"
            style={{ background: `${accent}18`, color: style.title, border: `2px solid ${accent}44` }}>
            <span>{v}</span>
            <ArrowRight className="size-10" style={{ color: accent }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RenderSlide(props: Props) {
  switch (props.data.kind) {
    case "hook": return <HookSlide {...props} />;
    case "bullets": return <BulletsSlide {...props} />;
    case "stat": return <StatSlide {...props} />;
    case "quote": return <QuoteSlide {...props} />;
    case "split": return <SplitSlide {...props} />;
    case "cta": return <CTASlide {...props} />;
  }
}
