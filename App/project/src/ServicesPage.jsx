import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Fade } from "react-awesome-reveal"; // Make sure to install this package

const servicesData = [
  {
    title: "Personal and Family Legal Assistance",
    description:
      "Get help with marriage, divorce, adoption, tenancy, wills, property disputes, and protection against harassment or abuse.",
    icon: "👨‍👩‍👧",
    color: "from-purple-600 to-blue-600",
    features: [
      "Marriage & Divorce Advice",
      "Adoption Procedures",
      "Tenancy Disputes",
      "Will Preparation",
      "Property Claims",
      "Protection Orders"
    ]
  },
  {
    title: "Business Consumer and Criminal legal assistance",
    description:
      "Assistance with starting a business, intellectual property, consumer complaints, criminal cases, civil disputes, and more.",
    icon: "⚖️",
    color: "from-blue-600 to-teal-600",
    features: [
      "Business Formation",
      "IP Protection",
      "Consumer Complaints",
      "Criminal Defense",
      "Civil Litigation",
      "Regulatory Compliance"
    ]
  },
];

const ServicesPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [animateServices, setAnimateServices] = useState(false);

  // Parallax effect for hero section
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const handleScroll = () => setOffset(window.pageYOffset);
    window.addEventListener("scroll", handleScroll);
    
    // Trigger animation after component mounts
    setAnimateServices(true);
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleAccessService = (service) => {
    // Navigate to the service chat page with the service title
    navigate(`/service-chat/${encodeURIComponent(service.title)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d0d0d] to-[#121212] text-white">
      {/* Hero Section with Parallax */}
      <div 
        className="relative h-96 md:h-[70vh] flex items-center justify-center overflow-hidden"
        style={{ 
          backgroundImage: "url('https://images.unsplash.com/photo-1589829545856-d10d557cf95f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80')",
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
          <br></br>     <br></br>     <br></br>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Our Services
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            AI-powered legal assistance made simple and accessible for everyone
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
        <Fade triggerOnce>
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">Explore Our Legal Chatbots</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Our specialized AI chatbots are designed to provide instant legal guidance across a wide range of topics, making legal assistance accessible to everyone.
            </p>
          </div>
        </Fade>

        

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {servicesData.map((service, index) => (
            <Fade key={index} triggerOnce direction={index % 2 === 0 ? "left" : "right"} delay={index * 200}>
              <div className="backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-500 group">
                <div className="p-8">
                  <div className={`h-20 w-20 flex items-center justify-center text-4xl mb-6 rounded-2xl bg-gradient-to-br ${service.color} group-hover:scale-110 transition-all duration-500`}>
                    {service.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                  <p className="text-gray-300 mb-6">{service.description}</p>
                  
                  {/* Features list */}
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold mb-4 text-gray-200">Features:</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center">
                          <span className={`h-5 w-5 rounded-full bg-gradient-to-br ${service.color} flex items-center justify-center mr-2`}>
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <span className="text-sm text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleAccessService(service)}
                    className={`w-full py-4 rounded-xl font-medium bg-gradient-to-r ${service.color} text-white hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300 flex items-center justify-center`}
                  >
                    <span>Access Service</span>
                    <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </Fade>
          ))}
        </div>
        
        {/* How It Works Section */}
        <Fade triggerOnce>
          <div className="mt-24 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-20 -right-20 h-40 w-40 bg-purple-600/20 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 h-40 w-40 bg-blue-600/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-3xl font-bold mb-12 text-center relative z-10">How It Works</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl font-bold">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Select a Service</h3>
                <p className="text-gray-300">Choose the legal service that matches your requirements from our extensive offerings.</p>
              </div>
              
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl font-bold">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Chat with AI</h3>
                <p className="text-gray-300">Interact with our specialized AI assistant in your preferred language to get guidance.</p>
              </div>
              
              <div className="text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-600 to-green-600 flex items-center justify-center mx-auto mb-6">
                  <span className="text-white text-2xl font-bold">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-4">Get Solutions</h3>
                <p className="text-gray-300">Receive personalized legal guidance, document assistance, and actionable next steps.</p>
              </div>
            </div>
          </div>
        </Fade>
        
        {/* CTA Section */}
        <Fade triggerOnce>
          <div className="mt-24 text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of Indians who are simplifying their legal journey with LawPal's AI-powered assistance.
            </p>
            <button 
              onClick={() => navigate('/service-chat/consultation')}
              className="px-8 py-4 rounded-xl font-medium bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg hover:shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
            >
              Start Free Consultation
            </button>
          </div>
        </Fade>
      </div>
    </div>
  );
};

export default ServicesPage;