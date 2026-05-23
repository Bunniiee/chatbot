import { useState, useEffect, useRef } from 'react';
import { sendMessage, getMessages, getConversation, updateConversation } from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  created_at?: string;
}

const MODEL_OPTIONS = [
  { label: 'Mock', provider: 'mock', model: 'mock-model' },
  { label: 'Claude Sonnet 4.5', provider: 'anthropic', model: 'claude-sonnet-4-5' },
  { label: 'Claude Haiku 3.5', provider: 'anthropic', model: 'claude-haiku-3-5' },
  { label: 'GPT-4o', provider: 'openai', model: 'gpt-4o' },
  { label: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini' },
];

export default function ChatWindow({ conversationId }: { conversationId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [messagesRes, convRes] = await Promise.all([
          getMessages(conversationId),
          getConversation(conversationId),
        ]);
        setMessages(messagesRes.data);
        const conv = convRes.data;
        const match = MODEL_OPTIONS.find(
          o => o.provider === conv.provider && o.model === conv.model
        );
        if (match) setSelectedModel(match);
      } catch (error) {
        console.error('Failed to fetch conversation data:', error);
      }
    };
    fetchData();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  };

  const handleModelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = MODEL_OPTIONS.find(o => o.model === e.target.value);
    if (!option) return;
    setSelectedModel(option);
    try {
      await updateConversation(conversationId, option.provider, option.model);
    } catch (error) {
      console.error('Failed to update model:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const isStreaming = true; // Phase 2: always stream for better UX
      
      if (isStreaming) {
        abortControllerRef.current = new AbortController();

        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'}/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: input, stream: true }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) throw new Error('Failed to send message');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantMessage: Message = { role: 'assistant', content: '' };
        
        setMessages(prev => [...prev, assistantMessage]);

        try {
          while (true) {
            const { done, value } = await reader!.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6).trim();
                if (dataStr === '[DONE]') continue;
                try {
                  const data = JSON.parse(dataStr);
                  assistantMessage.content += data.content;
                  setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { ...assistantMessage };
                    return newMsgs;
                  });
                } catch (e) {
                  console.error('Error parsing stream chunk', e);
                }
              }
            }
          }
        } catch (e: any) {
          if (e?.name !== 'AbortError') throw e;
        } finally {
          abortControllerRef.current = null;
        }
      } else {
        const response = await sendMessage(conversationId, input);
        setMessages(prev => [...prev, response.data]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Failed to get response from the model.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#0f1117]">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-600">
            <p className="text-sm font-medium italic">Start the conversation...</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div 
            key={i} 
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl shadow-sm ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'
              }`}>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-2 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {m.role}
                </span>
                {m.created_at && (
                  <span className="text-[10px] text-gray-600">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-tl-none">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 bg-[#161922] border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex items-center gap-2 mb-2">
          <div className="relative flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              selectedModel.provider === 'anthropic' ? 'bg-orange-500' :
              selectedModel.provider === 'openai' ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            <select
              value={selectedModel.model}
              onChange={handleModelChange}
              disabled={loading}
              className="bg-[#0f1117] border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 pr-6 focus:outline-none focus:ring-1 focus:ring-blue-600/50 focus:border-blue-600 transition-all appearance-none cursor-pointer disabled:opacity-50"
            >
              {MODEL_OPTIONS.map(o => (
                <option key={o.model} value={o.model}>{o.label}</option>
              ))}
            </select>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500 absolute right-2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        <div className="max-w-4xl mx-auto relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
            className="w-full bg-[#0f1117] border border-gray-700 text-gray-100 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-600/50 focus:border-blue-600 transition-all placeholder-gray-500 disabled:opacity-50" 
            placeholder={loading ? "Waiting for response..." : "Type your message..."} 
          />
          {loading ? (
            <button
              onClick={handleStop}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors shadow-lg"
              title="Stop generating"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <rect x="4" y="4" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 transition-colors shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-[10px] text-center mt-3 text-gray-600 uppercase tracking-widest font-bold">
          Powered by Advanced LLM SDK • <span className="text-blue-500/50">Production Ready</span>
        </p>
      </div>
    </div>
  );
}
