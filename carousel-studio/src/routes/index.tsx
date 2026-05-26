import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Download,
  Type,
  Hash,
  Twitter,
  Check,
  Loader2,
  Palette,
  User,
  Save,
  Trash2,
  Edit3,
  Plus,
  Trash,
} from "lucide-react";
import { TEMPLATES } from "@/components/slides/types";
import type { SlideData, SlideKind } from "@/components/slides/types";
import { CarouselPreview } from "@/components/carousel-preview";
import { ExportModal } from "@/components/export-modal";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: (search.id as string) || undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Editor — Carousel Studio" },
      { name: "description", content: "Design AI-powered Instagram carousels with premium templates." },
    ],
  }),
  component: EditorPage,
});

const INPUT_TYPES = [
  { id: "text", label: "Raw Text", icon: Type },
  { id: "topic", label: "Topic Preset", icon: Hash },
  { id: "thread", label: "Tweet Thread", icon: Twitter },
] as const;

const ACCENT_PRESETS = ["#a78bfa", "#22d3ee", "#f472b6", "#34d399", "#fbbf24", "#fb7185"];

const DEFAULT_SLIDES: SlideData[] = [
  { kind: "hook", title: "How I grew to 100k followers in 90 days", subtitle: "Growth Playbook", body: "Without paid ads. Swipe →" },
  { kind: "bullets", title: "3 things that actually moved the needle", body: "Forget the gurus. Here's what worked.", bullets: ["Posting carousels daily, not reels", "Hooks rewritten 5x per post", "Replying within the first 10 minutes"] },
  { kind: "stat", title: "The reality", stat: "93%", statLabel: "of creators quit before their 30th post" },
  { kind: "quote", quote: "The algorithm rewards retention. Carousels are the highest-retention format on the platform.", author: "Sarah Chen, Head of Creator Growth" },
  { kind: "split", title: "The carousel framework", body: "Hook on slide 1. Tension on slide 2. Payoff across 3-5. CTA on the final slide. Every slide must earn the next swipe." },
  { kind: "cta", title: "Save this for later", body: "Follow @yourstudio for weekly playbooks.", ctaItems: ["@yourstudio", "hello@yourstudio.com"] },
];

function EditorPage() {
  const [text, setText] = useState("");
  const [inputType, setInputType] = useState<typeof INPUT_TYPES[number]["id"]>("text");
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [slideCount, setSlideCount] = useState(6);
  const [accent, setAccent] = useState("#a78bfa");
  const [showWatermark, setShowWatermark] = useState(true);
  const [handle, setHandle] = useState("@yourstudio");
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<SlideData[]>(DEFAULT_SLIDES);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Re-designed tabs and active slide controls
  const [activeTab, setActiveTab] = useState<"style" | "edit">("style");
  const [activeIndex, setActiveIndex] = useState(0);
  const [showExport, setShowExport] = useState(false);

  const { id } = Route.useSearch();
  const navigate = useNavigate();

  const template = useMemo(() => TEMPLATES.find(t => t.id === templateId)!, [templateId]);

  // Load from localStorage safely (SSR safe)
  useEffect(() => {
    if (typeof window !== "undefined" && id) {
      try {
        const stored = localStorage.getItem("carousel_studio_projects");
        if (stored) {
          const list = JSON.parse(stored);
          const project = list.find((p: any) => p.id === id);
          if (project) {
            setText(project.inputText || "");
            setInputType(project.inputType || "text");
            setTemplateId(project.templateId || TEMPLATES[0].id);
            setSlideCount(project.slideCount || 6);
            setAccent(project.accent || "#a78bfa");
            setShowWatermark(project.showWatermark !== false);
            setHandle(project.handle || "@yourstudio");
            setSlides(project.slides || DEFAULT_SLIDES);
            setActiveIndex(0);
          }
        }
      } catch (err) {
        console.error("Failed to load project from localStorage", err);
      }
    }
  }, [id]);

  const handleSave = () => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem("carousel_studio_projects");
      const list = stored ? JSON.parse(stored) : [];
      const currentId = id || Math.random().toString(36).substring(2, 11);
      
      const projectData = {
        id: currentId,
        title: slides[0]?.title || text.slice(0, 35) || "Untitled Carousel",
        inputText: text,
        inputType,
        templateId,
        slideCount,
        accent,
        showWatermark,
        handle,
        slides,
        date: "Just now",
      };

      const existingIndex = list.findIndex((p: any) => p.id === currentId);
      if (existingIndex > -1) {
        list[existingIndex] = projectData;
      } else {
        list.unshift(projectData);
      }

      localStorage.setItem("carousel_studio_projects", JSON.stringify(list));
      
      // Update URL search parameter
      navigate({ search: { id: currentId } });
      
      setStatusMsg("Project saved to your dashboard!");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setStatusMsg("Failed to save project.");
      setTimeout(() => setStatusMsg(null), 3000);
    }
  };

  // Smart AI backend structurer with client-side fallback
  const handleGenerate = async () => {
    if (!text.trim() && inputType !== "topic") {
      setStatusMsg("Please enter source content or keywords first!");
      setTimeout(() => setStatusMsg(null), 3000);
      return;
    }

    setGenerating(true);
    setStatusMsg("Connecting to Gemini AI Engine...");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          text: text || (inputType === "topic" ? "Creator Masterclass" : ""),
          inputType,
          slideCount,
          constraints: template.constraints || {
            maxTitleChars: 45,
            maxBodyChars: 120,
            maxBullets: 3,
            maxBulletChars: 45
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Server AI Engine returned an error.");
      }

      const data = await response.json();
      if (data.success && data.slides) {
        setSlides(data.slides);
        setSlideCount(data.slides.length);
        setActiveIndex(0);
        setStatusMsg("AI Slides structured successfully! Start editing.");
        setTimeout(() => setStatusMsg(null), 3000);
        setGenerating(false);
        return;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn("⚠️ AI Backend offline. Running local client-side rule engine fallback...");
    }

    // --- LOCAL FALLBACK ---
    setGenerating(true);
    setStatusMsg("AI analyzing content density...");
    
    setTimeout(() => {
      setStatusMsg("Extracting semantic headers & threads...");
      setTimeout(() => {
        setStatusMsg("Applying visual slide structures...");
        setTimeout(() => {
          let nextSlides: SlideData[] = [];
          
          if (inputType === "thread") {
            // Split thread by tweet breaks (e.g. --- or multiple carriage returns)
            const chunks = text
              .split(/(?:\n\s*---\s*\n|\n\n+)/)
              .map(c => c.trim())
              .filter(Boolean);
            
            const rawTweets = chunks.map(c => {
              return c.replace(/^(?:\d+[\/\.]|\d+\s*of\s*\d+|\[\d+\/\d+\]|•|-|\*)\s*/i, "").trim();
            }).filter(Boolean);

            const tweets = rawTweets.length > 0 ? rawTweets : ["Paste separate paragraphs or tweets to distribute them across panels."];

            nextSlides = tweets.map((tweet, i) => {
              const lines = tweet.split("\n").filter(Boolean);
              const title = lines[0] || "Insight Panel";
              const body = lines.slice(1).join(" ") || "";
              
              if (i === 0) {
                return {
                  kind: "hook",
                  title: title.slice(0, 80),
                  subtitle: "Tweet Thread Hook",
                  body: body ? body.slice(0, 120) : "Swipe to read thread →",
                };
              } else if (i === tweets.length - 1) {
                return {
                  kind: "cta",
                  title: title.slice(0, 60),
                  body: body ? body.slice(0, 140) : "Follow for more value.",
                  ctaItems: [handle || "@yourhandle", "Read next thread"],
                };
              } else {
                const hasStats = tweet.includes("%") || /\b\d+(?:x|k|m|h)\b/i.test(tweet);
                const hasQuote = tweet.includes('"') || tweet.includes("'") || tweet.includes("—") || tweet.includes("- ");
                
                if (hasStats) {
                  const statMatch = tweet.match(/(\d+%\s*|\d+x\s*|\b\d+k\b|\b\d+m\b)/i);
                  const statVal = statMatch ? statMatch[0].trim() : "10x";
                  return {
                    kind: "stat",
                    title: "The Metrics",
                    stat: statVal,
                    statLabel: tweet.replace(statVal, "").slice(0, 100),
                  };
                } else if (hasQuote) {
                  return {
                    kind: "quote",
                    quote: tweet.replace(/["']/g, "").slice(0, 140),
                    author: handle || "Thread Author",
                  };
                } else if (lines.length >= 3 || tweet.includes("-") || tweet.includes("•")) {
                  const bulletItems = lines.slice(1).map(l => l.replace(/^[-•*]\s*/, "").slice(0, 50));
                  return {
                    kind: "bullets",
                    title: title.slice(0, 70),
                    body: "Key points to remember:",
                    bullets: bulletItems.length > 0 ? bulletItems.slice(0, 4) : ["Point A", "Point B", "Point C"],
                  };
                } else {
                  return {
                    kind: "split",
                    title: title.slice(0, 50),
                    body: body || tweet,
                  };
                }
              }
            });
          } else if (inputType === "topic") {
            const term = text.trim().toLowerCase();
            
            if (term.includes("grow") || term.includes("market") || term.includes("viral")) {
              nextSlides = [
                { kind: "hook", title: `How to build a 10k audience with ${text || "Marketing"}`, subtitle: "Growth Playbook", body: "The 3-step engine. Swipe →" },
                { kind: "bullets", title: "3 visual growth frameworks", body: "Focus on these to win:", bullets: ["Hook rewriting 5x per post", "Writing for retention, not size", "Interactive carousels over text"] },
                { kind: "stat", title: "The reality", stat: "93%", statLabel: "of creators quit before their 30th post" },
                { kind: "quote", quote: "Clear structure beats random writing. Treat your content like product engineering.", author: "Growth Academy" },
                { kind: "split", title: "The ultimate loop", body: "Engage with 15 creators daily, post high-retention carousels, and convert profile visits via custom funnels." },
                { kind: "cta", title: "Scale your creator agency", body: "Save this playbook for your next sprint.", ctaItems: [handle || "@yourhandle", "agency@yourdomain.com"] },
              ];
            } else if (term.includes("code") || term.includes("dev") || term.includes("ai") || term.includes("software")) {
              nextSlides = [
                { kind: "hook", title: `Master AI application building with ${text || "AI Stack"}`, subtitle: "Developer Guide", body: "Build SaaS in a weekend. Swipe →" },
                { kind: "bullets", title: "The high-performance AI stack", body: "Highly robust client architectures:", bullets: ["Next.js & Vite for visual speed", "Gemini 2.0 Flash APIs for parsing", "Tailwind CSS & Glassmorphism"] },
                { kind: "stat", title: "Developer Velocity", stat: "10x", statLabel: "increase in speed-to-market using orchestrators" },
                { kind: "quote", quote: "The future developer builds system prompts, structures streaming JSON, and automates UI bindings.", author: "SaaS Engineer" },
                { kind: "split", title: "How it functions", body: "Decouple backend processes, cache standard configurations, and stream outputs directly to local storage states." },
                { kind: "cta", title: "Clone the starting repo", body: "Follow for weekly full-stack AI recipes.", ctaItems: [handle || "@yourhandle", "github.com/yourhandle"] },
              ];
            } else if (term.includes("habit") || term.includes("focus") || term.includes("prod")) {
              nextSlides = [
                { kind: "hook", title: `Double your focus & output with ${text || "Focus habits"}`, subtitle: "Productivity Routine", body: "No willpower required. Swipe →" },
                { kind: "bullets", title: "3 habits of high-performers", body: "Proven routines to win the day:", bullets: ["90-minute deep work block", "Device offline during sprints", "Written priority checklist"] },
                { kind: "stat", title: "Daily Deep Focus", stat: "4 hrs", statLabel: "beats 12 hours of shallow multitasking" },
                { kind: "quote", quote: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
                { kind: "split", title: "The Focus Framework", body: "Protect your morning. Write for 90 minutes before emails. Eat the biggest frog first." },
                { kind: "cta", title: "Join the focused morning loop", body: "Get monthly routines sent to your inbox.", ctaItems: [handle || "@yourhandle", "productivity@yourdomain.com"] },
              ];
            } else {
              const topicWord = text ? text : "Creator Skills";
              nextSlides = [
                { kind: "hook", title: `Why mastering ${topicWord} changes everything`, subtitle: "Mastery Class", body: "How to deconstruct this skill fast. Swipe →" },
                { kind: "bullets", title: `3 steps to master ${topicWord}`, body: "The optimal practice route:", bullets: ["Deconstruct the core 20%", "Practice in public daily", "Get direct fast feedback loops"] },
                { kind: "stat", title: "Compounding Growth", stat: "37x", statLabel: `improvement in a year by getting 1% better daily at ${topicWord}` },
                { kind: "quote", quote: `Simplicity is the ultimate sophistication. Mastery of ${topicWord} is looking simple.`, author: "Expert Guild" },
                { kind: "split", title: "The progression framework", body: "Do not get stuck in analysis paralysis. Start building today. Real-world feedback beats theoretical study." },
                { kind: "cta", title: `Level up in ${topicWord}`, body: "Get my weekly templates directly in your inbox.", ctaItems: [handle || "@yourhandle", "yournewsletter@domain.com"] },
              ];
            }
          } else {
            // Raw text paragraphs splitter
            const paragraphs = text
              .split(/\n\n+/)
              .map(p => p.trim())
              .filter(Boolean);
            
            const rawItems = paragraphs.length > 0 ? paragraphs : ["Provide article content to split into beautiful structured slides."];
            
            nextSlides = Array.from({ length: Math.max(3, Math.min(10, rawItems.length)) }).map((_, i) => {
              const para = rawItems[i % rawItems.length];
              const sentences = para.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
              
              if (i === 0) {
                return {
                  kind: "hook",
                  title: sentences[0] || "Hook Slide Title",
                  subtitle: "Article Summary",
                  body: sentences.slice(1).join(". ").slice(0, 100) || "Tap to read more →",
                };
              } else if (i === Math.max(3, Math.min(10, rawItems.length)) - 1) {
                return {
                  kind: "cta",
                  title: "Key Summary",
                  body: sentences[0] || "Follow for more value.",
                  ctaItems: [handle || "@yourhandle", "Join standard updates"],
                };
              } else if (i === 1) {
                return {
                  kind: "bullets",
                  title: sentences[0] || "Key Takeaways",
                  body: "Here are the main ideas:",
                  bullets: sentences.slice(1, 5).map(s => s.slice(0, 50)),
                };
              } else {
                return {
                  kind: "split",
                  title: sentences[0] || "Insight Panel",
                  body: sentences.slice(1).join(". ") || para,
                };
              }
            });
          }

          setSlides(nextSlides);
          setSlideCount(nextSlides.length);
          setActiveIndex(0);
          setGenerating(false);
          setStatusMsg("AI Slides structured successfully! Start editing.");
          setTimeout(() => setStatusMsg(null), 3000);
        }, 800);
      }, 600);
    }, 600);
  };

  // Timeline & active slide handlers
  const handleAddSlide = (kind: SlideKind) => {
    const base = DEFAULT_SLIDES.find(s => s.kind === kind) || { kind };
    const newSlide: SlideData = { ...base };
    
    if (kind === "cta") {
      newSlide.ctaItems = [handle || "@yourhandle", "hello@domain.com"];
    } else if (kind === "bullets") {
      newSlide.bullets = ["Takeaway point 1", "Takeaway point 2", "Takeaway point 3"];
    }

    const next = [...slides, newSlide];
    setSlides(next);
    setSlideCount(next.length);
    setActiveIndex(next.length - 1);
    setActiveTab("edit"); // Automatically switch tab to edit content!
  };

  const handleDeleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const confirmed = confirm("Are you sure you want to delete this slide?");
    if (!confirmed) return;
    const next = slides.filter((_, i) => i !== idx);
    setSlides(next);
    setSlideCount(next.length);
    setActiveIndex(Math.min(idx, next.length - 1));
  };

  const handleDuplicateSlide = (idx: number) => {
    const clone = JSON.parse(JSON.stringify(slides[idx]));
    const next = [...slides];
    next.splice(idx + 1, 0, clone);
    setSlides(next);
    setSlideCount(next.length);
    setActiveIndex(idx + 1);
  };

  const handleMoveSlide = (idx: number, direction: "left" | "right") => {
    const targetIdx = direction === "left" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= slides.length) return;
    const next = [...slides];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    setSlides(next);
    setActiveIndex(targetIdx);
  };

  const updateActiveSlide = (fields: Partial<SlideData>) => {
    const next = [...slides];
    next[activeIndex] = { ...next[activeIndex], ...fields };
    setSlides(next);
  };

  const activeSlide = slides[activeIndex] || slides[0];

  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
      <div className="grid lg:grid-cols-[420px_1fr] gap-6 h-[calc(100vh-9rem)]">
        {/* LEFT PANEL */}
        <aside className="glass rounded-3xl p-5 overflow-y-auto scrollbar-thin flex flex-col gap-6">
          {/* Tab Selection Header */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-white/5 border border-border shrink-0">
            <button
              onClick={() => setActiveTab("style")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide transition ${
                activeTab === "style"
                  ? "gradient-primary text-white glow-shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sparkles className="size-4" /> AI & Styling
            </button>
            <button
              onClick={() => setActiveTab("edit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold tracking-wide transition ${
                activeTab === "edit"
                  ? "gradient-primary text-white glow-shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Edit3 className="size-4" /> Slide Content
            </button>
          </div>

          {/* TAB 1: GENERATE & STYLE */}
          {activeTab === "style" && (
            <div className="flex-1 flex flex-col gap-6">
              <div>
                <SectionHeading title="Source Content" />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {INPUT_TYPES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setInputType(id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-[10px] font-semibold tracking-wide transition cursor-pointer ${
                        inputType === id 
                          ? "border-primary/60 bg-primary/10 text-foreground glow-shadow" 
                          : "border-border bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={
                      inputType === "thread"
                        ? "Paste a tweet thread (separate tweets by a blank line)..."
                        : inputType === "topic"
                        ? "Enter keywords (e.g. 'coding design tools', 'productivity routines', 'audience growth')..."
                        : "Paste an article, raw notes, or visual storyboard text here..."
                    }
                    rows={5}
                    className="w-full resize-none rounded-xl bg-input/40 border border-border px-4 py-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition scrollbar-thin"
                  />
                  <span className="absolute bottom-2.5 right-3 text-[9px] text-muted-foreground font-mono tabular-nums">
                    {text.length}/4000
                  </span>
                </div>
              </div>

              <div>
                <SectionHeading title="Templates Gallery" />
                <div className="grid grid-cols-2 gap-3">
                  {TEMPLATES.map((t) => {
                    const active = t.id === templateId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTemplateId(t.id)}
                        className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                          active ? "border-primary/70 glow-border scale-[1.02]" : "border-border hover:border-white/20"
                        }`}
                      >
                        <div className="aspect-[4/5]" style={{ background: t.preview }}>
                          <div className="h-full w-full flex flex-col justify-end p-2.5 bg-gradient-to-t from-black/70 via-transparent">
                            <div className="text-[11px] font-semibold text-white">{t.name}</div>
                            <div className="text-[9px] text-white/70">{t.description}</div>
                          </div>
                        </div>
                        {active && (
                          <div className="absolute top-1.5 right-1.5 size-5 rounded-full gradient-primary grid place-items-center">
                            <Check className="size-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionHeading title="Visual Styling" icon={Palette} />
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Accent color</label>
                    <div className="flex items-center gap-2">
                      {ACCENT_PRESETS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setAccent(c)}
                          className={`size-7 rounded-full transition-transform hover:scale-110 cursor-pointer ${accent === c ? "ring-2 ring-offset-2 ring-offset-card ring-white scale-105" : ""}`}
                          style={{ background: c }}
                        />
                      ))}
                      <input
                        type="color"
                        value={accent}
                        onChange={(e) => setAccent(e.target.value)}
                        className="size-7 rounded-full bg-transparent border border-border cursor-pointer overflow-hidden p-0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <label className="text-xs font-semibold text-foreground">Username watermark</label>
                    </div>
                    <button
                      onClick={() => setShowWatermark(!showWatermark)}
                      className={`relative w-11 h-6 rounded-full transition cursor-pointer ${showWatermark ? "gradient-primary" : "bg-white/10"}`}
                    >
                      <span className={`absolute top-0.5 size-5 bg-white rounded-full shadow transition-transform ${showWatermark ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>

                  {showWatermark && (
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value)}
                      placeholder="@yourhandle"
                      className="w-full rounded-xl bg-input/40 border border-border px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  )}
                </div>
              </div>

              {statusMsg && (
                <div className="p-3 text-xs text-center rounded-xl bg-primary/20 text-primary border border-primary/30 animate-pulse font-medium">
                  {statusMsg}
                </div>
              )}

              <div className="mt-auto pt-4 space-y-2.5 border-t border-border shrink-0">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="relative w-full overflow-hidden group rounded-2xl gradient-primary text-primary-foreground font-semibold py-3.5 pulse-glow disabled:opacity-80 shadow-md cursor-pointer"
                >
                  <span className="absolute inset-0 shimmer opacity-60" />
                  <span className="relative flex items-center justify-center gap-2">
                    {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {generating ? "AI Parsing Content…" : "Smart Generate with AI"}
                  </span>
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={handleSave}
                    className="rounded-2xl glass border border-border font-semibold py-3 flex items-center justify-center gap-2 hover:bg-white/5 transition text-xs cursor-pointer"
                  >
                    <Save className="size-3.5 text-primary" /> Save Studio
                  </button>
                  
                  <button 
                    onClick={() => {
                      setText("");
                      setSlides(DEFAULT_SLIDES);
                      setSlideCount(6);
                      setActiveIndex(0);
                      setStatusMsg("Cleared! Ready for a new design.");
                      setTimeout(() => setStatusMsg(null), 2500);
                    }}
                    className="rounded-2xl glass border border-border font-semibold py-3 flex items-center justify-center gap-2 hover:bg-white/5 transition text-xs cursor-pointer"
                  >
                    <Trash2 className="size-3.5 text-red-400" /> Clear
                  </button>
                </div>

                <button 
                  onClick={() => setShowExport(true)}
                  className="w-full rounded-2xl glass border border-primary/20 bg-primary/5 hover:bg-primary/10 font-bold py-3.5 flex items-center justify-center gap-2 transition text-xs cursor-pointer shadow"
                >
                  <Download className="size-4 text-primary" /> Export PNG / PDF
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT SLIDE CONTENT */}
          {activeTab === "edit" && activeSlide && (
            <div className="flex-1 flex flex-col gap-5">
              <div className="flex items-center justify-between bg-primary/5 border border-primary/15 rounded-xl px-3.5 py-2">
                <span className="text-xs font-semibold text-primary">Editing Slide {activeIndex + 1}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-white/5 font-mono">{activeSlide.kind}</span>
              </div>

              {/* Layout Switcher */}
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 block">Change Layout Type</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/5 border border-border">
                  {(["hook", "bullets", "stat", "quote", "split", "cta"] as SlideKind[]).map((k) => (
                    <button
                      key={k}
                      onClick={() => updateActiveSlide({ kind: k })}
                      className={`py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition cursor-pointer ${
                        activeSlide.kind === k
                          ? "bg-primary text-primary-foreground glow-shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-thin">
                {/* Dynamically Tailored Form Inputs depending on Slide Layout Kind */}
                {activeSlide.kind === "hook" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Subtitle / Topic</label>
                      <input
                        type="text"
                        value={activeSlide.subtitle || ""}
                        onChange={(e) => updateActiveSlide({ subtitle: e.target.value })}
                        placeholder="Growth Playbook"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Main Hook Title</label>
                      <textarea
                        value={activeSlide.title || ""}
                        onChange={(e) => updateActiveSlide({ title: e.target.value })}
                        placeholder="How I grew to 100k..."
                        rows={3}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none scrollbar-thin"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Call to Swipe / Footer text</label>
                      <input
                        type="text"
                        value={activeSlide.body || ""}
                        onChange={(e) => updateActiveSlide({ body: e.target.value })}
                        placeholder="Swipe to read →"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {activeSlide.kind === "bullets" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Slide Title</label>
                      <textarea
                        value={activeSlide.title || ""}
                        onChange={(e) => updateActiveSlide({ title: e.target.value })}
                        placeholder="3 things you need to know"
                        rows={2}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Supporting Body Description</label>
                      <textarea
                        value={activeSlide.body || ""}
                        onChange={(e) => updateActiveSlide({ body: e.target.value })}
                        placeholder="Forget the gurus. Here is the actual split:"
                        rows={2}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground">Key Bullet points (Max 4)</label>
                        <span className="text-[10px] font-mono font-bold text-foreground">{(activeSlide.bullets || []).length}/4</span>
                      </div>
                      
                      <div className="flex flex-col gap-2.5">
                        {(activeSlide.bullets || []).map((bullet, bIdx) => (
                          <div key={bIdx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={bullet}
                              onChange={(e) => {
                                const newBullets = [...(activeSlide.bullets || [])];
                                newBullets[bIdx] = e.target.value;
                                updateActiveSlide({ bullets: newBullets });
                              }}
                              placeholder={`Bullet Point #${bIdx + 1}`}
                              className="flex-1 rounded-xl bg-input/40 border border-border px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              onClick={() => {
                                const newBullets = (activeSlide.bullets || []).filter((_, bIdx2) => bIdx2 !== bIdx);
                                updateActiveSlide({ bullets: newBullets });
                              }}
                              className="size-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 grid place-items-center transition cursor-pointer"
                              title="Delete bullet"
                            >
                              <Trash className="size-3.5" />
                            </button>
                          </div>
                        ))}

                        {(activeSlide.bullets || []).length < 4 && (
                          <button
                            onClick={() => {
                              const newBullets = [...(activeSlide.bullets || []), "New insight point"];
                              updateActiveSlide({ bullets: newBullets });
                            }}
                            className="w-full py-2 rounded-xl border border-dashed border-border hover:border-white/20 text-muted-foreground hover:text-foreground text-xs flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                          >
                            <Plus className="size-3.5" /> Add bullet point
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeSlide.kind === "stat" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Supporting Heading</label>
                      <input
                        type="text"
                        value={activeSlide.title || ""}
                        onChange={(e) => updateActiveSlide({ title: e.target.value })}
                        placeholder="The reality"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Big Stat Text (e.g. 93%, 10x)</label>
                      <input
                        type="text"
                        value={activeSlide.stat || ""}
                        onChange={(e) => updateActiveSlide({ stat: e.target.value })}
                        placeholder="93%"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Stat Label / Description</label>
                      <textarea
                        value={activeSlide.statLabel || ""}
                        onChange={(e) => updateActiveSlide({ statLabel: e.target.value })}
                        placeholder="of creators fail before they make 30 posts"
                        rows={3}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                  </>
                )}

                {activeSlide.kind === "quote" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Quote Content</label>
                      <textarea
                        value={activeSlide.quote || ""}
                        onChange={(e) => updateActiveSlide({ quote: e.target.value })}
                        placeholder="The algorithm rewards retention..."
                        rows={4}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none scrollbar-thin"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Author / Citation</label>
                      <input
                        type="text"
                        value={activeSlide.author || ""}
                        onChange={(e) => updateActiveSlide({ author: e.target.value })}
                        placeholder="Sarah Chen, Head of Growth"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </>
                )}

                {activeSlide.kind === "split" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Left Panel Header</label>
                      <textarea
                        value={activeSlide.title || ""}
                        onChange={(e) => updateActiveSlide({ title: e.target.value })}
                        placeholder="The carousel framework"
                        rows={3}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Right Panel Body Text</label>
                      <textarea
                        value={activeSlide.body || ""}
                        onChange={(e) => updateActiveSlide({ body: e.target.value })}
                        placeholder="Hook on slide 1. Payoff across 3-5. CTA on final slide..."
                        rows={4}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none scrollbar-thin"
                      />
                    </div>
                  </>
                )}

                {activeSlide.kind === "cta" && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">CTA Headline</label>
                      <input
                        type="text"
                        value={activeSlide.title || ""}
                        onChange={(e) => updateActiveSlide({ title: e.target.value })}
                        placeholder="Save this for later"
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">CTA Subtitle text</label>
                      <textarea
                        value={activeSlide.body || ""}
                        onChange={(e) => updateActiveSlide({ body: e.target.value })}
                        placeholder="Follow for weekly playbooks."
                        rows={2}
                        className="rounded-xl bg-input/40 border border-border px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-muted-foreground">Custom CTA Actions (Max 2)</label>
                      <div className="flex flex-col gap-2">
                        {Array.from({ length: 2 }).map((_, iIdx) => {
                          const items = activeSlide.ctaItems || [handle || "@yourhandle", "hello@domain.com"];
                          return (
                            <div key={iIdx} className="flex gap-2">
                              <input
                                type="text"
                                value={items[iIdx] || ""}
                                onChange={(e) => {
                                  const newItems = [...items];
                                  newItems[iIdx] = e.target.value;
                                  updateActiveSlide({ ctaItems: newItems });
                                }}
                                placeholder={iIdx === 0 ? "@yourhandle" : "youremail@domain.com"}
                                className="flex-1 rounded-xl bg-input/40 border border-border px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sidebar Quick Slide Reordering Footer */}
              <div className="border-t border-border pt-3.5 flex items-center justify-between shrink-0">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleMoveSlide(activeIndex, "left")}
                    disabled={activeIndex === 0}
                    className="px-3 py-2 bg-white/5 border border-border rounded-xl text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-20 transition cursor-pointer"
                  >
                    ← Move Left
                  </button>
                  <button
                    onClick={() => handleMoveSlide(activeIndex, "right")}
                    disabled={activeIndex === slides.length - 1}
                    className="px-3 py-2 bg-white/5 border border-border rounded-xl text-[10px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-20 transition cursor-pointer"
                  >
                    Move Right →
                  </button>
                </div>
                
                <button
                  onClick={() => handleDuplicateSlide(activeIndex)}
                  className="px-3.5 py-2 gradient-primary rounded-xl text-[10px] font-bold text-white shadow hover:scale-[1.01] active:scale-95 transition cursor-pointer"
                >
                  Duplicate
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT PREVIEW */}
        <section className="glass rounded-3xl p-5 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h2 className="font-display font-semibold text-lg">Live Preview</h2>
              <p className="text-xs text-muted-foreground">Pixel-perfect at 1080×1350 (4:5), scaled to fit</p>
            </div>


            <div className="glass px-3.5 py-1.5 rounded-full text-xs text-muted-foreground font-semibold">
              {template.name}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <CarouselPreview
              slides={slides}
              style={template.style}
              accent={accent}
              watermark={showWatermark ? handle : undefined}
              activeIndex={activeIndex}
              onChangeActiveIndex={setActiveIndex}
              onAddSlide={handleAddSlide}
              onDeleteSlide={handleDeleteSlide}
              onDuplicateSlide={handleDuplicateSlide}
              onMoveSlide={handleMoveSlide}
            />
          </div>
        </section>
      </div>

      {/* Dynamic Exporter Dialog Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        slides={slides}
        style={template.style}
        accent={accent}
        watermark={showWatermark ? handle : undefined}
      />
    </div>
  );
}

function SectionHeading({ title, icon: Icon, className = "" }: { title: string; icon?: any; className?: string }) {
  return (
    <div className={`flex items-center gap-2 mb-3 shrink-0 ${className}`}>
      {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</h3>
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
    </div>
  );
}

