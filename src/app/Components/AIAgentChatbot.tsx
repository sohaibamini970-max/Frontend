// components/AIAgentChatbot.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  X,
  Bot,
  User,
  Loader2,
  Calendar,
  Users,
  Flag,
  Check,
  AlertCircle,
  FolderKanban,
  ListTodo,
  FileText,
  Maximize2,
  Minimize2,
  Sparkles,
  Paperclip,
  Mic,
  CornerDownLeft,
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
        "Welcome to Project Management Assistant.\n\nI can help you with:\n• Project creation and management\n• Task assignment and tracking\n• Work submission and review\n• Project status and reporting\n\nHow can I assist you today?",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Create new project: 'Q4 Marketing Campaign'",
    "Show all active projects",
    "Create task: 'Finalize budget report'",
    "View team task status",
    "Assign project to department",
    "Submit work for review",
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
        content: data.message || "Operation completed successfully.",
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
        content: `Error: ${error.message || "Unable to process request. Please try again."}`,
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
            className="text-blue-600 hover:text-blue-700 underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Format message with proper line breaks and bullet points
  const formatMessageContent = (content: string): React.ReactNode => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.trim().startsWith('•')) {
        return (
          <div key={index} className="flex items-start gap-2 ml-2">
            <span className="text-blue-500">•</span>
            <span>{line.trim().substring(1)}</span>
          </div>
        );
      }
      if (line.trim() === '') {
        return <div key={index} className="h-2" />;
      }
      return <div key={index}>{line}</div>;
    });
  };

  // Get function icon
  const getFunctionIcon = (functionName: string | null) => {
    if (!functionName) return null;
    if (functionName.includes('project')) return <FolderKanban size={12} />;
    if (functionName.includes('task')) return <ListTodo size={12} />;
    if (functionName.includes('submit')) return <FileText size={12} />;
    return <Sparkles size={12} />;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed z-[200] transition-all duration-300 ease-in-out ${
        isMaximized
          ? "inset-0 bottom-0 right-0 w-full h-full max-w-full"
          : "bottom-8 right-8 w-[480px] max-w-[calc(100vw-2rem)]"
      }`}
    >
      <div
        className={`flex flex-col bg-white shadow-xl overflow-hidden ${
          isMaximized
            ? "h-full w-full rounded-none border-0"
            : "h-[580px] max-h-[calc(100vh-8rem)] rounded-lg border border-gray-200"
        }`}
      >
        {/* Header - Professional */}
        <div className="flex items-center justify-between bg-white px-5 py-3 flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Project Management Agent</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Active
            </span>
            <button
              onClick={toggleMaximize}
              className="rounded p-1 hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
              aria-label={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
            <button
              onClick={onClose}
              className="rounded p-1 hover:bg-gray-100 transition text-gray-500 hover:text-gray-700"
              aria-label="Close chatbot"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className={`flex-1 overflow-y-auto px-5 py-4 space-y-4 ${
            isMaximized ? "px-8 py-6" : ""
          } bg-gray-50`}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-lg px-4 py-2.5"
                    : message.isError
                    ? "bg-red-50 text-red-800 rounded-lg px-4 py-2.5 border border-red-200"
                    : "bg-white text-gray-800 rounded-lg px-4 py-2.5 border border-gray-200 shadow-sm"
                } ${isMaximized ? "max-w-[70%]" : ""}`}
              >
                {message.role === "assistant" && !message.isError && (
                  <div className="mb-1.5 flex items-center gap-2">
                    <Bot size={14} className="text-blue-600" />
                    <span className="text-xs font-medium text-gray-600">
                      Assistant
                    </span>
                  </div>
                )}
                <div className="text-sm leading-relaxed">
                  {formatMessageContent(message.content)}
                </div>

                {/* Function called */}
                {message.functionCalled && (
                  <div className="mt-2 flex items-center gap-1.5 rounded bg-gray-50 px-2.5 py-1 text-xs text-gray-600 border border-gray-200">
                    {getFunctionIcon(message.functionCalled)}
                    <span>Action: {message.functionCalled}</span>
                  </div>
                )}

                {/* Status indicator */}
                {message.data && message.data.success !== undefined && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    {message.data.success ? (
                      <>
                        <Check size={13} className="text-green-600" />
                        <span className="text-green-700 font-medium">
                          Completed
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={13} className="text-red-600" />
                        <span className="text-red-700 font-medium">
                          Failed
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="mt-1.5 text-[10px] text-gray-400">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 rounded-lg px-4 py-3 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                  <span className="text-sm text-gray-500">Processing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && messages.length > 0 && !loading && (
          <div className="border-t border-gray-200 bg-white px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                Quick Actions
              </span>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Hide suggestions"
              >
                <span className="text-xs">×</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 4).map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 px-3 py-1 rounded border border-gray-200 transition whitespace-nowrap"
                >
                  {suggestion.length > 35 ? suggestion.slice(0, 35) + "..." : suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input - Professional */}
        <div className="border-t border-gray-200 bg-white px-4 py-3 flex-shrink-0">
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
                placeholder="Type your request..."
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 resize-none min-h-[40px] max-h-[120px]"
                disabled={loading}
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
              aria-label="Send message"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-gray-400">
            <div className="flex items-center gap-3">
              <span>Enter to send · Shift+Enter for new line</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Gemini AI</span>
              <span className="w-px h-3 bg-gray-300" />
              <span>Role-based access</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAgentChatbot;
