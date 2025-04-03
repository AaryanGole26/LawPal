import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Hero, Services as LandingServices, Footer } from "./LandingPage";
import { Header } from "./header.jsx";
import ServicesPage from "./ServicesPage";
import ServiceChatPage from "./ServiceChatPage";
import Login from "./Login";
import Signup from "./Signup";
import ContactUs from "./ContactUs";
import AboutUs from "./AboutUs";
import { supabase } from "./supabase";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
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
        <Route path="/about" element={<AboutUs />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;