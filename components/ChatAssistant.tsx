import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, User, Trash2, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { ChatMessage, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import { chatWithAi } from '../services/geminiService';

interface ChatAssistantProps {
  language: Language;
  initialMessage?: string;
  onClearInitial?: () => void;
  onReset: () => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ language, initialMessage, onClearInitial, onReset }) => {
  const t = TRANSLATIONS[language];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'model', text: t.welcomeChat, timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (initialMessage) {
      setInput(initialMessage); 
      if (onClearInitial) onClearInitial();
    }
  }, [initialMessage]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to correctly calculate scrollHeight when text is deleted
      textareaRef.current.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Update welcome message if language changes and chat hasn't been used much
  useEffect(() => {
    if (messages.length === 1 && messages[0].id === 'welcome') {
      setMessages([{ id: 'welcome', role: 'model', text: t.welcomeChat, timestamp: Date.now() }]);
    }
  }, [language]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const currentImage = selectedImage; 
    const currentInput = input;

    // Reset input states immediately
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    // Reset textarea height manually after send
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      image: currentImage || undefined,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    // Prepare history including images
    const history = messages.map(m => ({ 
      role: m.role, 
      text: m.text,
      image: m.image
    }));

    try {
      const responseText = await chatWithAi(currentInput, currentImage || undefined, history, language);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: t.errorGeneric,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    // Resets local chat
    setMessages([{ id: 'welcome', role: 'model', text: t.welcomeChat, timestamp: Date.now() }]);
    // Triggers full app reset (Analysis, etc.)
    onReset();
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] lg:h-[600px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg">
            <Bot size={20} />
          </div>
          <h3 className="font-semibold">{t.chat}</h3>
        </div>
        <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full transition-colors" title={t.clear}>
          <Trash2 size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 scrollbar-hide">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user'
                  ? 'bg-cyan-600 text-white rounded-br-none'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
              }`}
            >
              {msg.image && (
                <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                  <img src={msg.image} alt="User upload" className="max-w-full h-auto max-h-48 object-cover" />
                </div>
              )}
              <ReactMarkdown 
                className={`text-sm prose ${msg.role === 'user' ? 'prose-invert' : 'prose-slate'} max-w-none break-words`}
                components={{
                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 space-y-1" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-4 space-y-1" />,
                    p: ({node, ...props}) => <p {...props} className="mb-1 last:mb-0" />
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-none px-3 py-2 shadow-sm">
                {/* ECG / Heartbeat Animation for Chat */}
                <div className="ecg-svg" style={{ width: '60px', height: '30px' }}>
                    <svg className="w-full h-full" viewBox="0 0 140 40" preserveAspectRatio="none">
                        <path 
                           className="ecg-path" 
                           d="M0,20 L20,20 L30,35 L40,5 L50,30 L60,20 L90,20 L100,35 L110,5 L120,30 L130,20 L140,20" 
                           strokeWidth="3"
                        />
                    </svg>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        {/* Image Preview */}
        {selectedImage && (
          <div className="mb-2 relative inline-block">
             <div className="w-20 h-20 rounded-xl overflow-hidden border border-teal-100 shadow-sm relative group">
                <img src={selectedImage} className="w-full h-full object-cover" />
                <button 
                  onClick={() => { setSelectedImage(null); if(fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                >
                  <X size={20} />
                </button>
             </div>
          </div>
        )}

        <div className="flex items-end gap-2">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors mb-0.5"
            title="Upload Image"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
             <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                 if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={t.chatPlaceholder}
              rows={1}
              className="w-full pl-4 pr-10 py-3 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-cyan-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400 resize-none min-h-[46px] max-h-32 overflow-y-auto"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 disabled:opacity-50 disabled:hover:bg-cyan-600 transition-colors mb-0.5 shadow-sm shadow-cyan-200"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;