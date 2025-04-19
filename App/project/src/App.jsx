import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Hero, Services as LandingServices, Footer } from "./LandingPage";
import { Header } from "./Header.jsx";
import ServicesPage from "./ServicesPage";
import ServiceChatPage from "./ServiceChatPage";
import Login from "./Login";
import Signup from "./Signup";
import ContactUs from "./ContactUs";
import AboutUs from "./AboutUs";
import Resources from "./Resources";
import { supabase } from "./supabase";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <Router>
        <Header user={user} />
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
        </Routes>
        <Footer />
      </Router>
    </I18nextProvider>
  );
}

export default App;
