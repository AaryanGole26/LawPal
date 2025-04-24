import React, { useState } from "react";
import { FiMail, FiPhone, FiMapPin, FiHeadphones } from "react-icons/fi";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
  });
  const apiUrl = import.meta.env.VITE_API_URL;
  const [status, setStatus] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setStatusMessage(null);

    try {
      const response = await fetch(`${apiUrl}/submit-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setStatusMessage(data.message || "Message sent successfully!");
        setFormData({ firstName: "", lastName: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setStatusMessage(data.error || "Failed to submit the form.");
      }
    } catch (error) {
      setStatus("error");
      setStatusMessage(`Network error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white px-8 py-16 relative overflow-hidden">
      {/* Ambient background blur circles */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute bottom-40 right-20 w-64 h-64 bg-purple-600 rounded-full opacity-20 blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-pink-500 rounded-full opacity-10 blur-3xl"></div>
      
      {/* Content Container */}
      <div className="relative z-10">
        <br />
        <br />
        <h1 className="text-5xl font-bold text-center mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">Contact Us</h1>
        <p className="text-center text-gray-300 mb-12">
          Have questions or need assistance? We're here to help.
        </p>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Form Section */}
          <div className="backdrop-blur-lg bg-white/10 p-8 rounded-2xl border border-white/20 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">Get in Touch</h2>
            <p className="text-gray-300 mb-6">
              Fill out the form and our team will get back to you as soon as possible.
            </p>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="flex gap-4">
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="w-1/2 p-3 bg-white/5 rounded-lg border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="w-1/2 p-3 bg-white/5 rounded-lg border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
                  required
                />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email"
                className="w-full p-3 bg-white/5 rounded-lg border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm"
                required
              />
              <select
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full p-3 bg-white/5 rounded-lg border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm appearance-none"
                style={{ color: formData.subject ? 'white' : '#9ca3af' }}
                required
              >
                <option value="" className="bg-gray-800 text-gray-300">Select a subject</option>
                <option value="General Inquiry" className="bg-gray-800 text-white">General Inquiry</option>
                <option value="Support Request" className="bg-gray-800 text-white">Support Request</option>
                <option value="Other" className="bg-gray-800 text-white">Other</option>
              </select>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder="How can we help you?"
                className="w-full p-3 bg-white/5 rounded-lg border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm h-32"
                required
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 py-3 rounded-lg font-semibold hover:opacity-90 transition duration-300 shadow-lg hover:shadow-blue-500/50"
              >
                Send Message
              </button>
            </form>

            {/* Status Messages */}
            {status === "loading" && (
              <p className="text-yellow-300 mt-4 flex items-center">
                <span className="inline-block w-4 h-4 mr-2 bg-yellow-300 rounded-full animate-pulse"></span>
                Sending...
              </p>
            )}
            {status === "success" && (
              <p className="text-green-300 mt-4 flex items-center">
                <span className="inline-block w-4 h-4 mr-2 bg-green-300 rounded-full"></span>
                {statusMessage}
              </p>
            )}
            {status === "error" && (
              <p className="text-red-300 mt-4 flex items-center">
                <span className="inline-block w-4 h-4 mr-2 bg-red-300 rounded-full"></span>
                {statusMessage}
              </p>
            )}
          </div>

          {/* Contact Info Section */}
          <div className="backdrop-blur-lg bg-white/10 p-8 rounded-2xl border border-white/20 shadow-xl">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">Contact Information</h2>
            <p className="text-gray-300 mb-8">
              You can reach us through the following channels.
            </p>
            
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-white/5 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-3 mr-4 bg-blue-500/20 rounded-full">
                  <FiMail size={22} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">support@lawpal.gov.in</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-white/5 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-3 mr-4 bg-purple-500/20 rounded-full">
                  <FiPhone size={22} className="text-purple-300" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="text-white">1800-LAW-PAL</p>
                </div>
              </div>
              
              <div className="flex items-center p-4 bg-white/5 rounded-xl backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-3 mr-4 bg-pink-500/20 rounded-full">
                  <FiMapPin size={22} className="text-pink-300" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Address</p>
                  <p className="text-white">VCET, Vasai (W) - 401202, Maharashtra, India</p>
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-blue-300">Helpline Numbers</h2>
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-lg bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 mr-3 bg-blue-500/20 rounded-full">
                  <FiHeadphones size={18} className="text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tax Services</p>
                  <p className="text-white">1800 180 1961</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-lg bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 mr-3 bg-purple-500/20 rounded-full">
                  <FiHeadphones size={18} className="text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Pension Services</p>
                  <p className="text-white">1800-11-77-88</p>
                </div>
              </div>
              
              <div className="flex items-center p-3 rounded-lg bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                <div className="p-2 mr-3 bg-pink-500/20 rounded-full">
                  <FiHeadphones size={18} className="text-pink-300" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Technical Support</p>
                  <p className="text-white">1800-LAW-PAL</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
