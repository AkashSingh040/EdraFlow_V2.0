import { useState, useEffect } from "react";
import api from "../../api/axios";
import {
  LayoutDashboard, FileText, CheckCircle, XCircle, Clock,
  RefreshCw, Loader2, AlertCircle, ExternalLink, Users, Tag, User
} from "lucide-react";
import toast from "react-hot-toast";

// ── Stats card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
      <Icon size={22} className="text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

// ── Single pending PDF row ──────────────────────────────────────────────────
const PendingRow = ({ pdf, onApprove, onReject, loading }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText size={20} className="text-amber-600" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{pdf.title}</h3>
          {pdf.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{pdf.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User size={11} />
              {pdf.uploadedBy?.name}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {new Date(pdf.createdAt).toLocaleDateString()}
            </span>
            {pdf.tags?.map((t) => (
              <span key={t} className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                <Tag size={9} /> {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={pdf.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Preview"
          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <ExternalLink size={16} />
        </a>
        <button
          onClick={() => onApprove(pdf._id)}
          disabled={loading === pdf._id}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {loading === pdf._id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          Approve
        </button>
        <button
          onClick={() => onReject(pdf._id)}
          disabled={loading === pdf._id}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <XCircle size={14} />
          Reject
        </button>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const [pendingPDFs, setPendingPDFs] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [fetching, setFetching] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState("pending");

  const fetchData = async () => {
    setFetching(true);
    try {
      const [pendingRes, allRes] = await Promise.all([
        api.get("/pdf/pending"),
        api.get("/pdf/all"),
      ]);
      setPendingPDFs(pendingRes.data.pdfs);
      const all = allRes.data.pdfs;
      setStats({
        total: all.length,
        approved: all.filter((p) => p.status === "approved").length,
        rejected: all.filter((p) => p.status === "rejected").length,
        pending: all.filter((p) => p.status === "pending").length,
      });
    } catch {
      toast.error("Failed to load data");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.put(`/pdf/approve/${id}`);
      toast.success("PDF approved and published!");
      await fetchData();
    } catch {
      toast.error("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await api.put(`/pdf/reject/${id}`);
      toast.success("PDF rejected");
      await fetchData();
    } catch {
      toast.error("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <LayoutDashboard size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 text-sm">Manage PDFs and platform content</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={fetching}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} className={fetching ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FileText} label="Total PDFs" value={stats.total} color="bg-indigo-500" />
        <StatCard icon={Clock} label="Pending" value={stats.pending} color="bg-amber-500" />
        <StatCard icon={CheckCircle} label="Approved" value={stats.approved} color="bg-emerald-500" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} color="bg-red-500" />
      </div>

      {/* Content */}
      {fetching ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-5">
            <Clock size={18} className="text-amber-500" />
            <h2 className="font-semibold text-gray-800">
              Pending Approvals
              {pendingPDFs.length > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                  {pendingPDFs.length}
                </span>
              )}
            </h2>
          </div>

          {pendingPDFs.length === 0 ? (
            <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-100">
              <CheckCircle size={40} className="mx-auto mb-4 text-emerald-400" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No pending PDFs to review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPDFs.map((pdf) => (
                <PendingRow
                  key={pdf._id}
                  pdf={pdf}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
