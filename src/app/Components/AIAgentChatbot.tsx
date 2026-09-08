// components/AIAgentChatbot.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  X,
  Bot,
  User,
  Loader2,
  Plus,
  Calendar,
  Users,
  Flag,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  ListTodo,
  FileText,
  Maximize2,
  Minimize2,
} from "lucide-react";

// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  data?: any;
  functionCalled?: string | null;
  requiresAction?: boolean;
  isError?: boolean;
}

interface ConversationHistory {
  role: "user" | "assistant";
  content: string;
}

interface AIAgentChatbotProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatResponse {
  success: boolean;
  message?: string;
  data?: any;
  function_called?: string | null;
  requires_action?: boolean;
  error?: string;
}

// ============================================================
// COMPONENT
// ============================================================

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

const AIAgentChatbot: React.FC<AIAgentChatbotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hello! I'm your AI Project Management Assistant.\n\nI can help you with:\n• Creating and managing projects\n• Creating and assigning tasks\n• Submitting work\n• Finding information about projects, tasks, and users\n\nJust tell me what you'd like to do!",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Create a new project called 'AI Platform' with high priority",
    "Show me all my projects",
    "Create a task for project 5b7896e6 called 'Design Login Page'",
    "What's the status of all tasks?",
    "Assign project abc-123 to manager John Doe",
    "Submit work for task xyz-789: https://github.com/...",
  ]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(true);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  // Get auth headers
  const getAuthHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
  });

  // Send message
  const sendMessage = async (messageText: string): Promise<void> => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowSuggestions(false);
    setLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add to conversation history
    const newHistory: ConversationHistory[] = [
      ...conversationHistory,
      { role: "user", content: messageText },
    ];
    setConversationHistory(newHistory);

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: messageText,
          conversationHistory: newHistory.slice(-10),
        }),
      });

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: data.message || "Task completed successfully!",
        timestamp: new Date(),
        data: data.data,
        functionCalled: data.function_called,
        requiresAction: data.requires_action,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "" },
      ]);

      // Show suggestions again after a delay
      setTimeout(() => setShowSuggestions(true), 5000);
    } catch (error: any) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        role: "assistant",
        content: `❌ ${error.message || "Something went wrong. Please try again."}`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Handle key press - Enter to send, Ctrl+Enter for new line
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      sendMessage(input);
    }
    // Ctrl+Enter or Shift+Enter for new line (default behavior)
    // No need to prevent default for these
  };

  // Toggle maximize
  const toggleMaximize = (): void => {
    setIsMaximized(!isMaximized);
  };

  // Format timestamp
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Format content with links
  const formatContent = (content: string): React.ReactNode => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-[200] transition-all duration-300 ease-in-out ${
        isMaximized
          ? "inset-0 bottom-0 right-0 w-full h-full max-w-full rounded-none"
          : "bottom-24 right-4 w-[560px] max-w-[calc(100vw-2rem)] rounded-2xl"
      }`}
    >
      <div
        className={`flex flex-col bg-white shadow-2xl overflow-hidden ${
          isMaximized
            ? "h-full w-full rounded-none border-0"
            : "h-[600px] max-h-[calc(100vh-8rem)] rounded-2xl border border-gray-200"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#07111f] px-4 py-3 text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
              <Bot size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">AI Assistant</h3>
              <p className="text-[10px] text-gray-400">Powered by Gemini AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMaximize}
              className="rounded-lg p-1.5 hover:bg-white/10 transition"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 hover:bg-white/10 transition"
              aria-label="Close chatbot"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className={`flex-1 overflow-y-auto bg-gray-50 p-4 space-y-3 ${
            isMaximized ? "p-6" : ""
          }`}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  message.role === "user"
                    ? "bg-[#07111f] text-white"
                    : message.isError
                    ? "bg-red-50 text-red-700 border border-red-200"
                    : "bg-white text-gray-800 border border-gray-200"
                } ${isMaximized ? "max-w-[75%]" : ""}`}
              >
                {message.role === "assistant" && !message.isError && (
                  <div className="mb-1 flex items-center gap-1">
                    <Bot size={14} className="text-gray-400" />
                    <span className="text-[10px] font-medium text-gray-400">
                      Assistant
                    </span>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {formatContent(message.content)}
                </div>

                {/* Show function called */}
                {message.functionCalled && (
                  <div className="mt-2 rounded-lg bg-gray-100 px-3 py-1.5 text-[10px] text-gray-500">
                    🔧 Action: {message.functionCalled}
                  </div>
                )}

                {/* Show data summary */}
                {message.data && message.data.success !== undefined && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {message.data.success ? (
                      <>
                        <Check size={14} className="text-emerald-500" />
                        <span className="text-[10px] text-emerald-600">
                          Operation successful
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={14} className="text-red-500" />
                        <span className="text-[10px] text-red-600">
                          Operation failed
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-1 text-[9px] text-gray-400">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length > 0 && !loading && (
          <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-medium uppercase tracking-wider text-gray-400">
                Suggestions
              </span>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Hide suggestions"
              >
                <ChevronUp size={14} />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition"
                >
                  {suggestion.length > 40 ? suggestion.slice(0, 40) + "..." : suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-3 flex-shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setInput(e.target.value);
                  adjustTextareaHeight();
                }}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything... (Ctrl+Enter for new line)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-100 placeholder:text-gray-400 resize-none min-h-[42px] max-h-[120px]"
                disabled={loading}
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#07111f] text-white hover:bg-[#111c2c] disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] text-gray-400">
            <span>Powered by Google Gemini AI</span>
            <span>Role-based permissions apply</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentChatbot;
