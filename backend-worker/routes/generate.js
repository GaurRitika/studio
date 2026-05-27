import express from "express";
import { generateStructuredSlides } from "../utils/gemini.js";
import { validateAndFix } from "../utils/validator.js";

const router = express.Router();

/**
 * @route   POST /api/generate
 * @desc    Expand and structure raw input into slide JSON via Gemini 2.0 Flash (AI Structurer)
 *          Passes slides through Validate & Fix constraint layer before returning.
 * @access  Public (In MVP, will be gated server-side by Stripe subscription check in server.js)
 */
router.post("/", async (req, res) => {
  const { text, inputType, slideCount, constraints } = req.body;

  // 1. Validation check on required parameters
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({
      error: "Input text/content is required to generate a carousel.",
    });
  }

  const cleanInputType = inputType || "text";
  const cleanSlideCount = Math.max(3, Math.min(10, Number(slideCount) || 6));
  const activeConstraints = constraints || {};

  console.log(`🤖 AI Request: Generating ${cleanSlideCount} slides from '${cleanInputType}' input.`);

  try {
    // 2. Call Stage 3 AI Structurer (Gemini 2.0 Flash)
    const rawSlides = await generateStructuredSlides(
      text,
      cleanInputType,
      cleanSlideCount,
      activeConstraints
    );

    // 3. Call Stage 4 Validate & Fix layer
    const safeSlides = validateAndFix(rawSlides, activeConstraints);

    console.log("✅ AI Generation and Validation complete. Returning secure slide array.");
    
    // 4. Return sanitized data to the client
    return res.json({
      success: true,
      slides: safeSlides,
    });
  } catch (err) {
    console.error("🔴 Error in /api/generate handler:", err.message);

    // Differentiate between Quota exceeded, API Key issue, and general engine error
    if (err.message.includes("429") || err.message.toLowerCase().includes("quota")) {
      return res.status(429).json({
        error: "Your Gemini API Key has exceeded its free tier rate limits/quota. Carousel Studio is automatically running your local high-fidelity fallback engine to structure your slides! Start editing or check your billing details on Google AI Studio.",
      });
    }

    if (err.message.includes("API_KEY")) {
      return res.status(500).json({
        error: "Server configuration issue: Gemini API key is missing or invalid.",
      });
    }

    return res.status(500).json({
      error: "Failed to generate carousel slides. The AI model might be overloaded. Please try again.",
    });
  }
});

export default router;
