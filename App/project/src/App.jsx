import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import { Hero, Services as LandingServices, Footer } from "./LandingPage";
import { Header } from "./Header.jsx";
import ServicesPage from "./ServicesPage";
import ServiceChatPage from "./ServiceChatPage";
import Login from "./Login";
import Signup from "./SignUp";
import ResetPassword from "./ResetPassword";
import ContactUs from "./ContactUs";
import AboutUs from "./AboutUs";
import Resources from "./Resources";
import { supabase } from "./supabase";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

const NotFound = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0d0d0d] text-white px-4 text-center">
    <h1 className="text-4xl font-bold">Page not found</h1>
    <Link to="/" className="underline text-purple-300 hover:text-white">
      Back to home
    </Link>
  </div>
);

// Keeps a rendering error in one page from blanking the whole app.
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Page failed to render:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0d0d0d] text-white px-4 text-center">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="text-gray-300">This page could not be displayed.</p>
        <a href="/" className="underline text-purple-300 hover:text-white">
          Back to home
        </a>
      </div>
    );
  }
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      // Recovery emails can land on any page: the Site URL is used when this
      // deployment's URL is not on the Supabase redirect allow list.
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password") {
        window.location.assign("/reset-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <Header user={user} />
        <ErrorBoundary>
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Hero />
                <LandingServices />
              </>
            }
          />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/service-chat/:serviceTitle" element={<ServiceChatPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
        <Footer />
      </Router>
    </I18nextProvider>
  );
}

export default App;