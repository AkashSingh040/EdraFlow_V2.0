import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Upload, MessageSquare, FileText, ArrowRight, BookOpen, Shield, Zap } from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4`}>
      <Icon size={24} className="text-white" />
    </div>
    <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </div>
);

const Home = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) navigate(`/pdfs?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap size={14} />
            AI-powered student platform
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Learn smarter with{" "}
            <span className="text-indigo-600">Edraflow</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
            Share academic PDFs, get instant AI-powered answers to your university questions, and collaborate with your peers.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex max-w-xl mx-auto gap-2 mb-8">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search PDFs, notes, resources…"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              Search
              <ArrowRight size={16} />
            </button>
          </form>

          {/* CTA buttons */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/chat"
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <MessageSquare size={18} />
              Ask EdraChat
            </Link>
            <Link
              to="/pdfs"
              className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <FileText size={18} />
              Browse PDFs
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="max-w-4xl mx-auto px-4 grid grid-cols-3 gap-8 text-center">
          {[
            { label: "Documents Shared", value: "500+" },
            { label: "Students Active", value: "1,200+" },
            { label: "Questions Answered", value: "10K+" },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-3xl font-bold text-indigo-600 mb-1">{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Everything you need to succeed</h2>
          <p className="text-center text-gray-500 mb-12">One platform for all your academic resource needs</p>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={FileText}
              title="PDF Library"
              description="Access and share study materials, past papers, and notes uploaded by peers and verified by admins."
              color="bg-indigo-500"
            />
            <FeatureCard
              icon={MessageSquare}
              title="EdraChat AI"
              description="Ask questions about university procedures, scholarships, registration and more — get instant, accurate answers."
              color="bg-purple-500"
            />
            <FeatureCard
              icon={Shield}
              title="Admin Moderation"
              description="Every uploaded PDF is reviewed by admins before going live, ensuring quality and relevance."
              color="bg-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Upload CTA */}
      <section className="py-16 px-4 bg-indigo-600 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Upload size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">Contribute to the community</h2>
          <p className="text-indigo-200 mb-8">
            Have useful notes or past papers? Upload them and help your fellow students.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-colors"
          >
            <Upload size={18} />
            Upload a PDF
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-400 text-sm bg-white border-t border-gray-100">
        <div className="flex items-center justify-center gap-2 font-semibold text-gray-600 mb-2">
          <BookOpen size={18} className="text-indigo-600" />
          Edraflow
        </div>
        © {new Date().getFullYear()} Edraflow. Built for students, by students.
      </footer>
    </div>
  );
};

export default Home;
