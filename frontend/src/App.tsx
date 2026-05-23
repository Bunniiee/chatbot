import { useState } from 'react';
import ConversationList from './components/ConversationList';
import ChatWindow from './components/ChatWindow';
import Dashboard from './pages/Dashboard';

function App() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-100 font-sans">
      {/* Header */}
      <header className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-[#161922]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold">Z</div>
          <h1 className="text-xl font-semibold tracking-tight">LLM Observability</h1>
        </div>
        
        <nav className="flex bg-gray-800/50 p-1 rounded-lg border border-gray-700">
          <button 
            onClick={() => setView('chat')} 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'chat' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Chat
          </button>
          <button 
            onClick={() => setView('dashboard')} 
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              view === 'dashboard' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
        </nav>
      </header>

      <main className="h-[calc(100-4rem)] overflow-hidden">
        {view === 'chat' ? (
          <div className="flex h-[calc(100vh-4rem)]">
            {/* Sidebar */}
            <aside className="w-80 border-r border-gray-800 bg-[#161922] flex flex-col">
              <ConversationList 
                selectedId={selectedConversationId} 
                onSelect={setSelectedConversationId} 
              />
            </aside>

            {/* Main Chat Area */}
            <section className="flex-1 bg-[#0f1117] overflow-hidden">
              {selectedConversationId ? (
                <ChatWindow conversationId={selectedConversationId} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-white mb-2">No active conversation</h3>
                  <p className="text-gray-400 max-w-xs">Select a conversation from the sidebar or start a new one to begin debugging.</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="h-[calc(100vh-4rem)] overflow-y-auto p-8">
            <Dashboard />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
