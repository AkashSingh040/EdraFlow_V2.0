import { useState, useRef, useEffect } from "react";
import { ragApi } from "../api/axios";
import { MessageSquare, Send, Loader2, Bot, User, AlertCircle, BookOpen } from "lucide-react";
import toast from "react-hot-toast";

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
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isBot
            ? "bg-white border border-gray-100 shadow-sm text-gray-800"
            : "bg-indigo-600 text-white"
        }`}
      >
        {/* Render steps as numbered list if present */}
        {isBot && msg.steps ? (
          <div>
            <p className="font-medium mb-2">{msg.content}</p>
            <ol className="list-decimal list-inside space-y-1">
              {msg.steps.map((step, i) => (
                <li key={i} className="text-gray-700">{step}</li>
              ))}
            </ol>
            {msg.source && (
              <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                Source: {msg.source}
              </p>
            )}
          </div>
        ) : (
          <p>{msg.content}</p>
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

const SUGGESTED = [
  "How do I apply for a scholarship?",
  "What documents are needed for registration?",
  "How to defer my semester?",
  "Where is the PhD section?",
];

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm EdraChat, your AI assistant. Ask me anything about university procedures, scholarships, registration, and more!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (query) => {
    const text = query || input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await ragApi.post("/chat", { query: text });

      const botMsg = {
        role: "assistant",
        content: data.answer || data.response || "Here is what I found:",
        steps: data.steps || null,
        source: data.source || data.title || null,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        role: "assistant",
        content: "Sorry, I couldn't process your request right now.",
        error: err.response?.data?.detail || "RAG service may be offline",
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <MessageSquare size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-bold text-xl text-gray-900">EdraChat</h1>
          <p className="text-xs text-gray-400">AI-powered university assistant</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          Online
        </div>
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

      {/* Suggested questions (only show at start) */}
      {messages.length === 1 && (
        <div className="my-4">
          <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">Suggested</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
              >
                <BookOpen size={13} />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="Ask about scholarships, registration, procedures…"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
};

export default Chat;
