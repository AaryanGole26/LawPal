import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

function Signup() {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    terms: false,
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
          },
        },
      });
      if (error) throw error;
      alert('Account created successfully! Check your email to verify.');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white relative overflow-hidden">
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900 opacity-80"></div>
      
      {/* Abstract shapes */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500 rounded-full filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl opacity-20 animate-pulse delay-700"></div>
      <div className="absolute top-1/2 left-1/4 w-72 h-72 bg-purple-500 rounded-full filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
      
      {/* Glass Card Container */}
      <div className="w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 backdrop-blur-lg bg-white bg-opacity-10 border border-white border-opacity-20">
        <div className="absolute inset-0 rounded-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-white to-transparent opacity-5"></div>
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-pink-400 to-blue-500 bg-clip-text text-transparent">Join the community</h2>
          <p className="text-center mb-8 text-gray-300 text-sm">express yourself • be curious • be righteous</p>

          {error && (
            <div className="mb-6 p-3 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg">
              <p className="text-red-300 text-center text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="flex space-x-3 mb-5">
              <div className="w-1/2">
                <label className="block mb-2 text-xs font-medium text-gray-300">first name</label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-black bg-opacity-30 text-white border border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none transition-all"
                />
              </div>
              <div className="w-1/2">
                <label className="block mb-2 text-xs font-medium text-gray-300">last name</label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-black bg-opacity-30 text-white border border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none transition-all"
                />
              </div>
            </div>
            
            <label className="block mb-2 text-xs font-medium text-gray-300">email</label>
            <input
              type="email"
              name="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full mb-5 px-4 py-3 rounded-lg bg-black bg-opacity-30 text-white border border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none transition-all"
            />
            
            <label className="block mb-2 text-xs font-medium text-gray-300">password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className="w-full mb-7 px-4 py-3 rounded-lg bg-black bg-opacity-30 text-white border border-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-400 focus:ring-opacity-20 focus:outline-none transition-all"
            />
            
            <button
              type="submit"
              className="w-full py-3 rounded-lg font-medium relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-blue-500 group-hover:from-blue-500 group-hover:to-pink-500 transition-all duration-500"></div>
              <span className="relative">create account</span>
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-400">
            already one of us?{' '}
            <a href="/login" className="text-blue-400 hover:text-pink-400 transition-colors">
              sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;
