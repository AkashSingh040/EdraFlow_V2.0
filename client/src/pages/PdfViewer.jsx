import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getApiBasePath } from "../api/axios";
import {
  ArrowLeft,
  Download,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Calendar,
} from "lucide-react";

const PdfViewer = () => {
  const { id } = useParams();
  const [pdf, setPdf] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const base = getApiBasePath();
  const streamUrl = id ? `${base}/pdf/public/${id}/stream` : "";
  const downloadUrl = id ? `${base}/pdf/public/${id}/stream?download=1` : "";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/pdf/public/${id}`);
        if (!cancelled) setPdf(data.pdf);
      } catch {
        if (!cancelled) setError("Could not load this document. It may have been removed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-gray-500">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
        <p className="text-sm">Loading document…</p>
      </div>
    );
  }

  if (error || !pdf) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="flex items-start gap-3 text-red-700 bg-red-50 rounded-xl p-5 border border-red-100">
          <AlertCircle size={22} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{error || "Document not found"}</p>
            <Link
              to="/pdfs"
              className="inline-flex items-center gap-1.5 mt-4 text-sm text-indigo-600 font-medium hover:text-indigo-800"
            >
              <ArrowLeft size={16} />
              Back to library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="border-b border-gray-100 bg-white px-4 py-3 flex flex-wrap items-center gap-3 justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to="/pdfs"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            title="Back to library"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0 flex items-start gap-2">
            <FileText size={22} className="text-indigo-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="font-semibold text-gray-900 truncate">{pdf.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <User size={11} />
                  {pdf.uploadedBy?.name || "Anonymous"}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(pdf.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <a
          href={downloadUrl}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Download size={16} />
          Download
        </a>
      </div>

      <div className="flex-1 min-h-0 bg-gray-100">
        <iframe
          title={pdf.title}
          src={streamUrl}
          className="w-full h-[calc(100vh-8.5rem)] min-h-[480px] border-0"
        />
      </div>
    </div>
  );
};

export default PdfViewer;
