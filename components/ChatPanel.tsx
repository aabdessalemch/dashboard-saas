"use client";
import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare, Sparkles, Loader2, ChevronDown, ChevronUp, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  fileType?: 'csv' | 'image';
  fileName?: string;
  confirmActions?: any[];
}

interface ChatPanelProps {
  onWidgetAction: (action: any) => void;
  currentWidgets: any[];
  aiLimit?: { allowed: boolean; remaining: number; resetTime: Date | null };
}

export default function ChatPanel({ onWidgetAction, currentWidgets, aiLimit }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{type: 'csv' | 'image', data: string, name: string} | null>(null);
  const [lastWidgetId, setLastWidgetId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('dashgen_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!isExpanded) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = items[i].getAsFile();
          if (file) {
            await handleImageFile(file);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isExpanded]);

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    
    if (fileType === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      setUploadedFile({ type: 'csv', data: text, name: file.name });
      setInput(`Create a table from this CSV: ${file.name}`);
    } else if (fileType.startsWith('image/')) {
      await handleImageFile(file);
    } else {
      alert('Please upload a CSV file or image (PNG, JPG, JPEG)');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setUploadedFile({ type: 'image', data: base64, name: file.name });
      setInput(`Analyze this image and create relevant widgets: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim() || 'Uploaded file',
      timestamp: Date.now(),
      fileType: uploadedFile?.type,
      fileName: uploadedFile?.name
    };

    setMessages(prev => [...prev, userMessage]);
    const currentFile = uploadedFile;
    setInput("");
    setUploadedFile(null);
    setIsLoading(true);

    try {
      const dashboardContext = {
        widgetCount: currentWidgets.length,
        widgetTypes: currentWidgets.map((w: any) => {
          const info: any = { 
            id: w.id, 
            type: w.type,
            title: w.data?.title || `${w.type} widget`
          };
          
          if (w.type === 'table' && w.data?.rows) {
            info.tableData = {
              columns: w.data.columns?.map((c: any) => c.header) || [],
              rowCount: w.data.rows.length,
              allRows: w.data.rows
            };
          }
          else if (['bar', 'line', 'pie', 'trend'].includes(w.type) && w.data?.data) {
            info.chartData = w.data.data;
          } else if (w.type === 'kpi') {
            info.kpiData = {
              value: w.data?.value,
              change: w.data?.change
            };
          }
          
          return info;
        })
      };

      const requestBody: any = {
        message: userMessage.content,
        conversationHistory: messages.slice(-10),
        dashboardContext
      };

      if (currentFile) {
        if (currentFile.type === 'csv') {
          const csvData = parseCSV(currentFile.data);
          requestBody.csvData = csvData;
          requestBody.csvFileName = currentFile.name;
        } else if (currentFile.type === 'image') {
          requestBody.imageData = currentFile.data;
          requestBody.imageFileName = currentFile.name;
        }
      }

      // Add placeholder assistant message for streaming
      const placeholderMsg: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, placeholderMsg]);

      const response = await fetch('/api/chat-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Remove the empty placeholder message before throwing
        setMessages(prev => prev.slice(0, -1));
        let errorMsg = `API error (${response.status})`;
        try {
          const errBody = await response.json();
          if (errBody.isRateLimit || response.status === 429) {
            errorMsg = '⏳ AI quota temporarily exceeded. All Gemini API routes (chat, generate, SPC) share the same limit. Please wait 1-2 minutes and try again.';
          } else {
            errorMsg = errBody.error || errBody.details || errorMsg;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      // Stream SSE response
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let pendingActions: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]' || !jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);

            // If this chunk has actions, collect them
            if (parsed.actions) {
              pendingActions = parsed.actions;
              continue;
            }

            // Otherwise it's a text chunk - append to streaming message
            if (parsed.text) {
              fullText += parsed.text;
              // Strip action delimiters from display text
              let displayText = fullText;
              const actStart = displayText.indexOf('__ACTIONS_START__');
              if (actStart !== -1) {
                displayText = displayText.substring(0, actStart).trim();
              }
              // Update the last message in place
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: displayText
                };
                return updated;
              });
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      // Execute collected actions after stream completes
      if (pendingActions.length > 0) {
        for (const action of pendingActions) {
          if (action.type === 'confirm') {
            // Store confirm actions on the message for UI rendering
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                confirmActions: action.pendingActions
              };
              return updated;
            });
          } else {
            // Track last widget ID for reference resolution
            if (action.widgetId) setLastWidgetId(action.widgetId);
            onWidgetAction(action);
          }
        }
      }

    } catch (error: any) {
      console.error('❌ Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ ${error.message}`,
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
            <p className="text-xs text-gray-400">
              {aiLimit && aiLimit.remaining !== 999 
                ? `${aiLimit.remaining}/10 generations left` 
                : 'Chat, upload CSV, paste images'}
            </p>
          </div>
        </div>
        <button className="text-white hover:bg-white/10 rounded-lg p-1 transition-colors">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {isExpanded && (
        <>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[500px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mb-3">
                  <Sparkles size={24} className="text-white" />
                </div>
                <p className="text-white text-sm font-medium mb-1">Start a Conversation</p>
                <p className="text-gray-400 text-xs max-w-[220px] mb-4">
                  Chat, upload CSV files, or paste screenshots (Ctrl+V)
                </p>
                <div className="space-y-2 w-full">
                  <button
                    onClick={() => setInput("Create a table with months of the year")}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    💡 "Create a table with months"
                  </button>
                  <button
                    onClick={() => setInput("Add 3 KPIs for revenue, users, growth")}
                    className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    💡 "Add 3 KPIs"
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-xs text-blue-300 transition-colors flex items-center gap-2"
                  >
                    <Paperclip size={12} />
                    📎 Upload CSV or Image
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
                      {msg.fileType && (
                        <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-80">
                          {msg.fileType === 'csv' ? <FileText size={10} /> : <ImageIcon size={10} />}
                          <span>{msg.fileName}</span>
                        </div>
                      )}
                      <p className="text-xs whitespace-pre-wrap">{msg.content}</p>
                      {msg.confirmActions && msg.confirmActions.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              msg.confirmActions!.forEach((a: any) => onWidgetAction(a));
                              setMessages(prev => prev.map((m, idx) =>
                                idx === messages.indexOf(msg) ? { ...m, confirmActions: undefined } : m
                              ));
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors"
                          >
                            Yes, do it
                          </button>
                          <button
                            onClick={() => {
                              setMessages(prev => prev.map((m, idx) =>
                                idx === messages.indexOf(msg) ? { ...m, confirmActions: undefined } : m
                              ));
                            }}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
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
                      <span className="text-xs">Processing{uploadedFile ? ' file' : ''}...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

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

          <div className="p-4 border-t border-white/10">
            {/* AI Limit Warning */}
            {aiLimit && !aiLimit.allowed && aiLimit.resetTime && (
              <div className="mb-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-200 text-xs font-medium">
                  🚫 AI Limit Reached (0/10)
                </p>
                <p className="text-red-300 text-[10px]">
                  Resets in {Math.ceil((aiLimit.resetTime.getTime() - Date.now()) / (1000 * 60 * 60))} hours
                </p>
              </div>
            )}
            
            {uploadedFile && (
              <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                {uploadedFile.type === 'csv' ? <FileText size={14} className="text-blue-400" /> : <ImageIcon size={14} className="text-blue-400" />}
                <span className="text-xs text-blue-300 flex-1 truncate">{uploadedFile.name}</span>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-blue-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-2 bg-white/5 hover:bg-white/10 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title="Upload CSV or Image"
              >
                <Paperclip size={16} />
              </button>
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
                placeholder="Type message or paste image (Ctrl+V)..."
                disabled={isLoading}
                className="flex-1 bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !uploadedFile)}
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
              📎 Upload CSV/Image • Ctrl+V to paste • {currentWidgets.length} widgets
              {aiLimit && aiLimit.remaining !== 999 && ` • ${aiLimit.remaining}/10 AI left`}
            </p>
          </div>
        </>
      )}
    </div>
  );
}