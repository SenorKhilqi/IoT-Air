"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, Droplet, FlaskConical, AlertTriangle, CheckCircle2, Clock, Download } from "lucide-react";
import * as XLSX from "xlsx";

type SensorData = {
  ph: number;
  water_percent: number;
};

export default function Home() {
  const [data, setData] = useState<SensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = async () => {
    try {
      // Ambil data 1 menit terakhir untuk rata-rata (sliding window)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      const { data, error } = await supabase
        .from("sensor_logs")
        .select("ph, water_percent, created_at")
        .gte("created_at", oneMinuteAgo)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Terjadi kesalahan pada Supabase");
      }

      if (data && data.length > 0) {
        // Hitung rata-rata dari data 1 menit terakhir
        const ph_sum = data.reduce((acc, curr) => acc + curr.ph, 0);
        const water_sum = data.reduce((acc, curr) => acc + curr.water_percent, 0);
        
        setData({
          ph: ph_sum / data.length,
          water_percent: Math.round(water_sum / data.length)
        });
        // Ambil waktu dari data terbaru
        setLastUpdated(new Date(data[0].created_at));
      } else {
        // Fallback: Jika tidak ada data di 1 menit terakhir, ambil 1 data yang paling terakhir kali tersimpan
        const { data: fallbackData } = await supabase
          .from("sensor_logs")
          .select("ph, water_percent, created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (fallbackData) {
          setData(fallbackData as SensorData);
          setLastUpdated(new Date(fallbackData.created_at));
        }
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
      
      // Ambil data lebih banyak (misal 5000 data terakhir) untuk diagregasi per jam
      const { data: exportData, error: exportError } = await supabase
        .from("sensor_logs")
        .select("created_at, ph, water_percent")
        .order("created_at", { ascending: false })
        .limit(5000);

      if (exportError) throw new Error(exportError.message);
      if (!exportData || exportData.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
      }

      // Agregasi data menjadi rata-rata per 1 jam
      const hourlyData: Record<string, { ph_sum: number, water_sum: number, count: number, time: Date }> = {};

      exportData.forEach((row) => {
        const date = new Date(row.created_at);
        date.setMinutes(0, 0, 0); // Bulatkan ke awal jam tersebut
        const hourKey = date.toISOString();
        
        if (!hourlyData[hourKey]) {
          hourlyData[hourKey] = { ph_sum: 0, water_sum: 0, count: 0, time: date };
        }
        hourlyData[hourKey].ph_sum += row.ph;
        hourlyData[hourKey].water_sum += row.water_percent;
        hourlyData[hourKey].count += 1;
      });

      // 1. Format Data untuk Sheet 1 (Semua Data Inputan Asli)
      const rawFormattedData = exportData.map((row) => ({
        "Waktu Pencatatan": new Date(row.created_at).toLocaleString("id-ID"),
        "pH": Number(row.ph.toFixed(2)),
        "Sisa Air (%)": row.water_percent
      }));

      // 2. Format Data untuk Sheet 2 (Rata-rata Per Jam)
      const hourlyFormattedData = Object.values(hourlyData)
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .map((item) => ({
          "Waktu (Per Jam)": item.time.toLocaleString("id-ID", {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }),
          "Rata-rata pH": Number((item.ph_sum / item.count).toFixed(2)),
          "Sisa Air (%)": Number((item.water_sum / item.count).toFixed(1))
        }));

      // Buat workbook
      const workbook = XLSX.utils.book_new();
      
      // Masukkan Sheet 1
      const worksheetRaw = XLSX.utils.json_to_sheet(rawFormattedData);
      XLSX.utils.book_append_sheet(workbook, worksheetRaw, "Semua Data");

      // Masukkan Sheet 2
      const worksheetHourly = XLSX.utils.json_to_sheet(hourlyFormattedData);
      XLSX.utils.book_append_sheet(workbook, worksheetHourly, "Rata-rata Per Jam");

      // Export dan simpan sebagai file .xlsx
      XLSX.writeFile(workbook, `Monitoring_Sensor_${new Date().toISOString().split("T")[0]}.xlsx`);

    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Gagal mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Mekanisme polling setiap 5 detik agar berkesan realtime monitoring
    const intervalId = setInterval(() => {
      fetchData();
    }, 5000);

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

  const isPhSafe = ph_avg >= 6.5 && ph_avg <= 8.5;
  const isWaterSafe = water_level_avg >= 20;

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col min-h-screen">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 sm:mb-12 gap-6 border-b border-slate-800/60 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Activity className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">System Monitor</h1>
            </div>
            <p className="text-slate-400 text-sm">Real-time Hydroponic Telemetry</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportExcel}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-full transition-colors shadow-lg shadow-blue-500/20"
            >
              {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4 glass-panel px-4 py-2 rounded-full">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-medium text-slate-300">System Online</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center gap-2">
                  <span className="w-px h-4 bg-slate-700"></span>
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-500 font-mono">
                    {lastUpdated.toLocaleTimeString('id-ID', { hour12: false })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
          
          {/* Card pH */}
          <div className={`glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${isPhSafe ? 'glow-safe border-emerald-500/20' : 'glow-danger border-red-500/50'}`}>
            <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
              <FlaskConical className="w-64 h-64" />
            </div>
            
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-3 sm:p-4 rounded-2xl ${isPhSafe ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                  <FlaskConical className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">pH Level</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">Average (1 Minute)</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border flex items-center gap-2 text-xs sm:text-sm font-semibold backdrop-blur-md ${isPhSafe ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                {isPhSafe ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> : <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />}
                {isPhSafe ? "NORMAL" : "CRITICAL"}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8 sm:py-12 flex-1">
              <div className="relative flex justify-center items-center">
                {/* Circular Indicator Base */}
                <svg className="w-48 h-48 sm:w-64 sm:h-64 transform -rotate-90" viewBox="0 0 256 256">
                  <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  {/* Circular Indicator Value (Max pH is 14. Scale: (ph / 14) * (2 * PI * R) ) */}
                  {/* R=120, C=753.98 */}
                  <circle 
                    cx="128" cy="128" r="120" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray="753.98" 
                    strokeDashoffset={753.98 - (ph_avg / 14) * 753.98}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ease-out ${isPhSafe ? 'text-emerald-500' : 'text-red-500'}`} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl sm:text-6xl font-black tracking-tighter text-white tabular-nums drop-shadow-lg">
                    {ph_avg.toFixed(1)}
                  </span>
                  <span className="text-xs sm:text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">pH</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <span>0.0</span>
                <span>Safe Range: 6.5 - 8.5</span>
                <span>14.0</span>
              </div>
              {/* Linear Scale */}
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute left-[46.4%] right-[39.2%] h-full bg-emerald-500/20" />
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isPhSafe ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${(ph_avg / 14) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card Water Level */}
          <div className={`glass-panel rounded-3xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-700 ${isWaterSafe ? 'glow-safe border-blue-500/20' : 'glow-danger border-red-500/50'}`}>
            <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
              <Droplet className="w-64 h-64" />
            </div>

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`p-3 sm:p-4 rounded-2xl ${isWaterSafe ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Droplet className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-semibold text-white">Water Level</h2>
                  <p className="text-slate-400 text-xs sm:text-sm">Average (1 Minute)</p>
                </div>
              </div>
              <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border flex items-center gap-2 text-xs sm:text-sm font-semibold backdrop-blur-md ${isWaterSafe ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-red-500/20 border-red-500/50 text-red-400'}`}>
                {isWaterSafe ? <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" /> : <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />}
                {isWaterSafe ? "NORMAL" : "LOW LEVEL"}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-8 sm:py-12 flex-1">
              <div className="relative flex justify-center items-center">
                {/* Circular Indicator Base */}
                <svg className="w-48 h-48 sm:w-64 sm:h-64 transform -rotate-90" viewBox="0 0 256 256">
                  <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-800" />
                  {/* Circular Indicator Value */}
                  <circle 
                    cx="128" cy="128" r="120" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="transparent" 
                    strokeDasharray="753.98" 
                    strokeDashoffset={753.98 - (Math.min(Math.max(water_level_avg, 0), 100) / 100) * 753.98}
                    strokeLinecap="round"
                    className={`transition-all duration-1000 ease-out ${isWaterSafe ? 'text-blue-500' : 'text-red-500'}`} 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-5xl sm:text-6xl font-black tracking-tighter text-white tabular-nums drop-shadow-lg">
                    {water_level_avg}
                  </span>
                  <span className="text-base sm:text-lg font-medium text-slate-400 mt-1">%</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-slate-800 pt-6">
              <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                <span>Empty</span>
                <span>Min: 20%</span>
                <span>Full</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute left-0 right-[80%] h-full bg-red-500/20" />
                <div 
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isWaterSafe ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(Math.max(water_level_avg, 0), 100)}%` }}
                />
              </div>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
}
