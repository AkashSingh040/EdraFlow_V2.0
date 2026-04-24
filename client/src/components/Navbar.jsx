import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Upload, MessageSquare, LayoutDashboard, LogOut, LogIn, Menu, X } from "lucide-react";
import { useState } from "react";

const NavItem = ({ to, icon: Icon, label }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`
    }
  >
    <Icon size={16} />
    {label}
  </NavLink>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <BookOpen size={24} />
          Edraflow
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <NavItem to="/" icon={BookOpen} label="Home" />
          <NavItem to="/pdfs" icon={BookOpen} label="PDFs" />
          {user && <NavItem to="/upload" icon={Upload} label="Upload" />}
          <NavItem to="/chat" icon={MessageSquare} label="EdraChat" />
          {user?.role === "admin" && (
            <NavItem to="/admin" icon={LayoutDashboard} label="Admin" />
          )}
        </div>

        {/* Auth actions */}
        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <span className="text-sm text-gray-500">
                Hi, <span className="font-medium text-gray-800">{user.name.split(" ")[0]}</span>
                {user.role === "admin" && (
                  <span className="ml-1 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                    Admin
                  </span>
                )}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <LogIn size={16} />
              Login
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 flex flex-col gap-1">
          <NavItem to="/" icon={BookOpen} label="Home" />
          <NavItem to="/pdfs" icon={BookOpen} label="PDFs" />
          {user && <NavItem to="/upload" icon={Upload} label="Upload" />}
          <NavItem to="/chat" icon={MessageSquare} label="EdraChat" />
          {user?.role === "admin" && (
            <NavItem to="/admin" icon={LayoutDashboard} label="Admin" />
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <Link to="/login" className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600">
              <LogIn size={16} />
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
