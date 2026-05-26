import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default: "free"
  },
  stripeCustomerId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Avoid OverwriteModelError on hot-reloading in dev environment
export default mongoose.models.User || mongoose.model("User", UserSchema);
