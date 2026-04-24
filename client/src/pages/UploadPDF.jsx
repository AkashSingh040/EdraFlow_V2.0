import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const UploadPDF = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", description: "", tags: "" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") { toast.error("Only PDF files allowed"); return; }
    if (f.size > 20 * 1024 * 1024) { toast.error("File must be under 20 MB"); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    handleFile(dropped);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a PDF file"); return; }
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", form.title.trim());
    formData.append("description", form.description.trim());
    formData.append("tags", form.tags);

    setLoading(true);
    try {
      await api.post("/pdf/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("PDF uploaded! Waiting for admin approval.");
      navigate("/pdfs");
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload a PDF</h1>
      <p className="text-gray-500 mb-8">Share your notes or resources with the community. Uploads are reviewed before publishing.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
            dragOver ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-indigo-400 hover:bg-gray-50"
          }`}
          onClick={() => document.getElementById("pdf-input").click()}
        >
          <input
            id="pdf-input"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />

          {file ? (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle size={24} className="text-emerald-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="ml-2 text-gray-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">Drop your PDF here or <span className="text-indigo-600">browse</span></p>
              <p className="text-sm text-gray-400 mt-1">PDF only · Max 20 MB</p>
            </>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="e.g. Data Structures Lecture 3"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Brief description of what this document contains…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
          <input
            type="text"
            name="tags"
            value={form.tags}
            onChange={handleChange}
            placeholder="e.g. algorithms, year-2, CS (comma-separated)"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p>Your PDF will be reviewed by an admin before it appears in the public library.</p>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /> Uploading…</>
          ) : (
            <><Upload size={18} /> Upload PDF</>
          )}
        </button>
      </form>
    </div>
  );
};

export default UploadPDF;
