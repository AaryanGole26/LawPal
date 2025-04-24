import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiBriefcase, FiHome, FiShield, FiBook, FiMail, FiPhone } from 'react-icons/fi';
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
const apiUrl = import.meta.env.VITE_API_URL;
// ─────────────────────────────────────────────────────────────
// Hero Component
// ─────────────────────────────────────────────────────────────
const Model = () => {
  const { scene } = useGLTF("/model.gltf");
  const modelRef = useRef();

  useFrame(({ mouse }) => {
    if (modelRef.current) {
      // Invert the signs to make the model face the mouse direction
      const targetRotationY = mouse.x * Math.PI * 0.5; // Left-right rotation (positive for right)
      const targetRotationX = -mouse.y * Math.PI * 0.3; // Up-down rotation (negative for up)

      // Smoothly interpolate rotation
      modelRef.current.rotation.y += (targetRotationY - modelRef.current.rotation.y) * 0.1;
      modelRef.current.rotation.x += (targetRotationX - modelRef.current.rotation.x) * 0.1;

      // Clamp rotation to prevent over-rotation
      modelRef.current.rotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, modelRef.current.rotation.y));
      modelRef.current.rotation.x = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, modelRef.current.rotation.x));
    }
  });
  return <primitive ref={modelRef} object={scene} scale={2.1} position={[0, -1.7, 0]} />;
};

export const Hero = () => {
  const scrollToServices = () => {
    const servicesSection = document.getElementById("services");
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="pt-24 pb-12 bg-gradient-to-br from-purple-900 via-blue-900 to-black relative overflow-hidden">
      {/* Ambient background blur circles */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-40 right-20 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500 rounded-full opacity-10 blur-3xl"></div>
      
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
        {/* Left Content */}
        <div className="md:w-1/2 text-left">
          <div className="flex items-center mb-4">
            <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 leading-tight">
              RAG Powered Chatbot for{" "}
              <span className="text-white">Legal Assistance</span>
            </h1>
          </div>
          <p className="text-gray-300 mt-4 max-w-xl">
            AI-powered legal assistant that provides instant, accessible insights on Indian laws.
            Covering civil, criminal, family, and property law, it simplifies complex legal concepts
            for easy understanding. With a freemium model and continuous AI improvements, LawPal
            bridges the gap between citizens and legal information, empowering users to make informed
            decisions.
          </p>
          <div className="mt-6 flex space-x-4">
            <Link
              to="/services"
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:opacity-90 transition duration-300 shadow-lg hover:shadow-blue-500/50"
            >
              Get Started
            </Link>
            <button
              onClick={scrollToServices}
              className="backdrop-blur-md bg-white/10 border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition duration-300"
            >
              Explore Services
            </button>
          </div>
        </div>

        {/* Right Content - 3D Model */}
        <div className="md:w-1/2 h-[400px] flex justify-center items-center">
          <Canvas camera={{ position: [0, 1, 4], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} intensity={1} />
            <OrbitControls enableZoom={false} />
            <Model />
          </Canvas>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Landing Services Component
// ─────────────────────────────────────────────────────────────
export const Services = () => (
  <section id="services" className="py-16 bg-[#0d0d0d]">
    <div className="container mx-auto px-6">
      <h2 className="text-3xl font-bold text-center mb-12 text-white">Our AI-Powered Services</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        <Link to="/service-chat/Personal%20and%20Family%20Legal%20Assistance">
          <ServiceCard
            title="Personal and Family Legal Assistance"
            description="Get help with marriage, divorce, adoption, tenancy, wills, property disputes, and protection against harassment or abuse."
            icon={FiFileText}
          />
        </Link>
        <Link to="/service-chat/Business%20Consumer%20and%20Criminal%20Legal%20Assistance">
          <ServiceCard
            title="Business, Consumer, and Criminal Legal Assistance"
            description="Assistance with starting a business, intellectual property, consumer complaints, criminal cases, civil disputes, and more."
            icon={FiBriefcase}
          />
        </Link>
      </div>
    </div>
  </section>
);

// ─────────────────────────────────────────────────────────────
// HowItWorks Component
// ─────────────────────────────────────────────────────────────
export const HowItWorks = () => {
  return (
    <section className="bg-[#0d0d0d] text-white py-16 px-4">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
        <p className="text-gray-400 mb-12">
          Access legal assistance in three simple steps
        </p>

        <div className="mx-auto w-full max-w-3xl h-64 md:h-96 bg-[#2a2a2a] rounded-lg flex items-center justify-center mb-10">
          <p className="text-gray-500 text-xl">
            Video or Image Placeholder
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#191919] rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-600 text-2xl">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Choose a Service</h3>
            <p className="text-gray-400 max-w-sm">
              Select from our specialized legal chatbots based on your needs.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#191919] rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-600 text-2xl">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Chat or Speak</h3>
            <p className="text-gray-400 max-w-sm">
              Interact with the chatbot by typing or using your voice.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#191919] rounded-full flex items-center justify-center mb-4">
              <span className="text-primary-600 text-2xl">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Results</h3>
            <p className="text-gray-400 max-w-sm">
              Receive legal guidance and answers to your queries instantly.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-[#191919] mt-16 py-10 text-center px-4">
        <h3 className="text-2xl font-semibold text-white mb-2">
          Ready to Get Started?
        </h3>
        <p className="text-gray-400 mb-6">
          Join thousands of users who are already benefiting from our legal assistance chatbots.
        </p>
        <div className="space-x-4">
          <Link
            to="/login"
            className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700 transition duration-300"
          >
            Login or Sign Up
          </Link>
          <Link
            to="/services"
            className="bg-white text-black px-6 py-2 rounded hover:bg-gray-300 transition duration-300"
          >
            Explore Services
          </Link>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────
// Internal ServiceCard Component for Landing Page
// ─────────────────────────────────────────────────────────────
const ServiceCard = ({ title, description, icon: Icon }) => (
  <div
    className="bg-[#191919] p-6 rounded-xl shadow-lg card-hover transition-transform hover:-translate-y-1"
    onClick={() => console.log(`Starting chat with ${title}`)}
  >
    <div className="text-primary-600 w-12 h-12 mb-4">
      <Icon size={48} />
    </div>
    <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
    <p className="text-gray-300 mb-4">{description}</p>
    <button className="bg-primary-100 text-primary-600 px-4 py-2 rounded-lg font-medium hover:bg-primary-200 transition duration-300">
      Explore
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────
// Footer Component
// ─────────────────────────────────────────────────────────────

export const Footer = () => (
  <footer className="bg-black backdrop-blur-xl shadow-2xl border-t border-black  p-8">
    <div className="container mx-auto px-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-gray-100">
        <div>
          <h4 className="text-lg font-semibold mb-4 text-white">About</h4>
          <p className="text-gray-200">
            Explore legal knowledge, simplify complex Indian laws, and access AI-powered legal assistance in your language!
          </p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 text-white">Quick Links</h4>
          <ul className="space-y-2">
            <li className="flex items-center hover:text-white transition">
              <FiHome size={18} className="text-white mr-2" />
              <a
                href="https://legalaffairs.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Ministry of Law and Justice
              </a>
            </li>
            <li className="flex items-center hover:text-white transition">
            <FiBriefcase size={18} className="text-white mr-2" />
              <a
                href="https://www.indiacode.nic.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                India Code - Digital Repo of Laws
              </a>
            </li>
            <li className="flex items-center hover:text-white transition">
              <FiShield size={18} className="text-white mr-2" />
              <a
                href="https://nalsa.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                National Legal Services Authority
              </a>
            </li>
            <li className="flex items-center hover:text-white transition">
              <FiBook size={18} className="text-white mr-2" />
              <a
                href="https://lawcommissionofindia.nic.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Law Commission of India
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4 text-white">Contact</h4>
          <ul className="space-y-2">
          <li className="flex items-center hover:text-white transition">
  <FiMail size={18} className="text-white mr-2" />
  <a
    href="mailto:support@lawpal.gov.in"
    className="hover:underline"
  >
    support@lawpal.gov.in
  </a>
</li>
            <li className="flex items-center hover:text-white transition">
              <FiPhone size={18} className="text-white mr-2" />
              <span>1800-LAW-PAL</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/30 mt-8 pt-8 text-center text-gray-200">
        <p>© 2025 LawPal. All rights reserved.</p>
        <p className="text-sm max-w-2xl mx-auto mt-2">
          LawPal is an AI-driven platform providing general legal information. Not a substitute for professional legal consultation.
        </p>
      </div>
    </div>
  </footer>
);
