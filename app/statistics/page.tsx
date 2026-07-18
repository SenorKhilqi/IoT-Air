"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

type TimeRange = "1D" | "1W" | "1M";

type ChartData = {
  timeLabel: string;
  timestamp: number;
  ph: number;
  water: number;
};

export default function StatisticsPage() {
  const [range, setRange] = useState<TimeRange>("1D");
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fromDate = new Date();
        if (range === "1D") {
          fromDate.setDate(fromDate.getDate() - 1);
        } else if (range === "1W") {
          fromDate.setDate(fromDate.getDate() - 7);
        } else if (range === "1M") {
          fromDate.setMonth(fromDate.getMonth() - 1);
        }

        const { data: rawData, error: fetchError } = await supabase
          .from("sensor_logs")
          .select("created_at, ph_avg, water_level_avg")
          .gte("created_at", fromDate.toISOString())
          .order("created_at", { ascending: false })
          .limit(10000);

        if (fetchError) throw fetchError;

        if (!rawData || rawData.length === 0) {
          setData([]);
          setLoading(false);
          return;
        }

        // Aggregate data
        const aggregated: Record<string, { ph_sum: number, water_sum: number, count: number, ts: number }> = {};

        rawData.forEach((row) => {
          const date = new Date(row.created_at);
          let key = "";
          
          if (range === "1D") {
            // Group by hour
            date.setMinutes(0, 0, 0);
            key = date.toISOString();
          } else {
            // Group by day
            date.setHours(0, 0, 0, 0);
            key = date.toISOString();
          }

          if (!aggregated[key]) {
            aggregated[key] = { ph_sum: 0, water_sum: 0, count: 0, ts: date.getTime() };
          }
          aggregated[key].ph_sum += row.ph_avg;
          aggregated[key].water_sum += row.water_level_avg;
          aggregated[key].count += 1;
        });

        const formattedData: ChartData[] = Object.values(aggregated).map((item) => {
          const date = new Date(item.ts);
          return {
            timestamp: item.ts,
            timeLabel: range === "1D" 
              ? date.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) 
              : date.toLocaleDateString("id-ID", { day: 'numeric', month: 'short' }),
            ph: Number((item.ph_sum / item.count).toFixed(2)),
            water: Math.round(item.water_sum / item.count)
          };
        }).sort((a, b) => a.timestamp - b.timestamp);

        setData(formattedData);
      } catch (err: any) {
        console.error("Error fetching statistics:", err);
        setError("Gagal mengambil data statistik.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [range]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
          <p className="text-slate-400 text-sm mb-2 font-medium">{payload[0].payload.timeLabel}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-300 text-sm">{entry.name}:</span>
              <span className="text-white font-bold tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans pt-12 pb-24">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50" />
      <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-full">
        
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 border-b border-slate-800/60 pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">Market Data Overview</h1>
            <p className="text-slate-400 text-sm">Historical Trends for pH & Water Level</p>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow-inner">
            {(["1D", "1W", "1M"] as TimeRange[]).map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-all ${
                  range === t 
                    ? "bg-blue-600 text-white shadow-lg" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <Activity className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
            <p className="text-slate-400 animate-pulse">Loading market data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20">
            <p className="text-slate-500">Tidak ada data untuk periode ini.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            
            {/* pH Chart */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-xl bg-slate-900/40 backdrop-blur-md">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">pH Level Trend</h2>
                  <p className="text-xs text-slate-500 mt-1">Average pH over selected period</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-emerald-400 tracking-tighter tabular-nums">
                    {data[data.length - 1]?.ph.toFixed(2)}
                  </span>
                  <span className="block text-xs font-semibold text-emerald-500/70 mt-1">LATEST</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="timeLabel" 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                      interval={0}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['auto', 'auto']}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      name="pH Level"
                      dataKey="ph" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorPh)" 
                      activeDot={{ r: 6, fill: '#10b981', stroke: '#022c22', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Water Level Chart */}
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-xl bg-slate-900/40 backdrop-blur-md">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-200">Water Level Trend</h2>
                  <p className="text-xs text-slate-500 mt-1">Average Water Capacity (%) over selected period</p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-blue-400 tracking-tighter tabular-nums">
                    {data[data.length - 1]?.water}%
                  </span>
                  <span className="block text-xs font-semibold text-blue-500/70 mt-1">LATEST</span>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="timeLabel" 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      dy={10}
                      interval={0}
                    />
                    <YAxis 
                      stroke="#475569" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[0, 100]}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area 
                      type="monotone" 
                      name="Water Level"
                      dataKey="water" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorWater)" 
                      activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
