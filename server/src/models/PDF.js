const mongoose = require("mongoose");

const pdfSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
    },
    url: {
      type: String,
      required: [true, "File URL is required"],
    },
    publicId: {
      type: String, // Cloudinary public_id for deletion
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    tags: {
      type: [String],
      default: [],
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
  },
  { timestamps: true }
);

// Index for fast public queries
pdfSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("PDF", pdfSchema);
