"use client";
import { useState, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WeeklyAnalyticsChartProps {
  leads: any[];
}

// ============================================================================
// KOMPONEN CUSTOM TOOLTIP (SUDAH DARK MODE PREMIUM)
// ============================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 border border-slate-700 p-4 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] backdrop-blur-xl relative overflow-hidden">
        {/* Efek Glow di dalam Tooltip */}
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/30 blur-2xl rounded-full"></div>
        
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-1 relative z-10">{label}</p>
        <p className="font-bold text-2xl text-white flex items-baseline gap-1.5 relative z-10">
          {payload[0].value} 
          <span className="text-xs text-blue-400 font-bold uppercase tracking-wider italic">Leads</span>
        </p>
      </div>
    );
  }
  return null;
};

export default function WeeklyAnalyticsChart({ leads }: WeeklyAnalyticsChartProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);

  const openDatePicker = () => {
    try {
      dateInputRef.current?.showPicker();
    } catch (e) {
      dateInputRef.current?.focus();
    }
  };

  const { chartData, dateRangeStr, isCurrentWeek } = useMemo(() => {
    const dayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay(); 
    const monday = new Date(selectedDate);
    monday.setDate(selectedDate.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const now = new Date();
    const currentDay = now.getDay() === 0 ? 7 : now.getDay();
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - currentDay + 1);
    currentMonday.setHours(0, 0, 0, 0);
    const isCurrentWeek = monday.getTime() >= currentMonday.getTime();

    const weeklyLeads = leads.filter(lead => {
      const leadDate = new Date(lead.created_at);
      return leadDate >= monday && leadDate <= sunday;
    });

    const days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const dataTemplate = days.map((day) => ({ day, chats: 0 }));

    weeklyLeads.forEach(lead => {
      const d = new Date(lead.created_at).getDay();
      const mappedIndex = d === 0 ? 6 : d - 1; 
      dataTemplate[mappedIndex].chats += 1;
    });

    const dateRangeStr = `${monday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${sunday.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    return { chartData: dataTemplate, dateRangeStr, isCurrentWeek };
  }, [leads, selectedDate]);

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setSelectedDate(new Date(e.target.value));
    }
  };

  const stringDateForInput = selectedDate.toISOString().split('T')[0];
  const maxDateToday = new Date().toISOString().split('T')[0];

  return (
    // DIUBAH: Background gelap, border glow, shadow neon
    <div className="bg-slate-950/40 border border-slate-800/60 p-8 md:p-10 rounded-[2.5rem] shadow-[0_0_40px_rgba(0,0,0,0.5)] relative z-0 hover:border-slate-700 transition-all duration-500 backdrop-blur-xl group">
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h3 className="font-black text-slate-300 text-[10px] md:text-xs uppercase italic tracking-widest text-center md:text-left drop-shadow-md">
          Interaction Analytics
        </h3>
        
        {/* DIUBAH: Kontrol kalender jadi glassmorphism gelap */}
        <div className="flex items-center gap-2 md:gap-4 bg-slate-900/80 px-2 py-2 md:px-4 rounded-2xl border border-slate-700/50 shadow-inner backdrop-blur-md">
          <button 
              onClick={handlePrevWeek}
              className="w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-700 rounded-xl shadow-sm hover:bg-blue-600 hover:border-blue-500 hover:text-white transition-all text-slate-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] font-black active:scale-95"
          >
              &lt;
          </button>

          <div 
              onClick={openDatePicker} 
              className="cursor-pointer group/date hover:bg-slate-800/50 px-4 py-1.5 rounded-xl transition-all flex flex-col items-center justify-center min-w-[120px] relative border border-transparent hover:border-slate-700/50"
          >
              <input 
                ref={dateInputRef}
                type="date" 
                value={stringDateForInput}
                max={maxDateToday}
                onChange={handleDatePick}
                className="absolute w-full h-full opacity-0 cursor-pointer top-0 left-0" 
              />

              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center justify-center gap-1.5 group-hover/date:text-blue-300 transition-colors drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]">
                <svg className="w-3.5 h-3.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {isCurrentWeek ? "Minggu Ini" : "Pilih Tanggal"}
              </p>
              <p className="text-[9px] font-bold text-slate-500 mt-0.5 group-hover/date:text-slate-300 transition-colors">{dateRangeStr}</p>
          </div>

          <button 
              onClick={handleNextWeek}
              disabled={isCurrentWeek} 
              className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all font-black ${
              isCurrentWeek 
                  ? 'bg-slate-900/50 border-slate-800/30 text-slate-700 cursor-not-allowed' 
                  : 'bg-slate-800 border-slate-700 shadow-sm hover:bg-blue-600 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:text-white text-slate-400 active:scale-95'
              }`}
          >
              &gt;
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            {/* DIUBAH: Garis grid chart jadi lebih redup/gelap */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
            
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fontWeight: '900', fill: '#64748b'}} 
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            
            {/* DIUBAH: Garis hover (cursor) disesuaikan dengan dark mode */}
            <Tooltip 
              cursor={{ stroke: '#334155', strokeWidth: 2, strokeDasharray: '4 4' }}
              content={<CustomTooltip />} 
            />
            
            {/* DIUBAH: Garis line jadi Neon Blue, titik hover bersinar */}
            <Line 
              type="monotone" 
              dataKey="chats" 
              stroke="#3b82f6" 
              strokeWidth={5} 
              dot={{ r: 5, fill: '#0f172a', strokeWidth: 3, stroke: '#3b82f6' }} 
              activeDot={{ r: 8, fill: '#60a5fa', strokeWidth: 4, stroke: '#fff', className: "drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]" }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}