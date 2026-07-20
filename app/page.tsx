"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, Droplet, FlaskConical, AlertTriangle, CheckCircle2, Clock, Download, Waves } from "lucide-react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";

type SensorData = {
  ph: number;
  water_percent: number;
  flow: number;
};

export default function Home() {
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("sensor_logs")
        .select("ph, water_percent, flow, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || "Terjadi kesalahan pada Supabase");
      }

      if (data) {
        setData(data as SensorData);
        setLastUpdated(new Date(data.created_at));
      } else {
        // Data kosong (baru di-truncate)
        setData({ ph: 0, water_percent: 0, flow: 0 });
      }
    } catch (err: any) {
      console.error("Error fetching data:", err instanceof Error ? err.message : err);
      setError("Gagal mengambil data terbaru.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      const { data: exportData, error: exportError } = await supabase
        .from("sensor_logs")
        .select("created_at, ph, water_percent, flow")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (exportError) throw new Error(exportError.message);
      if (!exportData || exportData.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
      }

      const hourlyData: Record<string, { ph_sum: number, water_sum: number, flow_sum: number, count: number, time: Date }> = {};

      exportData.forEach((row) => {
        const date = new Date(row.created_at);
        date.setMinutes(0, 0, 0);
        const hourKey = date.toISOString();
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { ph_sum: 0, water_sum: 0, flow_sum: 0, count: 0, time: date };
        }
        hourlyData[hourKey].ph_sum += row.ph;
        hourlyData[hourKey].water_sum += row.water_percent;
        hourlyData[hourKey].flow_sum += row.flow;
        hourlyData[hourKey].count += 1;
      });

      const rawFormattedData = exportData.map((row) => ({
        "Waktu (WIB)": new Date(row.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        "pH": Number(row.ph.toFixed(2)),
        "Sisa Air (%)": row.water_percent,
        "Debit (L/min)": Number(row.flow.toFixed(2))
      }));

      const hourlyFormattedData = Object.values(hourlyData)
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .map((item) => ({
          "Waktu (WIB)": item.time.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }),
          "Rata-rata pH": Number((item.ph_sum / item.count).toFixed(2)),
          "Sisa Air (%)": Number((item.water_sum / item.count).toFixed(1)),
          "Rata-rata Debit": Number((item.flow_sum / item.count).toFixed(2))
        }));

      const workbook = XLSX.utils.book_new();
      const worksheetRaw = XLSX.utils.json_to_sheet(rawFormattedData);
      XLSX.utils.book_append_sheet(workbook, worksheetRaw, "Semua Data");
      const worksheetHourly = XLSX.utils.json_to_sheet(hourlyFormattedData);
      XLSX.utils.book_append_sheet(workbook, worksheetHourly, "Rata-rata Per Jam");

      // Gunakan waktu WIB untuk nama file
      const today = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).split(" ")[0].replace(/\//g, "-");
      XLSX.writeFile(workbook, `Monitoring_Sensor_${today}.xlsx`);

    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Gagal mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 5000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-50">
        <Activity className="w-16 h-16 text-blue-500 animate-pulse mb-4" />
        <h1 className="text-2xl font-semibold text-slate-400 tracking-widest uppercase animate-pulse">Initializing System...</h1>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-50">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-red-400">{error}</h1>
        <p className="text-slate-500 mt-2">Pastikan koneksi database tersedia.</p>
      </div>
    );
  }

  const ph_avg = data?.ph ?? 0;
  const water_level_avg = data?.water_percent ?? 0;
  const flow_avg = data?.flow ?? 0;

  const isPhSafe = ph_avg >= 6.5 && ph_avg <= 8.5;
  const isWaterSafe = water_level_avg >= 20;
  const isFlowActive = flow_avg > 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 12 } }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-600/20 rounded-full blur-[150px] pointer-events-none" 
      />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col min-h-screen">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6 border-b border-slate-800/80 pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-500/30">
                <Activity className="w-6 h-6 text-blue-400" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Nexus Telemetry
              </h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Enterprise Hydroponic Monitoring</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/50 transition-all border border-white/10"
            >
              {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Exporting..." : "Export Report"}
            </motion.button>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4 glass-panel px-5 py-2.5 rounded-xl border-slate-700/50">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                </span>
                <span className="text-sm font-bold text-slate-200">ONLINE</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center gap-2">
                  <span className="w-px h-4 bg-slate-700"></span>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    {lastUpdated.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour12: false })} WIB
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.header>

        {/* Main Grid: 4 Cards */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1"
        >
          
          {/* Card pH */}
          <motion.div variants={itemVariants} className={`glass-panel rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${isPhSafe ? 'glow-safe border-emerald-500/30' : 'glow-danger border-red-500/50'}`}>
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
              <FlaskConical className="w-48 h-48" />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl backdrop-blur-md ${isPhSafe ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">pH Level</h2>
                  <p className="text-slate-400 text-xs">Quality Index</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 flex-1 relative z-10">
              <motion.span 
                key={ph_avg}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`text-6xl font-black tracking-tighter tabular-nums drop-shadow-xl ${isPhSafe ? 'text-emerald-400' : 'text-red-400'}`}
              >
                {ph_avg.toFixed(1)}
              </motion.span>
              <div className={`mt-4 px-4 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold backdrop-blur-md ${isPhSafe ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                {isPhSafe ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {isPhSafe ? "OPTIMAL" : "CRITICAL"}
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>0.0</span>
                <span className="text-slate-400">Safe: 6.5 - 8.5</span>
                <span>14.0</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden relative">
                <div className="absolute left-[46.4%] right-[39.2%] h-full bg-emerald-500/30" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${(ph_avg / 14) * 100}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full shadow-[0_0_10px_currentColor] ${isPhSafe ? 'bg-emerald-400 text-emerald-400' : 'bg-red-500 text-red-500'}`}
                />
              </div>
            </div>
          </motion.div>

          {/* Card Water Level */}
          <motion.div variants={itemVariants} className={`glass-panel rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${isWaterSafe ? 'glow-info border-blue-500/30' : 'glow-danger border-red-500/50'}`}>
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
              <Droplet className="w-48 h-48" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl backdrop-blur-md ${isWaterSafe ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Droplet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Water Level</h2>
                  <p className="text-slate-400 text-xs">Tank Capacity</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 flex-1 relative z-10">
              <div className="flex items-end gap-1">
                <motion.span 
                  key={water_level_avg}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`text-6xl font-black tracking-tighter tabular-nums drop-shadow-xl ${isWaterSafe ? 'text-blue-400' : 'text-red-400'}`}
                >
                  {water_level_avg}
                </motion.span>
                <span className="text-2xl font-bold text-slate-500 mb-1">%</span>
              </div>
              <div className={`mt-4 px-4 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold backdrop-blur-md ${isWaterSafe ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                {isWaterSafe ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {isWaterSafe ? "NORMAL" : "REFILL NEEDED"}
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>0%</span>
                <span className="text-slate-400">Min: 20%</span>
                <span>100%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden relative">
                <div className="absolute left-0 right-[80%] h-full bg-red-500/20" />
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(Math.max(water_level_avg, 0), 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full shadow-[0_0_10px_currentColor] ${isWaterSafe ? 'bg-blue-400 text-blue-400' : 'bg-red-500 text-red-500'}`}
                />
              </div>
            </div>
          </motion.div>

          {/* Card Debit Air (Flow) */}
          <motion.div variants={itemVariants} className={`glass-panel rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-700 glow-info border-cyan-500/20`}>
            <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none">
              <Waves className="w-48 h-48" />
            </div>

            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl backdrop-blur-md bg-cyan-500/20 text-cyan-400`}>
                  <Waves className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Flow Rate</h2>
                  <p className="text-slate-400 text-xs">Realtime Debit</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 flex-1 relative z-10">
              <div className="flex items-end gap-1">
                <motion.span 
                  key={flow_avg}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-6xl font-black tracking-tighter tabular-nums drop-shadow-xl text-cyan-400`}
                >
                  {flow_avg.toFixed(1)}
                </motion.span>
                <span className="text-xl font-bold text-slate-500 mb-2">L/m</span>
              </div>
              <div className={`mt-4 px-4 py-1.5 rounded-full border flex items-center gap-2 text-xs font-bold backdrop-blur-md ${isFlowActive ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-slate-800/50 border-slate-700 text-slate-400'}`}>
                {isFlowActive ? <Activity className="w-3 h-3 animate-pulse" /> : <Clock className="w-3 h-3" />}
                {isFlowActive ? "FLOWING" : "IDLE"}
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                <span>0 L</span>
                <span>Active Output</span>
                <span>Max</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800/80 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((flow_avg / 10) * 100, 100)}%` }} // Asumsi max 10L/m
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`absolute top-0 left-0 h-full rounded-full bg-cyan-400 shadow-[0_0_10px_currentColor] text-cyan-400`}
                />
              </div>
            </div>
          </motion.div>


        </motion.div>

      </div>
    </main>
  );
}
