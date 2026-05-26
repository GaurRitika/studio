export type SlideStyle = {
  bg: string;
  title: string;
  body: string;
  accent: string;
  font: string;
};

export type Template = {
  id: string;
  name: string;
  description: string;
  style: SlideStyle;
  preview: string; // gradient css
  constraints?: {
    maxTitleChars?: number;
    maxBodyChars?: number;
    maxBullets?: number;
    maxBulletChars?: number;
  };
};

export const TEMPLATES: Template[] = [
  {
    id: "cyber-dark",
    name: "Cyber Dark",
    description: "Neon violet on slate",
    style: {
      bg: "linear-gradient(135deg, #0b0b1f 0%, #1a0b2e 100%)",
      title: "#ffffff",
      body: "#c5c5d4",
      accent: "#a78bfa",
      font: "'Space Grotesk', sans-serif",
    },
    preview: "linear-gradient(135deg, #0b0b1f, #1a0b2e 60%, #a78bfa)",
  },
  {
    id: "minimal-light",
    name: "Minimal Light",
    description: "Clean editorial",
    style: {
      bg: "linear-gradient(180deg, #fafaf8 0%, #f0efea 100%)",
      title: "#0a0a0a",
      body: "#525252",
      accent: "#0a0a0a",
      font: "'Inter', sans-serif",
    },
    preview: "linear-gradient(135deg, #fafaf8, #e8e6df)",
  },
  {
    id: "creator-gradient",
    name: "Creator Gradient",
    description: "Sunset vibe",
    style: {
      bg: "linear-gradient(135deg, #ff6b6b 0%, #c44569 50%, #574b90 100%)",
      title: "#ffffff",
      body: "#ffe8e8",
      accent: "#ffd93d",
      font: "'Space Grotesk', sans-serif",
    },
    preview: "linear-gradient(135deg, #ff6b6b, #c44569, #574b90)",
  },
  {
    id: "noir-gold",
    name: "Noir Gold",
    description: "Luxury editorial",
    style: {
      bg: "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)",
      title: "#f0d78c",
      body: "#d4d4d4",
      accent: "#c9a84c",
      font: "'Space Grotesk', sans-serif",
    },
    preview: "linear-gradient(135deg, #0d0d0d, #c9a84c)",
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Calm professional",
    style: {
      bg: "linear-gradient(135deg, #0c2340 0%, #1a4a6e 100%)",
      title: "#ffffff",
      body: "#b8d4e8",
      accent: "#5cbdb9",
      font: "'Inter', sans-serif",
    },
    preview: "linear-gradient(135deg, #0c2340, #2d8a9e)",
  },
  {
    id: "mint-fresh",
    name: "Mint Fresh",
    description: "Startup energy",
    style: {
      bg: "linear-gradient(135deg, #0d1b2a 0%, #1b4332 100%)",
      title: "#ffffff",
      body: "#a7f3d0",
      accent: "#2dd4a8",
      font: "'Space Grotesk', sans-serif",
    },
    preview: "linear-gradient(135deg, #0d1b2a, #2dd4a8)",
  },
];

export type SlideKind = "hook" | "bullets" | "stat" | "quote" | "split" | "cta";

export type SlideData = {
  kind: SlideKind;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  stat?: string;
  statLabel?: string;
  quote?: string;
  author?: string;
  handle?: string;
  ctaItems?: string[];
};

