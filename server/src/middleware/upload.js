const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

// Store PDFs in a dedicated Cloudinary folder
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "edraflow/pdfs",
    resource_type: "raw",        // required for non-image files
    allowed_formats: ["pdf"],
    // Use the original filename (sanitised) so the URL is human-readable
    public_id: (req, file) => {
      const name = file.originalname.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
      return `${Date.now()}_${name}`;
    },
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

module.exports = { upload, cloudinary };
