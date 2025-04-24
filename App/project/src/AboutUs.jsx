// AboutUs.jsx
import React, { useState, useEffect } from "react";
import { Fade } from "react-awesome-reveal";
const apiUrl = import.meta.env.VITE_API_URL;
const AboutUs = () => {
  // FAQ data (9 items)
  const faqs = [
    {
      question: "What is LawPal?",
      answer:
        "LawPal is India's advanced AI-powered legal assistant, designed to make legal knowledge accessible to everyone, free of cost. With cutting-edge AI technology, LawPal helps individuals understand complex legal matters effortlessly, ensuring that legal guidance is just a conversation away. LawPal offers multilingual support, making legal assistance available in multiple Indian languages to bridge the gap between legal knowledge and the people who need it most. Whether you seek insights into property disputes, criminal law, consumer rights, or any other legal domain, LawPal is here to guide you. Conceptualized and developed independently, LawPal is committed to providing accurate, AI-driven legal insights, empowering individuals with the knowledge to make informed decisions. Start your journey with LawPal today—explore legal information in your preferred language and take control of your rights with confidence!",
    },
    {
      question: "Do I need an account to use LawPal?",
      answer:
        "While basic information is available without an account, signing up unlocks personalized features and faster service.",
    },
    {
      question: "How secure is my data?",
      answer:
        "We prioritize security with advanced encryption and strict access controls to ensure your personal information remains safe.",
    },
    {
      question: "Which languages does LawPal support?",
      answer:
        "We offer services in multiple languages especially in 22 scheduled languages of India to cater to a diverse community, ensuring everyone can benefit.",
    },
    {
      question: "How do the chatbots work?",
      answer:
        "Each chatbot is specialized for a particular government domain—be it taxes, pensions, or documents—so they provide accurate, context-driven responses.",
    },
    {
      question: "Is LawPal available 24/7?",
      answer:
        "Yes! Our platform is available round-the-clock, ensuring you can get assistance anytime without waiting in queues.",
    },
    {
      question: "What makes LawPal's AI unique?",
      answer:
        "Our advanced AI integration uses natural language processing to understand complex queries and deliver precise, actionable answers instantly.",
    },
    {
      question: "How do I provide feedback?",
      answer:
        "You can share your feedback via our Contact Us page or through the built-in feedback option in your user dashboard.",
    },
    {
      question: "What if I have multiple queries?",
      answer:
        "LawPal is designed to handle multiple queries seamlessly, and you can switch between various specialized chatbots as needed.",
    },
  ];

  // Track which FAQ is open
  const [openFAQ, setOpenFAQ] = useState(null);
  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // Parallax effect for hero section
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handleScroll = () => setOffset(window.pageYOffset);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0d0d] to-[#121212] text-white">
      {/* Hero Section with Parallax */}
      <div 
        className="relative h-screen flex items-center justify-center overflow-hidden"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?fm=jpg&q=60&w=3000&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bGF3fGVufDB8fDB8fHww')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        <div 
          className="relative z-10 text-center px-6 max-w-4xl mx-auto"
          style={{ transform: `translateY(${offset * 0.3}px)` }}
        >
          <br></br>
          <br></br>
          <br></br>
          <div className="inline-block mb-6">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mx-auto">
              <span className="text-white font-bold text-3xl">LP</span>
            </div>
          </div>
          <br></br>
          <br></br>
          <br></br>
          <h1 className="text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            About LawPal
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Democratizing legal knowledge through AI innovation
          </p>
          <br></br>     <br></br>     <br></br>
          <div className="animate-bounce absolute bottom-10 left-1/2 transform -translate-x-1/2">
            <svg className="w-8 h-8 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-6 py-24">
        {/* Intro Section */}
        <Fade triggerOnce direction="up">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-bold mb-6">Transforming Legal Assistance</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              LawPal leverages cutting-edge AI to make legal services simple, accessible, and efficient for everyone in India.
            </p>
          </div>
        </Fade>

        {/* Mission & Vision */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {/* Our Mission */}
          <Fade triggerOnce direction="left">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-500 group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">Our Mission</h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-purple-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Leverage AI to simplify legal related queries for everyone.</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Provide 24/7 support and instant access to essential information.</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-indigo-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Ensure inclusivity with services in multiple languages and formats.</span>
                </li>
              </ul>
            </div>
          </Fade>

          {/* Our Vision */}
          <Fade triggerOnce direction="right">
            <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-500 group">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Our Vision</h2>
              <ul className="space-y-4 text-gray-300">
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Enable every citizen to interact with Indian Judiciary as easily as chatting with a friend.</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-teal-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Enhance transparency, efficiency, and trust in public services with intuitive AI.</span>
                </li>
                <li className="flex items-start">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center mr-3 mt-1">
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span>Evolve continuously to meet the changing needs of citizens and governments.</span>
                </li>
              </ul>
            </div>
          </Fade>
        </div>

        {/* Why LawPal is Better */}
        <Fade triggerOnce>
          <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 mb-24 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-40 w-40 bg-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-blue-600/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-3xl font-semibold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500 relative z-10">Why LawPal is Better</h2>
            <p className="text-gray-300 mb-8 max-w-3xl relative z-10">
              We stand out by focusing exclusively on specialized legal services, backed by robust AI and a user-friendly design that makes complex legal information accessible to everyone.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>}
                title="Specialized Chatbots"
                description="Domain-specific AI assistants that understand legal nuances and provide targeted solutions."
                gradient="from-purple-500 to-indigo-500"
              />
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                title="Advanced AI Integration"
                description="Sophisticated algorithms that understand context and deliver precise, actionable answers."
                gradient="from-blue-500 to-cyan-500"
              />
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>}
                title="Multi-Lingual Support"
                description="Services in all 22 scheduled languages of India, breaking down communication barriers."
                gradient="from-teal-500 to-emerald-500"
              />
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>}
                title="Voice-to-Text Feature"
                description="Speak naturally to interact with our system, making it accessible for everyone."
                gradient="from-red-500 to-pink-500"
              />
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                title="24/7 Availability"
                description="Round-the-clock access to legal assistance without waiting in queues or scheduling appointments."
                gradient="from-orange-500 to-amber-500"
              />
              <FeatureCard 
                icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                title="Security & Privacy"
                description="Advanced encryption and strict access controls to protect your personal information."
                gradient="from-violet-500 to-purple-500"
              />
            </div>
          </div>
        </Fade>

        {/* FAQ Section */}
        <div className="mb-24">
          <Fade triggerOnce>
            <h2 className="text-4xl font-bold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
              Frequently Asked Questions
            </h2>
          </Fade>

          <div className="space-y-4 max-w-4xl mx-auto">
            {faqs.map((item, index) => (
              <Fade key={index} triggerOnce delay={index * 100}>
                <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full text-left flex justify-between items-center p-6 focus:outline-none transition-all"
                  >
                    <span className="text-lg font-semibold">{item.question}</span>
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10">
                      {openFAQ === index ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      )}
                    </span>
                  </button>
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      openFAQ === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="p-6 pt-0 text-gray-300 border-t border-white/10">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>

        {/* Call To Action */}
        <Fade triggerOnce>
          <div className="text-center backdrop-blur-md bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-white/10 rounded-2xl p-12 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 h-40 w-40 bg-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-10 -left-10 h-40 w-40 bg-blue-600/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Ready to Transform Your Legal Experience?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto relative z-10">
              Join thousands of Indians who are simplifying their legal journey with LawPal's AI-powered assistance.
            </p>
            
          </div>
        </Fade>
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description, gradient }) => (
  <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 hover:bg-white/10 transition-all duration-300 group">
    <div className={`h-12 w-12 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-gray-400">{description}</p>
  </div>
);

export default AboutUs;
