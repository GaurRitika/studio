import express from "express";
import Carousel from "../models/Carousel.js";

const router = express.Router();

/**
 * @route   POST /api/carousels
 * @desc    Save a new carousel project or overwrite an existing one (Save Studio)
 * @access  Public
 */
router.post("/", async (req, res) => {
  const { id, title, inputText, inputType, templateId, slideCount, accent, slides } = req.body;

  if (!slides || !Array.isArray(slides)) {
    return res.status(400).json({
      error: "Carousel must contain a valid slides array to be saved.",
    });
  }

  try {
    let carouselDoc;

    // If an ID is provided, check if the document already exists in MongoDB
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      carouselDoc = await Carousel.findById(id);
    }

    const carouselData = {
      title: title || slides[0]?.title || "Untitled Carousel",
      inputText: inputText || "",
      inputType: inputType || "text",
      templateId: templateId || "cyber-dark",
      slideCount: Number(slideCount) || slides.length || 6,
      accent: accent || "#a78bfa",
      slidesJson: slides,
    };

    if (carouselDoc) {
      // Overwrite / Update existing document
      console.log(`💾 MongoDB: Overwriting existing carousel ID: ${id}`);
      carouselDoc.set(carouselData);
      await carouselDoc.save();
    } else {
      // Create a fresh new document
      console.log("💾 MongoDB: Saving a new carousel document.");
      carouselDoc = new Carousel(carouselData);
      await carouselDoc.save();
    }

    return res.json({
      success: true,
      carousel: {
        id: carouselDoc._id,
        title: carouselDoc.title,
        inputText: carouselDoc.inputText,
        inputType: carouselDoc.inputType,
        templateId: carouselDoc.templateId,
        slideCount: carouselDoc.slideCount,
        accent: carouselDoc.accent,
        slides: carouselDoc.slidesJson,
        createdAt: carouselDoc.createdAt,
      },
    });

  } catch (err) {
    console.error("🔴 Error inside POST /api/carousels:", err.message);
    return res.status(500).json({
      error: "Failed to save the carousel to the database.",
    });
  }
});

/**
 * @route   GET /api/carousels
 * @desc    List all recent carousels (Dashboard feed, sorted by latest first)
 * @access  Public
 */
router.get("/", async (req, res) => {
  try {
    console.log("💾 MongoDB: Fetching recent saved carousels...");
    const list = await Carousel.find()
      .sort({ createdAt: -1 })
      .limit(50); // Safe pagination limit for MVP

    const formattedList = list.map(c => ({
      id: c._id,
      title: c.title,
      inputText: c.inputText,
      inputType: c.inputType,
      templateId: c.templateId,
      slideCount: c.slideCount,
      accent: c.accent,
      slides: c.slidesJson,
      createdAt: c.createdAt,
    }));

    return res.json({
      success: true,
      carousels: formattedList,
    });
  } catch (err) {
    console.error("🔴 Error inside GET /api/carousels:", err.message);
    return res.status(500).json({
      error: "Failed to load dashboard carousel history.",
    });
  }
});

/**
 * @route   GET /api/carousels/:id
 * @desc    Fetch metadata of a specific carousel by its database ID
 * @access  Public
 */
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid database ID format." });
  }

  try {
    console.log(`💾 MongoDB: Fetching carousel ID: ${id}`);
    const c = await Carousel.findById(id);
    if (!c) {
      return res.status(404).json({ error: "Carousel project not found." });
    }

    return res.json({
      success: true,
      carousel: {
        id: c._id,
        title: c.title,
        inputText: c.inputText,
        inputType: c.inputType,
        templateId: c.templateId,
        slideCount: c.slideCount,
        accent: c.accent,
        slides: c.slidesJson,
        createdAt: c.createdAt,
      },
    });
  } catch (err) {
    console.error("🔴 Error inside GET /api/carousels/:id:", err.message);
    return res.status(500).json({
      error: "Failed to load the requested carousel.",
    });
  }
});

/**
 * @route   DELETE /api/carousels/:id
 * @desc    Permanently delete a carousel record
 * @access  Public
 */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ error: "Invalid database ID format." });
  }

  try {
    console.log(`💾 MongoDB: Deleting carousel ID: ${id}`);
    const result = await Carousel.findByIdAndDelete(id);
    if (!result) {
      return res.status(404).json({ error: "Carousel already deleted or not found." });
    }

    return res.json({
      success: true,
      message: "Carousel deleted from database successfully.",
    });
  } catch (err) {
    console.error("🔴 Error inside DELETE /api/carousels/:id:", err.message);
    return res.status(500).json({
      error: "Failed to delete the carousel from the database.",
    });
  }
});

export default router;
