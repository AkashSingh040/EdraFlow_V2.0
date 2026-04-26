import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PublicPDFs from "./pages/PublicPDFs";
import PdfViewer from "./pages/PdfViewer";
import UploadPDF from "./pages/UploadPDF";
import Chat from "./pages/Chat";
import AdminDashboard from "./pages/admin/AdminDashboard";

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: "12px", fontSize: "14px" },
          }}
        />

        <div className="min-h-screen flex flex-col">
          <Navbar />

          <main className="flex-1">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pdfs" element={<PublicPDFs />} />
              <Route path="/pdfs/:id" element={<PdfViewer />} />
              <Route path="/chat" element={<Chat />} />

              {/* Authenticated */}
              <Route element={<PrivateRoute />}>
                <Route path="/upload" element={<UploadPDF />} />
              </Route>

              {/* Admin only */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400">
                  <p className="text-6xl font-bold mb-4">404</p>
                  <p className="text-lg">Page not found</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
