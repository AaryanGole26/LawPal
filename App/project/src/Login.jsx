import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';

function Login() {
  const [authMode, setAuthMode] = useState('password'); // or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [backgroundIndex, setBackgroundIndex] = useState(0);
  const navigate = useNavigate();

  const backgrounds = [
    'https://images.unsplash.com/photo-1550684376-efcbd6e3f031',
    'https://images.unsplash.com/photo-1557683311-eac922347aa1',
    'https://images.unsplash.com/photo-1543722530-d2c3201371e7'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      alert('Login successful!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      window.localStorage.setItem('emailForSignIn', email);
      alert('OTP sent to your email!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    try {
      const email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        setError('Please enter your email again.');
        return;
      }
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) throw error;
      window.localStorage.removeItem('emailForSignIn');
      alert('Login successful!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div 
      className="flex items-center justify-center min-h-screen bg-black text-white px-4 relative overflow-hidden py-20"
      style={{
        backgroundImage: `url(${backgrounds[backgroundIndex]})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 1.5s ease-in-out'
      }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 via-blue-900/40 to-black/50 z-0"></div>
      
      {/* Animated bubbles */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      
      <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur-lg bg-white/10 shadow-xl border border-white/20 z-10">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 text-transparent bg-clip-text">welcome back</h2>
        <p className="text-center mb-6 text-gray-300">access your gov services</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 backdrop-blur-sm border border-red-500/30">
            <p className="text-red-300 text-center text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center mb-6">
          <div className="flex bg-white/10 p-1 rounded-xl">
            <button
              onClick={() => setAuthMode('password')}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                authMode === 'password' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Password
            </button>
            <button
              onClick={() => setAuthMode('otp')}
              className={`px-4 py-2 rounded-lg text-sm transition ${
                authMode === 'otp' 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white' 
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              One-Time Code
            </button>
          </div>
        </div>

        {authMode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm">Password</label>
                <a href="#" className="text-xs text-purple-300 hover:text-white transition">
                  Forgot?
                </a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-medium transition bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 transform hover:scale-[1.02] duration-200"
            >
              Sign in
            </button>
          </form>
        ) : (
          <form onSubmit={otp ? handleOtpVerification : handleOtpLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm">Email or ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm">One-Time Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 text-white border border-white/10 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl font-medium transition bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:opacity-90 transform hover:scale-[1.02] duration-200"
            >
              {otp ? 'Verify Code' : 'Send Code'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-300">
            Don't have an account?{' '}
            <a href="/signup" className="text-purple-300 hover:text-white transition font-medium">
              Sign Up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;