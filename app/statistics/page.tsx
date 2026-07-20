"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, AlertTriangle, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { motion } from "framer-motion";

type TimeRange = "1D" | "1W" | "1M";

type ChartData = {
  timeLabel: string;
  timestamp: number;
  ph: number;
  water: number;
  flow: number;
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
          .select("created_at, ph, water_percent, flow")
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
        const aggregated: Record<string, { ph_sum: number, water_sum: number, flow_sum: number, count: number, ts: number }> = {};

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
            aggregated[key] = { ph_sum: 0, water_sum: 0, flow_sum: 0, count: 0, ts: date.getTime() };
          }
          aggregated[key].ph_sum += row.ph;
          aggregated[key].water_sum += row.water_percent;
          aggregated[key].flow_sum += row.flow;
          aggregated[key].count += 1;
        });

        const formattedData: ChartData[] = Object.values(aggregated).map((item) => {
          const date = new Date(item.ts);
          return {
            timestamp: item.ts,
            timeLabel: range === "1D" 
              ? date.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: '2-digit', minute: '2-digit' }) 
              : date.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: 'numeric', month: 'short' }),
            ph: Number((item.ph_sum / item.count).toFixed(2)),
            water: Math.round(item.water_sum / item.count),
            flow: Number((item.flow_sum / item.count).toFixed(2))
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
        <div className="bg-slate-900/90 border border-slate-700 p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-slate-400 text-xs mb-3 font-bold uppercase tracking-wider">{payload[0].payload.timeLabel}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-3 mb-2 last:mb-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color, boxShadow: `0 0 10px ${entry.color}` }} />
              <span className="text-slate-300 text-sm font-medium">{entry.name}:</span>
              <span className="text-white font-black tabular-nums">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans pt-12 pb-24">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50" />
      <motion.div 
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none" 
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-full">
        
        {/* Header & Controls */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 border-b border-slate-800/80 pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                <TrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Analytics
              </h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Historical Data Trends (WIB)</p>
          </div>
          
          <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-700/50 shadow-inner backdrop-blur-md">
            {(["1D", "1W", "1M"] as TimeRange[]).map((t) => (
              <button
                key={t}
                onClick={() => setRange(t)}
                className={`px-8 py-2 text-sm font-bold rounded-lg transition-all ${
                  range === t 
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/50" 
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.header>

        {loading ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32">
            <Activity className="w-12 h-12 text-indigo-500 animate-spin-slow mb-6" />
            <p className="text-slate-400 font-medium tracking-widest uppercase animate-pulse">Loading Analytics...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 font-bold">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32">
            <p className="text-slate-500 font-medium">Tidak ada data untuk periode ini.</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-8"
          >
            {/* pH Chart */}
            <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/50 shadow-2xl bg-slate-900/40">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                    pH Level Trend
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Average pH / {range}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-emerald-400 tracking-tighter tabular-nums drop-shadow-md">
                    {data[data.length - 1]?.ph.toFixed(2)}
                  </span>
                  <span className="block text-[10px] font-bold text-emerald-500/70 mt-1 uppercase tracking-widest">Latest</span>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} interval={0} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={['auto', 'auto']} dx={-10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" name="pH Level" dataKey="ph" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorPh)" activeDot={{ r: 6, fill: '#10b981', stroke: '#022c22', strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Water Level Chart */}
            <motion.div variants={itemVariants} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/50 shadow-2xl bg-slate-900/40">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                    Water Capacity Trend
                  </h2>
                  <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-wider">Average % / {range}</p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-blue-400 tracking-tighter tabular-nums drop-shadow-md">
                    {data[data.length - 1]?.water}%
                  </span>
                  <span className="block text-[10px] font-bold text-blue-500/70 mt-1 uppercase tracking-widest">Latest</span>
                </div>
              </div>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="timeLabel" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} dy={10} interval={0} />
                    <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} dx={-10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }} />
                    <Area type="monotone" name="Water Level" dataKey="water" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorWater)" activeDot={{ r: 6, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </main>
  );
}
