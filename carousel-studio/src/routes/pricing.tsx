import { createFileRoute } from "@tanstack/react-router";
import { Check, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Carousel Studio" },
      { name: "description", content: "Simple pricing for creators. Start free, upgrade for unlimited AI carousels." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Free",
    price: 0,
    description: "Perfect to test the waters",
    icon: Sparkles,
    features: [
      "5 starter templates",
      "Rule-based text structuring",
      "10 exports per month",
      "PNG export",
      "Community support",
    ],
    cta: "Get started",
    highlight: false,
  },
  {
    name: "Pro",
    price: 9,
    description: "For creators shipping daily",
    icon: Zap,
    features: [
      "Unlimited Gemini Flash AI structuring",
      "All 60 premium templates",
      "Unlimited exports (PNG + PDF)",
      "Custom brand colors & fonts",
      "Priority rendering queue",
      "Email support",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
];

function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs text-muted-foreground mb-5">
          <Sparkles className="size-3 text-primary" /> Simple, creator-friendly pricing
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight gradient-text">
          Ship carousels, not configs.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when you want to stop thinking about exports.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {tiers.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.name}
              className={`relative rounded-3xl p-8 transition-all hover:-translate-y-1 ${
                t.highlight
                  ? "glass-strong glow-border"
                  : "glass"
              }`}
            >
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest gradient-primary text-primary-foreground glow-shadow">
                  Most Popular
                </div>
              )}
              <div className="flex items-center gap-3 mb-5">
                <div className={`size-10 rounded-xl grid place-items-center ${t.highlight ? "gradient-primary" : "bg-white/5 border border-border"}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-xl">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-7">
                <span className="text-5xl font-bold tracking-tight">${t.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <button
                className={`w-full rounded-2xl py-3 font-semibold transition ${
                  t.highlight
                    ? "gradient-primary text-primary-foreground pulse-glow"
                    : "glass border border-border hover:bg-white/5"
                }`}
              >
                {t.cta}
              </button>

              <div className="mt-8 space-y-3.5">
                {t.features.map((f) => (
                  <div key={f} className="flex items-start gap-3">
                    <div className={`mt-0.5 shrink-0 size-5 rounded-full grid place-items-center ${t.highlight ? "bg-primary/20 text-primary" : "bg-white/5 text-muted-foreground"}`}>
                      <Check className="size-3" strokeWidth={3} />
                    </div>
                    <span className="text-sm text-foreground/90">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10">
        Cancel anytime. No hidden fees. 30-day money-back guarantee.
      </p>
    </div>
  );
}
