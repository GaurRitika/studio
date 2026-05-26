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

  const prompt = `You are a strict text-structuring engine.
Your task is to take the provided raw input text and organize/distribute it logically across exactly ${slideCount} slides to fit our visual templates.

INPUT CONTENT TO STRUCTURE:
"${rawText}"

DIRECTIONS:
1. Do NOT fabricate new stories, external facts, or outside information. 
2. ONLY summarize, distill, and structure the provided raw input text.
3. Keep the content authentic to the user's ideas, but parsed into a professional copywriter format.
4. Follow this rigid sequence:
   - Slide 1: Must be a "hook" slide (derived directly from the main theme of the input).
   - Slides 2 to ${slideCount - 1}: Main content slides. Mix slide kinds naturally ("bullets", "stat", "quote", "split") based *only* on facts and text present in the input.
   - Slide ${slideCount} (Final Slide): Must be a "cta" slide (standard handle/call to action).

Character & Limit Rules:
1. Title / Header: Maximum ${c.maxTitleChars} characters.
2. Body Description: Maximum ${c.maxBodyChars} characters.
3. Bullet Lists (only for "bullets" slide kind): Maximum ${c.maxBullets} bullets, and each bullet must be maximum ${c.maxBulletChars} characters.
4. Stat numbers (only for "stat" slide kind): Must be extremely short (e.g., "93%", "10x", "5M").
5. Quotes (only for "quote" slide kind): Punchy quote with author attribution taken from the text.

Ensure ultra-concise, token-optimized, high-impact copywriting. Avoid corporate filler.`;

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
