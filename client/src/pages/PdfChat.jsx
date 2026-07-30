import { useState, useRef, useEffect, useCallback } from "react";
import { pdfChatApi } from "../api/axios";
import {
  FileText,
  Upload,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  X,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";

// ── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);

// ── Sub-components ────────────────────────────────────────────────────────────
const FileChip = ({ name, onRemove, disabled }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm text-indigo-700 max-w-full">
    <FileText size={14} className="flex-shrink-0" />
    <span className="truncate flex-1">{name}</span>
    {!disabled && (
      <button onClick={onRemove} className="flex-shrink-0 hover:text-red-500 transition-colors">
        <X size={13} />
      </button>
    )}
  </div>
);

const Message = ({ msg }) => {
  const isBot = msg.role === "assistant";
  return (
    <div className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}>
      {isBot && (
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isBot
            ? "bg-white border border-gray-100 shadow-sm text-gray-800"
            : "bg-indigo-600 text-white"
        }`}
      >
        <p className="whitespace-pre-line">{msg.content}</p>

        {/* Source references */}
        {isBot && msg.sources && msg.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <BookOpen size={11} />
              Sources
            </p>
            <div className="flex flex-wrap gap-1">
              {msg.sources.map((src, i) => (
                <span
                  key={i}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium"
                >
                  {src}
                </span>
              ))}
            </div>
          </div>
        )}

        {msg.error && (
          <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
            <AlertCircle size={12} />
            {msg.error}
          </div>
        )}
      </div>

      {!isBot && (
        <div className="w-8 h-8 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User size={16} className="text-gray-600" />
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const PdfChat = () => {
  const [sessionId, setSessionId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]); // { name, id }
  const [pendingFiles, setPendingFiles] = useState([]); // File objects staged for upload
  const [uploading, setUploading] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! Upload one or more PDF files on the left, then ask me anything about them.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Drag & drop ─────────────────────────────────────────────────────────
  const onDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf")
    );
    if (dropped.length === 0) {
      toast.error("Only PDF files are accepted.");
      return;
    }
    setPendingFiles((prev) => [...prev, ...dropped]);
  }, []);

  const onFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removePending = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Upload ───────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (pendingFiles.length === 0) return;
    setUploading(true);

    const formData = new FormData();
    pendingFiles.forEach((f) => formData.append("files", f));
    if (sessionId) formData.append("session_id", sessionId);

    try {
      const { data } = await pdfChatApi.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSessionId(data.session_id);
      setUploadedFiles((prev) => [
        ...prev,
        ...data.files.map((name) => ({ name, id: uid() })),
      ]);
      setPendingFiles([]);
      toast.success(`${data.files.length} file(s) processed — ${data.chunks_added} chunks indexed.`);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ I've read **${data.files.join(", ")}**. You can now ask me anything about ${data.files.length > 1 ? "these documents" : "this document"}!`,
        },
      ]);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed. Is the PDF Chat server running?");
    } finally {
      setUploading(false);
    }
  };

  // ── Clear session ────────────────────────────────────────────────────────
  const handleClearSession = async () => {
    if (sessionId) {
      try {
        await pdfChatApi.delete(`/session/${sessionId}`);
      } catch {
        // ignore errors on cleanup
      }
    }
    setSessionId(null);
    setUploadedFiles([]);
    setPendingFiles([]);
    setMessages([
      {
        role: "assistant",
        content: "Session cleared. Upload new PDF(s) to start a fresh conversation.",
      },
    ]);
    toast.success("Session cleared.");
  };

  // ── Chat ─────────────────────────────────────────────────────────────────
  const sendMessage = async (query) => {
    const text = (query || input).trim();
    if (!text || loading) return;

    if (!sessionId) {
      toast.error("Please upload a PDF first.");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await pdfChatApi.post("/chat", {
        session_id: sessionId,
        query: text,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer, sources: data.sources || [] },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't answer that right now.",
          error: err.response?.data?.detail || "PDF Chat service may be offline",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-4 h-[calc(100vh-80px)]">

      {/* ── Left Panel: Upload ───────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <FileText size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">PDF Chat</h2>
            <p className="text-xs text-gray-400">Upload & ask questions</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
            isDragging
              ? "border-indigo-500 bg-indigo-50"
              : "border-gray-200 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40"
          }`}
        >
          <Upload
            size={28}
            className={`${isDragging ? "text-indigo-500" : "text-gray-400"} transition-colors`}
          />
          <p className="text-sm text-gray-600 font-medium text-center">
            {isDragging ? "Drop PDFs here" : "Drag & drop PDFs"}
          </p>
          <p className="text-xs text-gray-400">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple
            onChange={onFileSelect}
            className="hidden"
          />
        </div>

        {/* Pending files (staged) */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              Staged ({pendingFiles.length})
            </p>
            {pendingFiles.map((f, i) => (
              <FileChip
                key={i}
                name={f.name}
                onRemove={() => removePending(i)}
                disabled={uploading}
              />
            ))}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="mt-1 w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Upload & Index
                </>
              )}
            </button>
          </div>
        )}

        {/* Uploaded files (indexed) */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" />
              Indexed ({uploadedFiles.length})
            </p>
            {uploadedFiles.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
              >
                <FileText size={14} className="flex-shrink-0" />
                <span className="truncate">{f.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clear session */}
        {(uploadedFiles.length > 0 || sessionId) && (
          <button
            onClick={handleClearSession}
            disabled={uploading || loading}
            className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Clear Session
          </button>
        )}
      </div>

      {/* ── Right Panel: Chat ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat header */}
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900 text-base leading-tight">Chat with your PDFs</h1>
            <p className="text-xs text-gray-400">
              {uploadedFiles.length === 0
                ? "Upload documents to begin"
                : `${uploadedFiles.length} document${uploadedFiles.length > 1 ? "s" : ""} loaded`}
            </p>
          </div>
          {uploadedFiles.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Ready
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} />
          ))}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl px-4 py-3">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Empty state prompt */}
        {uploadedFiles.length === 0 && messages.length === 1 && (
          <div className="my-4 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
            <FileText size={28} className="text-indigo-400 mx-auto mb-2" />
            <p className="text-sm text-indigo-700 font-medium">No documents uploaded yet</p>
            <p className="text-xs text-indigo-400 mt-1">
              Drag a PDF into the left panel to get started
            </p>
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              uploadedFiles.length === 0
                ? "Upload a PDF first…"
                : "Ask anything about your documents…"
            }
            disabled={uploadedFiles.length === 0}
            className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none disabled:bg-gray-50 disabled:text-gray-400"
            style={{ maxHeight: "120px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading || uploadedFiles.length === 0}
            className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfChat;
