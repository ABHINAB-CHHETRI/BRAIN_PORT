import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Sparkles, HelpCircle } from 'lucide-react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface AiChatbotProps {
  token: string | null;
}

const QUICK_PROMPTS = [
  { label: '💡 Today\'s task suggestions', text: 'Suggest 3 productive, fun tasks for my day that I can create in Task Buddy.' },
  { label: '📝 Notepad formatting tips', text: 'Give me 3 simple ideas or structured templates for taking notes inside the Notepad.' },
  { label: '💾 Nostalgic vintage tip', text: 'Tell me a fun historical fact or nostalgic vintage computing tip from 1995.' }
];

export default function AiChatbot({ token }: AiChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'SYSTEM BOOT SUCCESSFUL.\n\nHello! I am Task Assistant 95. Your intelligent retro desktop adviser.\n\nAsk me anything! I can help you brainstorm tasks, design perfect templates, or teach you about vintage tech.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('System Online');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat list
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading || !token) return;

    const userMsg: Message = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setStatusText('Dialing AI mainframe...');

    try {
      // Keep only last 10 messages for context to keep payload reasonable
      const contextHistory = messages.slice(-10);

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: textToSend,
          history: contextHistory
        })
      });

      if (!res.ok) {
        throw new Error('Network response error');
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.reply || 'System Timeout.' }]);
      setStatusText('Ready');
    } catch (error) {
      console.error('Chat bot request failed:', error);
      setMessages(prev => [...prev, {
        role: 'model',
        text: '⚠️ ERROR: AI mainframe connection broken.\n\nPlease confirm you have registered, logged in, and set a valid GEMINI_API_KEY in Settings > Secrets.'
      }]);
      setStatusText('Network Fault');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'model',
        text: 'SYSTEM CACHE FLUSHED.\n\nTask Assistant 95 has been rebooted. How can I help you organize your workflow now?'
      }
    ]);
    setStatusText('System Re-booted');
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#dfdfdf] font-pixel text-black select-none">
      
      {/* Upper Status Line */}
      <div className="bg-[#c0c0c0] px-3 py-1.5 border-b border-[#808080] flex justify-between items-center text-[10px] font-bold tracking-tight">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full border border-white animate-pulse" />
          <span className="uppercase text-gray-700">AGENT PORT: 95</span>
        </div>
        <div className="text-blue-900 flex items-center gap-1">
          <span>{statusText}</span>
        </div>
      </div>

      {/* Main Grid: Chat log & Sidebar */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 p-3">
        
        {/* Left Side: Message logs */}
        <div className="flex-1 flex flex-col min-h-0 bg-white border-inset p-2">
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex flex-col max-w-[85%] rounded-xs p-2 text-xs leading-relaxed ${
                    isUser
                      ? 'self-end bg-[#000080] text-white border border-[#000040]'
                      : 'self-start bg-[#f1f1f1] text-black border border-[#808080] whitespace-pre-wrap'
                  }`}
                >
                  {/* Sender Header */}
                  <span className={`text-[9px] font-bold block mb-1 uppercase tracking-wider ${isUser ? 'text-yellow-300' : 'text-blue-800'}`}>
                    {isUser ? '👤 User' : '⚡ Task Assistant 95'}
                  </span>
                  <div>{msg.text}</div>
                </div>
              );
            })}
            
            {loading && (
              <div className="self-start bg-[#f1f1f1] text-black border border-[#808080] max-w-[85%] rounded-xs p-2.5 text-xs animate-pulse flex items-center gap-2">
                <span className="text-blue-800 font-bold text-[9px]">⚡ AI CORE IS PROCESSING</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce delay-0" />
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce delay-150" />
                  <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce delay-300" />
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Right Side / Sidebar: Quick prompts & options */}
        <div className="w-full md:w-56 flex flex-col gap-2 shrink-0">
          <div className="p-2.5 bg-[#c0c0c0] border border-[#808080] flex-1 flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-gray-700 block uppercase tracking-wide border-b border-gray-400 pb-1 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-800" /> Quick Suggest Panels
            </span>
            
            <div className="flex flex-col gap-2 flex-1">
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(qp.text)}
                  disabled={loading}
                  className="text-left p-1.5 bg-white border border-t-[#ffffff] border-l-[#ffffff] border-r-gray-500 border-b-gray-500 text-[10px] leading-tight hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 cursor-pointer block hover:border-r-black hover:border-b-black"
                >
                  <div className="font-bold text-blue-900 mb-0.5">{qp.label}</div>
                  <div className="text-gray-600 truncate">{qp.text}</div>
                </button>
              ))}
            </div>

            <button
              onClick={handleClearChat}
              className="w-full p-1.5 mt-auto bg-[#c0c0c0] border-outset font-bold text-[10px] flex items-center justify-center gap-1.5 text-red-900 hover:text-red-950 active:border-inset cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Flush Chat Cache</span>
            </button>
          </div>
        </div>

      </div>

      {/* Message Input Bar */}
      <div className="bg-[#c0c0c0] p-2 border-t border-[#808080] flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
          disabled={loading}
          placeholder="Enter a task query or ask a workflow question..."
          className="flex-1 px-2.5 py-1.5 border-inset bg-white text-black text-xs font-pixel outline-hidden placeholder-gray-500"
        />
        <button
          onClick={() => handleSendMessage(inputValue)}
          disabled={loading || !inputValue.trim()}
          className="px-4 py-1.5 bg-[#c0c0c0] border-outset font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:border-inset"
        >
          <Send className="w-3 h-3" />
          <span>Send</span>
        </button>
      </div>

    </div>
  );
}
