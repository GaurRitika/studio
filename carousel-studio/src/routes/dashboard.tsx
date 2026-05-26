import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Crown, Sparkles, TrendingUp, Trash2, ArrowRight } from "lucide-react";
import { TEMPLATES } from "@/components/slides/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Carousel Studio" },
      { name: "description", content: "Your creator history and usage metrics." },
    ],
  }),
  component: DashboardPage,
});

const DEFAULT_METRICS = [
  { label: "Saved projects", value: "0", trend: "Active locally", icon: Download, accent: "from-violet-500 to-indigo-500" },
  { label: "Plan status", value: "Free", trend: "Upgrade for AI", icon: Crown, accent: "from-amber-400 to-orange-500" },
  { label: "AI usage", value: "0/10", trend: "Monthly limit", icon: Sparkles, accent: "from-fuchsia-500 to-pink-500" },
];

function DashboardPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("carousel_studio_projects");
        if (stored) {
          setProjects(JSON.parse(stored));
        }
      } catch (err) {
        console.error("Failed to load local storage projects", err);
      }
    }
  }, []);

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    const confirmed = confirm("Are you sure you want to delete this carousel?");
    if (!confirmed) return;
    
    const next = projects.filter((p: any) => p.id !== projectId);
    setProjects(next);
    localStorage.setItem("carousel_studio_projects", JSON.stringify(next));
  };

  const getTemplatePreview = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    return template.preview;
  };

  const getTemplateName = (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
    return template.name;
  };

  // Dynamically update metrics based on actual local storage length
  const metrics = [
    { ...DEFAULT_METRICS[0], value: String(projects.length) },
    { ...DEFAULT_METRICS[1] },
    { ...DEFAULT_METRICS[2], value: `${projects.filter(p => p.inputText).length}/10` }
  ];

  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight gradient-text">Your studio</h1>
          <p className="text-muted-foreground mt-1.5">Pick up where you left off.</p>
        </div>
        <button 
          onClick={() => navigate({ to: "/", search: {} })}
          className="rounded-2xl gradient-primary text-primary-foreground font-semibold px-5 py-2.5 pulse-glow flex items-center gap-2"
        >
          <Sparkles className="size-4" /> New carousel
        </button>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-3 gap-5 mb-10">
        {metrics.map(({ label, value, trend, icon: Icon, accent }) => (
          <div key={label} className="glass rounded-2xl p-5 relative overflow-hidden group hover:-translate-y-0.5 transition">
            <div className={`absolute -top-10 -right-10 size-32 rounded-full opacity-20 blur-2xl bg-gradient-to-br ${accent}`} />
            <div className="flex items-start justify-between relative">
              <div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className="mt-2 text-3xl font-bold font-display">{value}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3" /> {trend}
                </p>
              </div>
              <div className={`size-10 rounded-xl grid place-items-center bg-gradient-to-br ${accent} text-white`}>
                <Icon className="size-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* History */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl">Recent carousels</h2>
        <span className="text-xs text-muted-foreground">{projects.length} total saved locally</span>
      </div>

      {projects.length === 0 ? (
        <div className="glass rounded-3xl p-16 text-center max-w-xl mx-auto mt-6 flex flex-col items-center">
          <div className="size-16 rounded-full bg-primary/10 grid place-items-center mb-6 text-primary">
            <Sparkles className="size-8 animate-pulse" />
          </div>
          <h3 className="text-xl font-bold font-display">No carousels created yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Launch the designer, paste your notes or enter a topic, and structure your slides using pre-built locked layouts.
          </p>
          <button
            onClick={() => navigate({ to: "/", search: {} })}
            className="mt-6 rounded-2xl gradient-primary text-primary-foreground font-semibold px-6 py-3 flex items-center gap-2 hover:scale-[1.02] transition"
          >
            Create Your First Carousel <ArrowRight className="size-4" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {projects.map((p) => (
            <div 
              key={p.id} 
              onClick={() => navigate({ to: "/", search: { id: p.id } })}
              className="group glass rounded-2xl overflow-hidden hover:-translate-y-1 transition cursor-pointer relative"
            >
              <div className="aspect-square relative overflow-hidden" style={{ background: getTemplatePreview(p.templateId) }}>
                <div className="absolute inset-0 p-5 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent">
                  <div className="text-[10px] uppercase tracking-widest text-white/70 mb-1">{getTemplateName(p.templateId)}</div>
                  <div className="text-white font-semibold text-sm leading-tight line-clamp-2">{p.title}</div>
                </div>
                <div className="absolute top-3 right-3 glass-strong rounded-full px-2.5 py-1 text-[10px] font-medium">
                  {p.slideCount || p.slides?.length || 6} slides
                </div>
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{p.date || "Saved"}</span>
                <button 
                  onClick={(e) => handleDelete(e, p.id)}
                  className="size-7 rounded-lg hover:bg-red-500/20 hover:text-red-400 grid place-items-center text-muted-foreground transition"
                  title="Delete project"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
