// components/ChatbotButton.tsx
"use client";

import { useState } from "react";
import { Bot, X } from "lucide-react";
import AIAgentChatbot from "./AIAgentChatbot";

interface ChatbotButtonProps {
  // Optional props if needed
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  className?: string;
}

const ChatbotButton: React.FC<ChatbotButtonProps> = ({ 
  position = "bottom-right",
  className = "" 
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Position classes
  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  const toggleChatbot = (): void => {
    setIsOpen((prev) => !prev);
  };

  const closeChatbot = (): void => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={toggleChatbot}
        className={`
          fixed 
          ${positionClasses[position]} 
          z-[199] 
          flex 
          h-14 
          w-14 
          items-center 
          justify-center 
          rounded-full 
          shadow-lg 
          transition-all 
          duration-300 
          ${
            isOpen
              ? "bg-gray-700 hover:bg-gray-800 rotate-90"
              : "bg-[#07111f] hover:bg-[#111c2c]"
          }
          ${className}
        `}
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
        title={isOpen ? "Close chatbot" : "Open AI assistant"}
      >
        {isOpen ? (
          <X size={24} className="text-white" />
        ) : (
          <Bot size={24} className="text-white" />
        )}
      </button>

      {/* Chatbot */}
      <AIAgentChatbot isOpen={isOpen} onClose={closeChatbot} />
    </>
  );
};

export default ChatbotButton;
