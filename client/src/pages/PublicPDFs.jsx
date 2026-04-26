import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { getApiBasePath } from "../api/axios";
import {
  FileText,
  Search,
  Tag,
  Loader2,
  AlertCircle,
  User,
  Calendar,
  BookOpen,
  Download,
} from "lucide-react";

const PDFCard = ({ pdf }) => {
  const downloadHref = `${getApiBasePath()}/pdf/public/${pdf._id}/stream?download=1`;
  return (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText size={20} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 truncate">{pdf.title}</h3>
        {pdf.description && (
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{pdf.description}</p>
        )}
      </div>
    </div>

    {/* Tags */}
    {pdf.tags?.length > 0 && (
      <div className="flex flex-wrap gap-1.5">
        {pdf.tags.map((t) => (
          <span key={t} className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
            <Tag size={10} />
            {t}
          </span>
        ))}
      </div>
    )}

    {/* Meta */}
    <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-50">
      <span className="flex items-center gap-1">
        <User size={11} />
        {pdf.uploadedBy?.name || "Anonymous"}
      </span>
      <span className="flex items-center gap-1">
        <Calendar size={11} />
        {new Date(pdf.createdAt).toLocaleDateString()}
      </span>
    </div>

    <div className="flex flex-col gap-2">
      <Link
        to={`/pdfs/${pdf._id}`}
        className="flex items-center justify-center gap-2 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
      >
        <BookOpen size={15} />
        Read online
      </Link>
      <a
        href={downloadHref}
        className="flex items-center justify-center gap-2 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Download size={15} />
        Download
      </a>
    </div>
  </div>
  );
};

const PublicPDFs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  /** What the user is typing (not sent to the API until Search). */
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  /** Query actually used for GET /pdf/public (full library, paginated). */
  const [appliedSearch, setAppliedSearch] = useState(() => searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Keep in sync when the URL changes (e.g. back/forward, shared link).
  useEffect(() => {
    const q = searchParams.get("search") || "";
    setSearchInput(q);
    setAppliedSearch(q);
    setPage(1);
  }, [searchParams]);

  const fetchPDFs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: 12 };
      if (appliedSearch.trim()) params.search = appliedSearch.trim();
      const { data } = await api.get("/pdf/public", { params });
      setPdfs(data.pdfs);
      setPages(data.pages);
      setTotal(data.total);
    } catch {
      setError("Failed to load PDFs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, page]);

  useEffect(() => {
    fetchPDFs();
  }, [fetchPDFs]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    setAppliedSearch(q);
    setPage(1);
    setSearchParams(q ? { search: q } : {});
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Library</h1>
        <p className="text-gray-500">Browse approved study materials shared by students</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-lg">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Search
        </button>
        {(searchInput || appliedSearch) && (
          <button
            type="button"
            onClick={() => {
              setSearchInput("");
              setAppliedSearch("");
              setPage(1);
              setSearchParams({});
            }}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500 mb-5">
          {total} document{total !== 1 ? "s" : ""} found
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 text-red-600 bg-red-50 rounded-xl p-4">
          <AlertCircle size={20} />
          {error}
        </div>
      ) : pdfs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No PDFs found</p>
          <p className="text-sm">Try a different search term</p>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {pdfs.map((pdf) => <PDFCard key={pdf._id} pdf={pdf} />)}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    p === page
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PublicPDFs;
