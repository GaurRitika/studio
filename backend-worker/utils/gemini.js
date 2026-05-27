import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Helper to determine if the input is a keyword-only topic
const isKeywordInput = (text) => {
  if (!text) return true;
  const wordCount = text.trim().split(/\s+/).length;
  const sentenceCount = text.split(/[.!?]/).filter(Boolean).length;
  return wordCount < 15 || sentenceCount < 2;
};

/**
 * Calls Gemini 2.0 Flash to expand and structure raw input text into slide JSON.
 * Leverages native responseSchema to ensure 100% reliable structural returns.
 * 
 * @param {string} rawText - Raw input content, tweet thread, or keywords
 * @param {string} inputType - "text" | "topic" | "thread"
 * @param {number} slideCount - Number of slides to generate (3 to 10)
 * @param {object} constraints - Character and bullet limits of the selected template
 * @returns {Promise<Array>} - Array of parsed slide objects conforming to SlideData schema
 */
export async function generateStructuredSlides(rawText, inputType, slideCount = 6, constraints = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY inside backend environment variables.");
  }

  // Initialize the standard Google Generative AI Client
  const genAI = new GoogleGenerativeAI(apiKey);

  // Get constraints with safe default fallbacks
  const c = {
    maxTitleChars: constraints.maxTitleChars || 45,
    maxBodyChars: constraints.maxBodyChars || 120,
    maxBullets: constraints.maxBullets || 3,
    maxBulletChars: constraints.maxBulletChars || 45,
  };

  const isKeyword = isKeywordInput(rawText) || inputType === "topic";
  
  const modeInstruction = isKeyword
    ? `MODE: CREATIVE EXPANSION MODE (Short Input detected: "${rawText}")
- The user has provided a brief keyword or topic.
- You must act as an expert content creator, senior copywriter, and subject matter authority.
- Do NOT restrict yourself to the input words! Use your vast internal world knowledge to write deep, valuable, high-impact educational content on this theme.
- Brainstorm a highly viral hook, establish the core steps/concepts, design highly relevant industry statistics or quotes, and structure a complete high-value masterclass deck of exactly ${slideCount} slides.`
    : `MODE: RICH ELABORATION & STRUCTURING MODE (Dense Input detected: "${rawText.slice(0, 100)}...")
- The user has provided a detailed paragraph, tweet thread, or knowledge base.
- Do NOT simply cut, paste, or summarize in fragments!
- Synthesize, elaborate, and explain the core values deeply. Keep the content authentic to the user's ideas, but fully fleshed out.
- Ensure every slide is packed with enough high-value, detailed, readable copy so the slide designs look rich and complete rather than empty or sparse.`;

  const prompt = `You are Carousel Studio AI, a world-class professional copywriter and design-focused content architect.
Your task is to take the provided raw input text and structure it into exactly ${slideCount} premium, high-impact slide components.

INPUT CONTENT:
"${rawText}"

${modeInstruction}

SLIDE SEQUENCE DIRECTIVES:
1. Slide 1 (Hook Slide): Must be a highly clickable, high-converting headline (Hook) that grabs immediate attention. Include a compelling sub-topic tag or category in 'subtitle'.
2. Slides 2 to ${slideCount - 1} (Content Slides): Distribute the key educational concepts or steps. Mix slide kinds naturally ("bullets", "stat", "quote", "split").
3. Slide ${slideCount} (Final Slide): Must be a "cta" slide (Call to Action). Include standard handles/contacts in 'ctaItems' or support text in 'body'.

CONTENT DENSITY & STYLE RULES:
- Title / Header (Max ${c.maxTitleChars} chars): Make every title punchy, active, and benefit-driven.
- Body Description (Max ${c.maxBodyChars} chars): Write rich, engaging support paragraphs. Do not write single-word placeholders.
- Bullet Lists (Max ${c.maxBullets} bullets, Max ${c.maxBulletChars} chars each): Each bullet must be a complete, high-value takeaway thought (e.g. 6-12 words per bullet) rather than short fragments.
- Stat Numbers (only for "stat" slide kind): Use a high-impact metric. If none is in the input, brainstorm a realistic estimated metric (e.g. "82%", "10x", "150M", "4.8B") and write a comprehensive support label explaining its significance.
- Quotes (only for "quote" slide kind): Provide a memorable, inspiring pull quote. If none is present, formulate a premium quote matching the theme, and attribute it to a logical authority or generic title (e.g., "SaaS Founder", "Growth Advisor").
- Split layout (only for "split" slide kind): Provide a detailed paragraph that fully explains a key concept.

Structure the slides beautifully, ensuring premium, token-optimized, high-impact copywriting. Avoid corporate filler.`;

  // Enforce strict JSON Schema constraints using Gemini's native Type system
  const responseSchema = {
    type: "OBJECT",
    properties: {
      slides: {
        type: "ARRAY",
        description: `Array of exactly ${slideCount} slides representing the carousel.`,
        items: {
          type: "OBJECT",
          properties: {
            kind: {
              type: "STRING",
              enum: ["hook", "bullets", "stat", "quote", "split", "cta"],
              description: "The specific slide layout type."
            },
            title: {
              type: "STRING",
              description: "Primary header title of the slide. Use hook title for slide 1."
            },
            subtitle: {
              type: "STRING",
              description: "Optional category tag or micro-heading (useful for Slide 1 hook tag)."
            },
            body: {
              type: "STRING",
              description: "Support narrative or body paragraph. Max limit applies."
            },
            bullets: {
              type: "ARRAY",
              description: "List of punchy takeaways. Required only for 'bullets' slide kind.",
              items: { type: "STRING" }
            },
            stat: {
              type: "STRING",
              description: "Huge metric value (e.g. '93%', '5.8B'). Required only for 'stat' slide kind."
            },
            statLabel: {
              type: "STRING",
              description: "Supporting text for the statistic. Required only for 'stat' slide kind."
            },
            quote: {
              type: "STRING",
              description: "Large pull quote text. Required only for 'quote' slide kind."
            },
            author: {
              type: "STRING",
              description: "Quote creator or speaker. Required only for 'quote' slide kind."
            }
          },
          required: ["kind"]
        }
      }
    },
    required: ["slides"]
  };

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: "You are Carousel Studio AI, a world-class professional copywriter who structures messy content into clear, high-impact slides. You always follow specified layout kinds and strict character limits.",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const response = await result.response;
    const responseText = response.text();
    
    if (!responseText) {
      throw new Error("Received empty response from Gemini API.");
    }

    const data = JSON.parse(responseText);
    return data.slides;
  } catch (err) {
    console.error("🔴 Error inside generateStructuredSlides:", err.message);
    throw err;
  }
}
