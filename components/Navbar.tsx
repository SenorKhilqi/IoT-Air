"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, History } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/50 shadow-xl">
      <Link href="/">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${pathname === "/" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
          <LayoutDashboard className="w-4 h-4" />
          <span className="text-sm font-semibold">Dashboard</span>
        </div>
      </Link>
      <Link href="/statistics">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${pathname === "/statistics" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
          <LineChart className="w-4 h-4" />
          <span className="text-sm font-semibold">Statistics</span>
        </div>
      </Link>
      <Link href="/history">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${pathname === "/history" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
          <History className="w-4 h-4" />
          <span className="text-sm font-semibold">History</span>
        </div>
      </Link>
    </nav>
  );
}
