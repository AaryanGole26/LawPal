import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { FiMic, FiSend, FiVolume2, FiVolumeX } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { franc } from "franc";
import { supabase } from "./supabase";
import { useTranslation } from "react-i18next";
import { apiFetch } from "./api";

// Removes Markdown syntax so text-to-speech does not read out symbols.
const toSpeechText = (markdown) =>
  markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`#>|~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ServiceChatPage = () => {
  const { serviceTitle } = useParams();
  const { t } = useTranslation();
  // React Router has already decoded the URL parameter.
  const decodedTitle = serviceTitle;
  const serviceSlug = decodedTitle.toLowerCase().replace(/\s+/g, "-");

  const [prompt, setPrompt] = useState("");
  const [recognition, setRecognition] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isTTSEnabled, setIsTTSEnabled] = useState(true);
  const [userId, setUserId] = useState(null);
  const [identityReady, setIdentityReady] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const chatContainerRef = useRef(null);

  // Language mapping
  const languageMapping = {
    ben: { name: "Bengali", speechLang: "bn-IN" },
    bhj: { name: "Bhojpuri", speechLang: "bh-IN" },
    guj: { name: "Gujarati", speechLang: "gu-IN" },
    hin: { name: "Hindi", speechLang: "hi-IN" },
    kan: { name: "Kannada", speechLang: "kn-IN" },
    mai: { name: "Maithili", speechLang: "mai-IN" },
    mal: { name: "Malayalam", speechLang: "ml-IN" },
    mar: { name: "Marathi", speechLang: "mr-IN" },
    ory: { name: "Odia", speechLang: "or-IN" },
    pan: { name: "Punjabi", speechLang: "pa-IN" },
    san: { name: "Sanskrit", speechLang: "sa-IN" },
    tam: { name: "Tamil", speechLang: "ta-IN" },
    urd: { name: "Urdu", speechLang: "ur-IN" },
    eng: { name: "English", speechLang: "en-US" },
  };

  // Initialize welcome message
  const getWelcomeMessage = () => [
    {
      role: "bot",
      content: t(`Hello! Welcome to ${decodedTitle}. How can I assist you today?`),
      lang: "en-US",
    },
  ];

  // Fetch user and set up auth state listener
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUserId(data.session?.user?.id ?? null);
      } catch (error) {
        console.error("Could not read the session:", error);
      } finally {
        setIdentityReady(true);
      }
    };

    fetchUser();

    // Listen for auth state changes (e.g., logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUserId(null);
        setConversation(getWelcomeMessage());
      } else if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
      }
    });

    // Cleanup subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Fetch chat history
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!identityReady) return;

      try {
        const data = await apiFetch(`/${serviceSlug}/history`);
        const history = Array.isArray(data.history) ? data.history.filter((msg) => typeof msg?.content === "string") : [];
        if (history.length > 0) {
          setConversation(history);
        } else {
          setConversation(getWelcomeMessage());
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
        setConversation(getWelcomeMessage());
      }
    };

    fetchChatHistory();
  }, [userId, identityReady, serviceSlug, t]);

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
      };

      recog.onerror = (err) => {
        console.error("Speech recognition error: ", err);
        setIsListening(false);

        if (err.error === "no-speech") {
          alert("No speech detected. Please try again.");
        } else {
          alert("Speech recognition failed. Please try again.");
        }
      };

      recog.onend = () => setIsListening(false);

      setRecognition(recog);
    } else {
      console.warn("Speech Recognition not supported in this browser.");
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
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
      setIsListening(false);
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
    }
  };

  // Handle prompt submission
  const handlePromptSubmit = async () => {
    if (!prompt.trim() || isSending) return;

    const userMessage = { role: "user", content: prompt.trim(), lang: detectLanguage(prompt.trim()) };
    setConversation((prev) => [...prev, userMessage]);
    setPrompt("");
    setIsSending(true);

    try {
      const data = await apiFetch(`/${serviceSlug}/chat`, {
        method: "POST",
        body: { query: userMessage.content },
      });

      // Validate here: state updaters run during render, so bad data reaching
      // them would crash the page instead of landing in the catch below.
      if (typeof data?.response !== "string") {
        throw new Error("The server sent an unreadable response. Please try again.");
      }
      const botMessage = {
        role: "bot",
        content: data.response,
        lang: userMessage.lang,
        cases: data.cases,
        notice: data.notice,
      };
      setConversation((prev) => [...prev, botMessage]);

      // Saving history must not affect the answer the user already has.
      if (userId) {
        const { error } = await supabase.from("history").insert({
          user_id: userId,
          prompt: [userMessage.content],
          response: data.response,
          service: decodedTitle,
          created_at: new Date().toISOString(),
        });
        if (error) {
          console.error("Could not save chat history:", error.message);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setConversation((prev) => [
        ...prev,
        { role: "bot", content: `Error: ${error.message}`, lang: userMessage.lang },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    // isComposing: Enter confirms a word in Indic-language keyboards rather than sending.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
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
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(toSpeechText(text));
      // Messages restored from history have no stored language.
      utterance.lang = lang || detectLanguage(text);
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
          {t("help")}
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
                <div className="flex-1 min-w-0 overflow-hidden">
                  {msg.role === "bot" ? (
                    <div className="prose prose-invert max-w-none [&_table]:block [&_table]:overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                  {msg.cases?.map((courtCase) => (
                    <a
                      key={courtCase.cnr}
                      href={courtCase.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mt-3 p-3 rounded-lg bg-white/10 border border-white/20 hover:bg-white/20 transition text-sm"
                    >
                      <span className="block text-xs text-white/60 mb-1">Source: eCourts live record</span>
                      <span className="font-medium">{courtCase.title}</span>
                      <span className="block text-white/70">
                        {[
                          courtCase.cnr,
                          courtCase.court,
                          courtCase.status,
                          courtCase.decisionDate && `Decided ${courtCase.decisionDate}`,
                          courtCase.nextHearingDate && `Next hearing ${courtCase.nextHearingDate}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </a>
                  ))}
                  {msg.notice && <p className="mt-3 text-sm text-yellow-200">{msg.notice}</p>}
                </div>
                {msg.role === "bot" && (
                  <button
                    onClick={() => speakText(msg.content, msg.lang)}
                    disabled={!isTTSEnabled}
                    className="text-white/70 hover:text-white transition-colors duration-200 disabled:opacity-40"
                    title="Speak response"
                    aria-label="Speak response"
                  >
                    <FiVolume2 size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start" role="status">
              <div className="p-4 rounded-2xl bg-white/15 border border-white/20 text-white/80 animate-pulse">Thinking…</div>
            </div>
          )}
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
              disabled={!recognition}
              className={`mr-4 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
                isListening ? "text-red-400 animate-pulse" : "text-white/70 hover:text-white"
              }`}
              title={!recognition ? "Voice input is not supported in this browser" : isListening ? "Stop listening" : "Start listening"}
              aria-label={isListening ? "Stop listening" : "Start listening"}
            >
              <FiMic size={20} />
            </button>

            <button
              onClick={handlePromptSubmit}
              disabled={isSending}
              aria-label="Send message"
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-full hover:from-blue-600 hover:to-indigo-700 transition duration-300 shadow-lg disabled:opacity-50"
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