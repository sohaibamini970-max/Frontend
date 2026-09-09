// components/AIAgentChatbot.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  X,
  Bot,
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
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  Search,
  MoreVertical,
  Edit2,
  Archive,
  Star,
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

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  isPinned?: boolean;
  isArchived?: boolean;
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
// HELPER FUNCTIONS
// ============================================================

const formatDate = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// ============================================================
// COMPONENT
// ============================================================

const API_BASE = "https://backend-five-swart-88.vercel.app/api";

const AIAgentChatbot: React.FC<AIAgentChatbotProps> = ({ isOpen, onClose }) => {
  // Get user info from localStorage or session
  const user = typeof window !== 'undefined' ? {
    firstName: localStorage.getItem("userFirstName") || "User",
    lastName: localStorage.getItem("userLastName") || "",
    email: localStorage.getItem("userEmail") || "",
  } : { firstName: "User", lastName: "", email: "" };

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  const [currentSessionId, setCurrentSessionId] = useState<string>("1");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false); // Initially closed
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get current session
  const currentSession = chatSessions.find(s => s.id === currentSessionId) || chatSessions[0];
  const messages = currentSession?.messages || [];

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

  // Open sidebar when maximized, close when minimized
  useEffect(() => {
    if (isMaximized) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [isMaximized]);

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

  // Create new chat
  const createNewChat = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setConversationHistory([]);
    if (isMaximized) {
      setIsSidebarOpen(true);
    }
  }, [isMaximized]);

  // Delete chat
  const deleteChat = useCallback((sessionId: string) => {
    if (chatSessions.length <= 1) {
      // Don't delete the last chat, clear it instead
      setChatSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, messages: [], title: "New Chat", updatedAt: new Date() }
          : session
      ));
      setShowDeleteConfirm(null);
      return;
    }

    setChatSessions(prev => prev.filter(session => session.id !== sessionId));
    if (currentSessionId === sessionId) {
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setCurrentSessionId(remainingSessions[0].id);
      }
    }
    setShowDeleteConfirm(null);
  }, [chatSessions, currentSessionId]);

  // Switch chat
  const switchChat = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      // Rebuild conversation history from messages
      const history = session.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      setConversationHistory(history);
    }
    // Keep sidebar open if maximized
    if (!isMaximized) {
      setIsSidebarOpen(false);
    }
  }, [chatSessions, isMaximized]);

  // Update chat title
  const updateChatTitle = useCallback((sessionId: string, firstMessage: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { 
            ...session, 
            title: firstMessage.length > 30 ? firstMessage.substring(0, 30) + "..." : firstMessage,
            updatedAt: new Date()
          }
        : session
    ));
  }, []);

  // Toggle pin chat
  const togglePinChat = useCallback((sessionId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isPinned: !session.isPinned }
        : session
    ));
  }, []);

  // Toggle archive chat
  const toggleArchiveChat = useCallback((sessionId: string) => {
    setChatSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, isArchived: !session.isArchived }
        : session
    ));
  }, []);

  // Send message
  const sendMessage = async (messageText: string): Promise<void> => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    // Add message to current session
    setChatSessions(prev => prev.map(session => 
      session.id === currentSessionId 
        ? { 
            ...session, 
            messages: [...session.messages, userMessage],
            updatedAt: new Date()
          }
        : session
    ));

    // Update chat title if this is the first message
    if (currentSession.messages.length === 0) {
      updateChatTitle(currentSessionId, messageText);
    }

    setInput("");
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

      setChatSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages: [...session.messages, assistantMessage],
              updatedAt: new Date()
            }
          : session
      ));

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "" },
      ]);
    } catch (error: any) {
      console.error("Chat error:", error);

      const errorMessage: Message = {
        id: Date.now().toString() + "-error",
        role: "assistant",
        content: `Error: ${error.message || "Unable to process request. Please try again."}`,
        timestamp: new Date(),
        isError: true,
      };

      setChatSessions(prev => prev.map(session => 
        session.id === currentSessionId 
          ? { 
              ...session, 
              messages: [...session.messages, errorMessage],
              updatedAt: new Date()
            }
          : session
      ));
    } finally {
      setLoading(false);
    }
  };

  // Handle key press - Enter to send, Shift+Enter for new line
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

  // Toggle sidebar - only works when maximized
  const toggleSidebar = (): void => {
    if (isMaximized) {
      setIsSidebarOpen(!isSidebarOpen);
    }
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

  // Filter sessions based on search
  const filteredSessions = chatSessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Separate pinned and unpinned sessions
  const pinnedSessions = filteredSessions.filter(s => s.isPinned && !s.isArchived);
  const activeSessions = filteredSessions.filter(s => !s.isPinned && !s.isArchived);
  const archivedSessions = filteredSessions.filter(s => s.isArchived);

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
        className={`flex bg-white shadow-xl overflow-hidden ${
          isMaximized
            ? "h-full w-full rounded-none border-0"
            : "h-[580px] max-h-[calc(100vh-8rem)] rounded-lg border border-gray-200"
        }`}
      >
        {/* Sidebar */}
        <div
          className={`flex flex-col bg-gray-50 border-r border-gray-200 transition-all duration-300 ${
            isSidebarOpen && isMaximized ? "w-[220px]" : "w-0"
          } overflow-hidden flex-shrink-0`}
        >
          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={createNewChat}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition"
            >
              <Plus size={16} />
              New Chat
            </button>
          </div>

          <div className="p-3 border-b border-gray-200 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {/* Pinned Chats */}
            {pinnedSessions.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Pinned
                </div>
                {pinnedSessions.map((session) => (
                  <ChatListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => switchChat(session.id)}
                    onDelete={() => setShowDeleteConfirm(session.id)}
                    onPin={() => togglePinChat(session.id)}
                    onArchive={() => toggleArchiveChat(session.id)}
                    showDeleteConfirm={showDeleteConfirm === session.id}
                    onConfirmDelete={() => deleteChat(session.id)}
                    onCancelDelete={() => setShowDeleteConfirm(null)}
                  />
                ))}
              </>
            )}

            {/* Active Chats */}
            {activeSessions.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Chats
                </div>
                {activeSessions.map((session) => (
                  <ChatListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => switchChat(session.id)}
                    onDelete={() => setShowDeleteConfirm(session.id)}
                    onPin={() => togglePinChat(session.id)}
                    onArchive={() => toggleArchiveChat(session.id)}
                    showDeleteConfirm={showDeleteConfirm === session.id}
                    onConfirmDelete={() => deleteChat(session.id)}
                    onCancelDelete={() => setShowDeleteConfirm(null)}
                  />
                ))}
              </>
            )}

            {/* Archived Chats */}
            {archivedSessions.length > 0 && (
              <>
                <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
                  Archived
                </div>
                {archivedSessions.map((session) => (
                  <ChatListItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => switchChat(session.id)}
                    onDelete={() => setShowDeleteConfirm(session.id)}
                    onPin={() => togglePinChat(session.id)}
                    onArchive={() => toggleArchiveChat(session.id)}
                    showDeleteConfirm={showDeleteConfirm === session.id}
                    onConfirmDelete={() => deleteChat(session.id)}
                    onCancelDelete={() => setShowDeleteConfirm(null)}
                    isArchived
                  />
                ))}
              </>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 flex-shrink-0">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-blue-600 font-medium text-[10px]">
                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                </span>
              </div>
              <span className="truncate">{user.firstName} {user.lastName}</span>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between bg-white px-4 py-3 flex-shrink-0 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              {isMaximized && (
                <button
                  onClick={toggleSidebar}
                  className="rounded p-1 hover:bg-gray-100 transition text-gray-500 hover:text-gray-700 flex-shrink-0"
                  aria-label="Toggle sidebar"
                >
                  {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 flex-shrink-0">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {currentSession.title}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    {currentSession.messages.length} messages · {formatDate(currentSession.updatedAt)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
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
            className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${
              isMaximized ? "px-6 py-6" : ""
            } bg-gray-50`}
          >
            {/* Welcome Message - Centered */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4 -mt-8">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Sparkles size={28} className="text-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Welcome, {user.firstName}
                </h2>
                <p className="text-sm text-gray-600 max-w-sm">
                  How can I assist you today?
                </p>
              </div>
            )}

            {/* Chat Messages */}
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

          {/* Input */}
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
                  placeholder={messages.length === 0 ? "Type your request..." : "Type your message..."}
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
    </div>
  );
};

// ============================================================
// CHAT LIST ITEM COMPONENT
// ============================================================

interface ChatListItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
  onArchive: () => void;
  showDeleteConfirm: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isArchived?: boolean;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  session,
  isActive,
  onSelect,
  onDelete,
  onPin,
  onArchive,
  showDeleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  isArchived = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        className={`w-full text-left px-3 py-2 rounded-lg transition group ${
          isActive
            ? "bg-blue-50 text-blue-700"
            : "hover:bg-gray-100 text-gray-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare size={14} className="flex-shrink-0 text-gray-400" />
            <span className="text-sm truncate">{session.title}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded p-0.5 transition"
          >
            <MoreVertical size={14} className="text-gray-400" />
          </button>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={10} className="text-gray-400" />
          <span className="text-[10px] text-gray-400">
            {formatDate(session.updatedAt)}
          </span>
          {session.messages.length > 0 && (
            <>
              <span className="w-px h-3 bg-gray-300" />
              <span className="text-[10px] text-gray-400">
                {session.messages.length} msgs
              </span>
            </>
          )}
          {session.isPinned && (
            <>
              <span className="w-px h-3 bg-gray-300" />
              <Star size={10} className="text-yellow-500" />
            </>
          )}
        </div>
      </button>

      {/* Context Menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
        >
          <button
            onClick={() => {
              onPin();
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Star size={14} />
            {session.isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => {
              onArchive();
              setShowMenu(false);
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
          >
            <Archive size={14} />
            {isArchived ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={() => {
              setShowMenu(false);
              onDelete();
            }}
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-white/95 rounded-lg flex items-center justify-between px-3 py-2 z-20">
          <span className="text-xs text-gray-700">Delete this chat?</span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmDelete();
              }}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelDelete();
              }}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgentChatbot;
