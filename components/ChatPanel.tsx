"use client";
import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, X, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatPanelProps {
  onWidgetAction: (action: any) => void;
  currentWidgets: any[];
}

export default function ChatPanel({ onWidgetAction, currentWidgets }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load conversation history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dashgen_chat_history');
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load chat history');
      }
    }
  }, []);

  // Save conversation to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dashgen_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context about current dashboard
      const dashboardContext = {
        widgetCount: currentWidgets.length,
        widgetTypes: currentWidgets.map((w: any) => ({ 
          id: w.id, 
          type: w.type,
          title: w.data?.title || `${w.type} widget`
        }))
      };

      const response = await fetch('/api/chat-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          dashboardContext
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add assistant response
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Execute actions if any
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: any) => {
          onWidgetAction(action);
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('dashgen_chat_history');
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-400">Modify your dashboard</p>
          </div>
        </div>
        <button className="text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {/* Chat Area */}
      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-white" />
                </div>
                <p className="text-white text-sm font-medium mb-1">Start a Conversation</p>
                <p className="text-gray-400 text-xs max-w-[200px]">
                  Ask me to modify widgets, add new ones, or change values
                </p>
                <div className="mt-4 space-y-2 w-full">
                  <button
                    onClick={() => setInput("Change the revenue KPI to $600K")}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    💡 "Change the revenue KPI to $600K"
                  </button>
                  <button
                    onClick={() => setInput("Add a text box saying Welcome")}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    💡 "Add a text box saying Welcome"
                  </button>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/10 text-white border border-white/10'
                      }`}
                    >
                      <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${
                        msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                      }`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-white border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-blue-400" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Clear History Button */}
          {messages.length > 0 && (
            <div className="px-4 pb-2">
              <button
                onClick={clearHistory}
                className="w-full text-xs text-gray-400 hover:text-white py-1 transition-colors"
              >
                Clear History
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask me to modify your dashboard..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Press Enter to send • Currently {currentWidgets.length} widgets on dashboard
            </p>
          </div>
        </>
      )}
    </div>
  );
}