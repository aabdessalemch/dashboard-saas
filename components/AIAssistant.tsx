"use client";
import { useState, useRef } from "react";
import { X, Upload, Send, Sparkles, Image as ImageIcon, Loader2 } from "lucide-react";

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateWidgets: (widgets: any[]) => void;
}

export default function AIAssistant({ isOpen, onClose, onGenerateWidgets }: AIAssistantProps) {
  const [message, setMessage] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<{ role: string; content: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setUploadedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!message.trim() && !uploadedImage) return;

    setIsLoading(true);
    const userMessage = message.trim();
    
    setConversation(prev => [...prev, { role: "user", content: userMessage || "Analyze this image" }]);

    try {
      console.log('🔵 Starting AI request...');
      
      let imageData = null;

      if (uploadedImage) {
        const base64Data = uploadedImage.split(',')[1];
        const mediaType = uploadedImage.split(';')[0].split(':')[1];
        
        imageData = {
          data: base64Data,
          mediaType: mediaType
        };
        console.log('📷 Image prepared');
      }

      console.log('📡 Calling /api/generate-dashboard...');

      const response = await fetch('/api/generate-dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: userMessage ? [userMessage] : ["Analyze this image and extract data"],
          image: imageData
        })
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      console.log('✅ Response received');
      
      if (data.content && data.content[0]) {
        const aiResponse = data.content[0].text;
        console.log('🤖 AI said:', aiResponse.substring(0, 150));
        
        setConversation(prev => [...prev, { role: "assistant", content: "Generating widgets..." }]);

        try {
          let jsonText = aiResponse.trim();
          
          // Clean up markdown
          jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Find JSON array
          const startIdx = jsonText.indexOf('[');
          const endIdx = jsonText.lastIndexOf(']');
          if (startIdx !== -1 && endIdx !== -1) {
            jsonText = jsonText.substring(startIdx, endIdx + 1);
          }

          console.log('🔍 Parsing JSON...');
          const widgets = JSON.parse(jsonText);
          console.log('✅ Parsed:', widgets.length, 'widgets');
          
          if (Array.isArray(widgets) && widgets.length > 0) {
            console.log('🎉 Creating widgets on dashboard!');
            onGenerateWidgets(widgets);
            setMessage("");
            setUploadedImage(null);
            setUploadedFileName(null);
            setConversation([]);
            onClose();
          } else {
            setConversation(prev => [...prev, { 
              role: "error", 
              content: "No widgets generated. Try: 'Create a KPI showing revenue $100K'" 
            }]);
          }
        } catch (parseError: any) {
          console.error("❌ Parse error:", parseError);
          setConversation(prev => [...prev, { 
            role: "error", 
            content: "Couldn't parse AI response. Try rephrasing your request." 
          }]);
        }
      } else {
        throw new Error('Empty response from AI');
      }
    } catch (error: any) {
      console.error("❌ Error:", error);
      setConversation(prev => [...prev, { 
        role: "error", 
        content: `Error: ${error.message}. Check console (F12) for details.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border border-white/20 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">AI Dashboard Generator</h2>
              <p className="text-sm text-gray-400">Powered by Google Gemini</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {conversation.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-white" />
              </div>
              <h3 className="text-white text-lg font-semibold mb-2">Try these examples:</h3>
              <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto text-left mt-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-300 text-sm">"Create a KPI card showing revenue of $124K with 12% growth"</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-300 text-sm">"Make a table with sales data for Q1-Q4"</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="text-gray-300 text-sm">"Add a welcome message text box"</div>
                </div>
              </div>
            </div>
          ) : (
            conversation.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : msg.role === "error"
                      ? "bg-red-500/20 text-red-300 border border-red-500/30"
                      : "bg-white/10 text-white border border-white/10"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white border border-white/10 rounded-xl p-4 flex items-center gap-3">
                <Loader2 size={20} className="animate-spin text-blue-400" />
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Image Preview */}
        {uploadedImage && (
          <div className="px-6 pb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10">
                  <img src={uploadedImage} alt="Upload" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{uploadedFileName}</p>
                  <p className="text-gray-400 text-xs">Image uploaded</p>
                </div>
              </div>
              <button
                onClick={handleRemoveImage}
                className="w-8 h-8 rounded-lg hover:bg-red-500/20 flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-red-400" />
              </button>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-6 border-t border-white/10">
          <div className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <ImageIcon size={20} />
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Describe your dashboard..."
              disabled={isLoading}
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading || (!message.trim() && !uploadedImage)}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating
                </>
              ) : (
                <>
                  <Send size={20} />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}