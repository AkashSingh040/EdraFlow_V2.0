const PDF = require("../models/PDF");
const { cloudinary } = require("../middleware/upload");

// ── POST /api/pdf/upload ────────────────────────────────────────────────────
const uploadPDF = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No PDF file uploaded" });
  }

  const { title, description, tags } = req.body;
  if (!title) {
    return res.status(400).json({ message: "Title is required" });
  }

  const parsedTags = tags
    ? tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const pdf = await PDF.create({
    title,
    description: description || "",
    url: req.file.path,          // Cloudinary URL
    publicId: req.file.filename, // Cloudinary public_id
    uploadedBy: req.user._id,
    tags: parsedTags,
  });

  await pdf.populate("uploadedBy", "name email");
  res.status(201).json({ message: "PDF uploaded and pending approval", pdf });
};

// ── GET /api/pdf/public ─────────────────────────────────────────────────────
const getPublicPDFs = async (req, res) => {
  const { page = 1, limit = 12, tag, search } = req.query;

  const filter = { status: "approved" };
  if (tag) filter.tags = tag;
  if (search) filter.title = { $regex: search, $options: "i" };

  const total = await PDF.countDocuments(filter);
  const pdfs = await PDF.find(filter)
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ pdfs, total, page: Number(page), pages: Math.ceil(total / limit) });
};

// ── GET /api/pdf/pending (admin) ────────────────────────────────────────────
const getPendingPDFs = async (req, res) => {
  const pdfs = await PDF.find({ status: "pending" })
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });

  res.json({ pdfs, total: pdfs.length });
};

// ── GET /api/pdf/my ─────────────────────────────────────────────────────────
const getMyPDFs = async (req, res) => {
  const pdfs = await PDF.find({ uploadedBy: req.user._id }).sort({ createdAt: -1 });
  res.json({ pdfs });
};

// ── PUT /api/pdf/approve/:id (admin) ───────────────────────────────────────
const approvePDF = async (req, res) => {
  const pdf = await PDF.findByIdAndUpdate(
    req.params.id,
    { status: "approved" },
    { new: true }
  ).populate("uploadedBy", "name email");

  if (!pdf) return res.status(404).json({ message: "PDF not found" });
  res.json({ message: "PDF approved", pdf });
};

// ── PUT /api/pdf/reject/:id (admin) ────────────────────────────────────────
const rejectPDF = async (req, res) => {
  const pdf = await PDF.findByIdAndUpdate(
    req.params.id,
    { status: "rejected" },
    { new: true }
  ).populate("uploadedBy", "name email");

  if (!pdf) return res.status(404).json({ message: "PDF not found" });
  res.json({ message: "PDF rejected", pdf });
};

// ── DELETE /api/pdf/:id (admin or owner) ───────────────────────────────────
const deletePDF = async (req, res) => {
  const pdf = await PDF.findById(req.params.id);
  if (!pdf) return res.status(404).json({ message: "PDF not found" });

  // Only the owner or an admin can delete
  const isOwner = pdf.uploadedBy.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: "Not authorized to delete this PDF" });
  }

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(pdf.publicId, { resource_type: "raw" });
  await pdf.deleteOne();

  res.json({ message: "PDF deleted" });
};

// ── GET /api/pdf/all (admin) ────────────────────────────────────────────────
const getAllPDFs = async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const pdfs = await PDF.find(filter)
    .populate("uploadedBy", "name email")
    .sort({ createdAt: -1 });

  res.json({ pdfs, total: pdfs.length });
};

module.exports = {
  uploadPDF,
  getPublicPDFs,
  getPendingPDFs,
  getMyPDFs,
  approvePDF,
  rejectPDF,
  deletePDF,
  getAllPDFs,
};
