const express = require("express");
const {
  uploadPDF,
  getPublicPDFs,
  getPublicPdfById,
  streamPublicPdf,
  getPendingPDFs,
  getMyPDFs,
  approvePDF,
  rejectPDF,
  deletePDF,
  getAllPDFs,
} = require("../controllers/pdfController");
const { protect, adminOnly } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// Public
router.get("/public", getPublicPDFs);
router.get("/public/:id/stream", streamPublicPdf);
router.get("/public/:id", getPublicPdfById);

// Authenticated student routes
router.post("/upload", protect, upload.single("file"), uploadPDF);
router.get("/my", protect, getMyPDFs);
router.delete("/:id", protect, deletePDF);

// Admin-only routes
router.get("/pending", protect, adminOnly, getPendingPDFs);
router.get("/all", protect, adminOnly, getAllPDFs);
router.put("/approve/:id", protect, adminOnly, approvePDF);
router.put("/reject/:id", protect, adminOnly, rejectPDF);

module.exports = router;
