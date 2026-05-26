import mongoose from "mongoose";

const CarouselSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null // In local MVP, allows guests to test and save before logging in
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: "Untitled Carousel"
  },
  inputText: {
    type: String,
    default: ""
  },
  inputType: {
    type: String,
    enum: ["text", "topic", "thread"],
    default: "text"
  },
  templateId: {
    type: String,
    required: true,
    default: "cyber-dark"
  },
  slideCount: {
    type: Number,
    required: true,
    min: 3,
    max: 10,
    default: 6
  },
  accent: {
    type: String,
    default: "#a78bfa"
  },
  slidesJson: {
    type: mongoose.Schema.Types.Mixed, // Holds the parsed slide arrays
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid OverwriteModelError on hot-reloading in dev environment
export default mongoose.models.Carousel || mongoose.model("Carousel", CarouselSchema);
