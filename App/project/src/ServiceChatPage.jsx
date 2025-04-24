import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { FiMic, FiSend, FiVolume2, FiVolumeX } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import { franc } from "franc";
import { createClient } from "@supabase/supabase-js";
const apiUrl = import.meta.env.VITE_API_URL;
// Initialize Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const ServiceChatPage = () => {
  const { serviceTitle } = useParams();
  const location = useLocation();
  const decodedTitle = decodeURIComponent(serviceTitle);
  const port = location.state?.port || 5000;

  const [prompt, setPrompt] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [userId, setUserId] = useState(null);
  const chatContainerRef = useRef(null);
  const timeoutRef = useRef(null);

  // Language mapping
  const languageMapping = {
    asm: { name: "Assamese", speechLang: "as-IN" },
    ben: { name: "Bengali", speechLang: "bn-IN" },
    bod: { name: "Bodo", speechLang: "brx-IN" },
    dgo: { name: "Dogri", speechLang: "doi-IN" },
    guj: { name: "Gujarati", speechLang: "gu-IN" },
    hin: { name: "Hindi", speechLang: "hi-IN" },
    kan: { name: "Kannada", speechLang: "kn-IN" },
    kas: { name: "Kashmiri", speechLang: "ks-IN" },
    kok: { name: "Konkani", speechLang: "kok-IN" },
    mai: { name: "Maithili", speechLang: "mai-IN" },
    mal: { name: "Malayalam", speechLang: "ml-IN" },
    mni: { name: "Manipuri", speechLang: "mni-IN" },
    mar: { name: "Marathi", speechLang: "mr-IN" },
    npi: { name: "Nepali", speechLang: "ne-IN" },
    ory: { name: "Odia", speechLang: "or-IN" },
    pan: { name: "Punjabi", speechLang: "pa-IN" },
    san: { name: "Sanskrit", speechLang: "sa-IN" },
    sat: { name: "Santali", speechLang: "sat-IN" },
    snd: { name: "Sindhi", speechLang: "sd-IN" },
    tam: { name: "Tamil", speechLang: "ta-IN" },
    tel: { name: "Telugu", speechLang: "te-IN" },
    urd: { name: "Urdu", speechLang: "ur-IN" },
    eng: { name: "English", speechLang: "en-US" },
  };

  // Fetch the logged-in user's ID on component mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
        setUserId("default_user");
      }
    };
    fetchUser();
  }, []);

  // Fetch chat history when the component mounts and userId is available
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!userId) return;
  
      try {
        const formattedServiceTitle = decodedTitle.toLowerCase().replace(/\s+/g, "-");
        const res = await fetch(`http://127.0.0.1:5000/${formattedServiceTitle}/history`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": userId,
          },
        });
  
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
  
        const data = await res.json();
        if (data.history) {
          setConversation(data.history);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };
  
    fetchChatHistory();
  }, [userId, decodedTitle]);

  // Cleanup TTS
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = "en-US";

      recog.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => prev + " " + transcript);
        setIsListening(false);
        clearTimeout(timeoutRef.current);
      };

      recog.onerror = (err) => {
        console.error("Speech recognition error: ", err);
        setIsListening(false);
        clearTimeout(timeoutRef.current);

        if (err.error === "no-speech") {
          alert("No speech detected. Please try again.");
        } else {
          alert("Speech recognition failed. Please try again.");
        }
      };

      recog.onend = () => {
        setIsListening(false);
        clearTimeout(timeoutRef.current);
      };

      setRecognition(recog);
    } else {
      console.warn("Speech Recognition not supported in this browser.");
      alert("Your browser does not support speech recognition.");
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      clearTimeout(timeoutRef.current);
    } else {
      const lastUserMessage = conversation
        .slice()
        .reverse()
        .find((msg) => msg.role === "user");
      if (lastUserMessage) {
        const detectedLang = detectLanguage(lastUserMessage.content);
        recognition.lang = detectedLang;
      }
      recognition.start();
      setIsListening(true);

      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          recognition.stop();
          setIsListening(false);
          alert("No speech detected. Please try again.");
        }
      }, 5000);
    }
  };

  // Handle prompt submission
  const handlePromptSubmit = async () => {
    if (!prompt.trim()) return;

    const userMessage = { role: "user", content: prompt.trim(), lang: detectLanguage(prompt.trim()) };
    setConversation((prev) => [...prev, userMessage]);
    setPrompt("");

    try {
      const formattedServiceTitle = decodedTitle.toLowerCase().replace(/\s+/g, "-");
      const res = await fetch(`http://127.0.0.1:5000/${formattedServiceTitle}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": userId,
        },
        body: JSON.stringify({ query: prompt.trim(), user_id: userId }),
      });

      const data = await res.json();

      if (data.response) {
        const botResponse = data.response;
        setConversation((prev) => [
          ...prev,
          { role: "bot", content: botResponse, lang: userMessage.lang },
        ]);
      } else if (data.error) {
        setConversation((prev) => [
          ...prev,
          { role: "bot", content: `Error: ${data.error}`, lang: userMessage.lang },
        ]);
      }
    } catch (error) {
      console.error("Error:", error);
      setConversation((prev) => [
        ...prev,
        { role: "bot", content: "Error: Unable to connect to the server.", lang: userMessage.lang },
      ]);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handlePromptSubmit();
    }
  };

  // Detect language
  const detectLanguage = (text) => {
    const langCode = franc(text);
    return languageMapping[langCode]?.speechLang || "en-US";
  };

  // Speak text
  const speakText = (text, lang) => {
    if ("speechSynthesis" in window && isTTSEnabled) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } else if (!("speechSynthesis" in window)) {
      console.warn("Text-to-speech not supported in this browser.");
      alert("Your browser does not support text-to-speech.");
    }
  };

  // Toggle TTS
  const toggleTTS = () => {
    if (isTTSEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsTTSEnabled((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-900 flex flex-col items-center text-white px-6 py-8 relative overflow-hidden">
      {/* Background glass shapes */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-10 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      
      {/* Content container with backdrop filter */}
      <div className="relative z-10 w-full max-w-4xl flex flex-col items-center">
        <br />
        <h2 className="text-4xl font-bold mt-12 mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-pink-200">
          What can I help with?
        </h2>

        {/* Chat container */}
        <div 
          ref={chatContainerRef}
          className="w-full h-[calc(100vh-280px)] bg-white/10 backdrop-blur-lg rounded-2xl p-6 overflow-y-auto flex flex-col space-y-4 shadow-xl border border-white/20"
        >
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl flex items-center space-x-3 backdrop-blur-sm shadow-lg ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-indigo-600/90 to-blue-500/90 text-white"
                    : "bg-white/15 border border-white/20 text-white"
                }`}
              >
                <div className="flex-1 overflow-hidden">
                  {msg.role === "bot" ? (
                    <div className="prose prose-invert max-w-none">
                      <ReactMarkdown>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
                {msg.role === "bot" && (
                  <button
                    onClick={() => speakText(msg.content, msg.lang)}
                    className="text-white/70 hover:text-white transition-colors duration-200"
                    title="Speak response"
                  >
                    <FiVolume2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Input container */}
        <div className="w-full mt-6 relative">
          <div className="bg-white/15 backdrop-blur-lg rounded-full flex items-center px-6 py-3 border border-white/20 shadow-lg">
            <input
              type="text"
              className="bg-transparent flex-1 focus:outline-none text-white placeholder-white/50"
              placeholder="Ask anything..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            <button
              onClick={toggleListening}
              className={`mr-4 transition-all duration-300 ${
                isListening ? "text-red-400 animate-pulse" : "text-white/70 hover:text-white"
              }`}
              title={isListening ? "Stop listening" : "Start listening"}
            >
              <FiMic size={20} />
            </button>

            <button
              onClick={handlePromptSubmit}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-indigo-700 transition duration-300 shadow-lg"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>

        {isListening && (
          <p className="text-sm text-white/80 mt-3 animate-pulse">Listening...</p>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-6 mb-4">
          <button
            onClick={toggleTTS}
            className="bg-white/15 backdrop-blur-sm text-white px-5 py-2.5 rounded-full hover:bg-white/25 transition duration-300 flex items-center border border-white/20 shadow-md mb-4 sm:mb-0"
          >
            {isTTSEnabled ? (
              <>
                <FiVolume2 size={16} className="mr-2" />
                Text-to-Speech On
              </>
            ) : (
              <>
                <FiVolumeX size={16} className="mr-2" />
                Text-to-Speech Off
              </>
            )}
          </button>

          <p className="text-white/70">
            Chatting with:{" "}
            <span className="text-white font-medium">{decodedTitle}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServiceChatPage;
