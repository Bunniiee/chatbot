import { useEffect, useState } from 'react';
import { getConversations, createConversation, deleteConversation } from '../lib/api';

interface ConversationListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await getConversations();
      setConversations(res.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewConversation = async () => {
    const provider = prompt("Provider (anthropic/openai/mock):", "mock") || "mock";
    const model = provider === "anthropic" ? "claude-3-5-sonnet-20240620" : 
                  provider === "openai" ? "gpt-4o" : "mock-model";
    
    try {
      const res = await createConversation('New Chat', provider, model);
      await fetchConversations();
      onSelect(res.data.id);
    } catch (error) {
      alert('Failed to create conversation');
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    try {
      await deleteConversation(id);
      if (selectedId === id) onSelect('');
      fetchConversations();
    } catch (error) {
      alert('Failed to delete');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#161922]">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">History</h2>
        <button 
          onClick={handleNewConversation}
          className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center"
          title="New Conversation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading && conversations.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-10 bg-gray-800/50 rounded animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm italic">
            No history yet
          </div>
        ) : (
          conversations.map((c: any) => (
            <div 
              key={c.id} 
              onClick={() => onSelect(c.id)} 
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedId === c.id 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  c.provider === 'anthropic' ? 'bg-orange-500' : 
                  c.provider === 'openai' ? 'bg-green-500' : 'bg-gray-500'
                }`} />
                <span className="truncate text-sm font-medium">{c.title}</span>
              </div>
              
              <button 
                onClick={(e) => handleDelete(e, c.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-gray-200">Dev Account</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Standard Tier</span>
          </div>
        </div>
      </div>
    </div>
  );
}
