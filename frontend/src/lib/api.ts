import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
});

export const getConversations = () => api.get('/conversations');

export const createConversation = (title: string, provider: string, model: string) => 
  api.post('/conversations', { title, provider, model });

export const deleteConversation = (conversationId: string) => 
  api.delete(`/conversations/${conversationId}`);

export const getConversation = (conversationId: string) =>
  api.get(`/conversations/${conversationId}`);

export const updateConversation = (conversationId: string, provider: string, model: string) =>
  api.patch(`/conversations/${conversationId}`, { provider, model });

export const getMessages = (conversationId: string) => 
  api.get(`/conversations/${conversationId}/messages`);

export const sendMessage = (conversationId: string, content: string) => 
  api.post(`/conversations/${conversationId}/messages`, { content });

export const getMetricsSummary = () => api.get('/metrics/summary');
