"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Activity, AlertTriangle, History, Download, Clock, FlaskConical, Droplet, Waves, Database } from "lucide-react";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";

type LogData = {
  id: string;
  created_at: string;
  ph: number;
  water_percent: number;
  flow: number;
};

export default function HistoryPage() {
  const [data, setData] = useState<LogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const ITEMS_PER_PAGE = 50;

  const fetchData = async (pageIndex: number, overwrite = false) => {
    try {
      if (overwrite) {
        setLoading(true);
      }
      
      const { data: logs, error: fetchError } = await supabase
        .from("sensor_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageIndex * ITEMS_PER_PAGE, (pageIndex + 1) * ITEMS_PER_PAGE - 1);

      if (fetchError) throw fetchError;

      if (!logs || logs.length === 0) {
        setHasMore(false);
        if (overwrite) setData([]);
      } else {
        if (logs.length < ITEMS_PER_PAGE) setHasMore(false);
        setData(prev => overwrite ? logs : [...prev, ...logs]);
      }
    } catch (err: any) {
      console.error("Error fetching history:", err);
      setError("Gagal mengambil riwayat data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(0, true);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData(nextPage, false);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      const { data: exportData, error: exportError } = await supabase
        .from("sensor_logs")
        .select("created_at, ph, water_percent, flow")
        .order("created_at", { ascending: false })
        .limit(5000); // Batasi 5000 row untuk diekspor

      if (exportError) throw new Error(exportError.message);
      if (!exportData || exportData.length === 0) {
        alert("Tidak ada data untuk diekspor");
        return;
      }

      const formattedData = exportData.map((row) => ({
        "Waktu (WIB)": new Date(row.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        "pH": Number(row.ph.toFixed(2)),
        "Sisa Air (%)": row.water_percent,
        "Debit (L/min)": Number(row.flow.toFixed(2))
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Data Mentah");

      const today = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }).split(" ")[0].replace(/\//g, "-");
      XLSX.writeFile(workbook, `History_Sensor_${today}.xlsx`);

    } catch (err) {
      console.error("Error exporting data:", err);
      alert("Gagal mengekspor data ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans pt-12 pb-32">
      <div className="absolute inset-0 bg-grid-pattern pointer-events-none opacity-50" />
      <motion.div 
        animate={{ opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-0 w-[800px] h-[800px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none -translate-y-1/2 -translate-x-1/2" 
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col min-h-full">
        
        {/* Header & Controls */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6 border-b border-slate-800/80 pb-6"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-slate-800/80 rounded-xl border border-slate-700/50">
                <History className="w-6 h-6 text-slate-300" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                Data Logs
              </h1>
            </div>
            <p className="text-slate-400 text-sm font-medium tracking-wide">Raw Sensor History (WIB)</p>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-900/50 transition-all border border-white/10"
          >
            {isExporting ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Exporting..." : "Export Excel (5000 Rows)"}
          </motion.button>
        </motion.header>

        {loading && page === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32">
            <Activity className="w-12 h-12 text-slate-500 animate-spin-slow mb-6" />
            <p className="text-slate-400 font-medium tracking-widest uppercase animate-pulse">Loading Records...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <p className="text-red-400 font-bold">{error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-32 glass-panel rounded-3xl">
            <Database className="w-16 h-16 text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium">Database kosong. Menunggu data masuk dari alat...</p>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl bg-slate-900/60"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-950/80 border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-500" />
                        Timestamp (WIB)
                      </div>
                    </th>
                    <th className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-emerald-500" />
                        pH Level
                      </div>
                    </th>
                    <th className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Droplet className="w-4 h-4 text-blue-500" />
                        Water Level (%)
                      </div>
                    </th>
                    <th className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-cyan-500" />
                        Flow (L/m)
                      </div>
                    </th>

                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.map((row) => {
                    const isPhSafe = row.ph >= 6.5 && row.ph <= 8.5;
                    const isWaterSafe = row.water_percent >= 20;

                    return (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        key={row.id} 
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono text-slate-300">
                          {new Date(row.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border ${isPhSafe ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                            {row.ph.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold border ${isWaterSafe ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                            {row.water_percent}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-cyan-300 font-medium">
                          {row.flow.toFixed(2)}
                        </td>

                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {hasMore && (
              <div className="p-6 text-center border-t border-slate-800/60">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
                >
                  {loading ? "Memuat..." : "Muat Lebih Banyak"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </main>
  );
}
