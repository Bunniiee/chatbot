import { useEffect, useState } from 'react';
import { getMetricsSummary } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({ avg_latency: 0, total_requests: 0, error_rate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await getMetricsSummary();
        setMetrics(res.data);
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const summaryCards = [
    { title: 'Avg Latency', value: `${metrics.avg_latency}ms`, sub: 'Target < 500ms', color: 'text-blue-400' },
    { title: 'Total Requests', value: metrics.total_requests, sub: 'Last 24 hours', color: 'text-purple-400' },
    { title: 'Error Rate', value: `${metrics.error_rate}%`, sub: 'Target < 1%', color: metrics.error_rate > 5 ? 'text-red-400' : 'text-green-400' },
  ];

  // Mock timeseries data for visualization
  const chartData = [
    { time: '10:00', latency: 120, requests: 45, errors: 1 },
    { time: '11:00', latency: 150, requests: 52, errors: 0 },
    { time: '12:00', latency: 450, requests: 89, errors: 4 },
    { time: '13:00', latency: 180, requests: 61, errors: 1 },
    { time: '14:00', latency: 140, requests: 48, errors: 0 },
    { time: '15:00', latency: 130, requests: 55, errors: 0 },
    { time: '16:00', latency: 160, requests: 67, errors: 2 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">System Overview</h2>
        <p className="text-gray-500">Real-time inference performance and reliability metrics.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-[#161922] border border-gray-800 p-6 rounded-2xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{card.title}</h3>
            <div className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</div>
            <p className="text-xs text-gray-600 mt-2 font-medium">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Latency Trend */}
        <div className="bg-[#161922] border border-gray-800 p-6 rounded-2xl flex flex-col h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Latency Trend (ms)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="time" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a202c', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#3b82f6' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#3b82f6" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Throughput */}
        <div className="bg-[#161922] border border-gray-800 p-6 rounded-2xl flex flex-col h-[400px]">
          <h3 className="text-lg font-semibold mb-6">Throughput (Requests/hr)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                <XAxis dataKey="time" stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#718096" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a202c', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="requests" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
