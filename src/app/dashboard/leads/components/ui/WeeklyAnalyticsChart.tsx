"use client";
import { useState, useMemo, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface WeeklyAnalyticsChartProps {
  leads: any[];
}

// ============================================================================
// KOMPONEN CUSTOM TOOLTIP (BIAR HOVER-NYA JADI SANGAT PREMIUM)
// ============================================================================
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] backdrop-blur-md relative overflow-hidden">
        {/* Efek Glow di dalam Tooltip */}
        <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/20 blur-xl rounded-full"></div>
        
        <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-1">{label}</p>
        <p className="font-bold text-2xl text-white flex items-baseline gap-1.5">
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
    <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 relative z-0 hover:shadow-[0_20px_60px_-15px_rgba(37,99,235,0.1)] transition-shadow duration-500">
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <h3 className="font-black text-slate-800 text-[10px] md:text-xs uppercase italic tracking-widest text-center md:text-left">
          Interaction Analytics
        </h3>
        
        <div className="flex items-center gap-2 md:gap-4 bg-slate-50 px-2 py-2 md:px-4 rounded-2xl border border-slate-100/50 shadow-inner">
          <button 
              onClick={handlePrevWeek}
              className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-blue-600 hover:text-white transition-all text-slate-400 hover:shadow-md font-black active:scale-95"
          >
              &lt;
          </button>

          <div 
              onClick={openDatePicker} 
              className="cursor-pointer group hover:bg-white px-4 py-1.5 rounded-xl transition-all flex flex-col items-center justify-center min-w-[120px] relative"
          >
              <input 
                ref={dateInputRef}
                type="date" 
                value={stringDateForInput}
                max={maxDateToday}
                onChange={handleDatePick}
                // Hapus pointer-events-none agar pop-up kalender browser tidak error posisinya
                className="absolute w-full h-full opacity-0 cursor-pointer top-0 left-0" 
              />

              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-1.5 group-hover:text-blue-700 transition-colors">
                <svg className="w-3.5 h-3.5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                {isCurrentWeek ? "Minggu Ini" : "Pilih Tanggal"}
              </p>
              <p className="text-[9px] font-bold text-slate-400 mt-0.5 group-hover:text-slate-600 transition-colors">{dateRangeStr}</p>
          </div>

          <button 
              onClick={handleNextWeek}
              disabled={isCurrentWeek} 
              className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all font-black ${
              isCurrentWeek 
                  ? 'bg-transparent text-slate-200 cursor-not-allowed' 
                  : 'bg-white shadow-sm hover:bg-blue-600 hover:shadow-md hover:text-white text-slate-400 active:scale-95'
              }`}
          >
              &gt;
          </button>
        </div>
      </div>

      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="day" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} 
              dy={10}
            />
            <YAxis hide domain={['auto', 'auto']} />
            
            {/* INI DIA SUNTIKAN CUSTOM TOOLTIP-NYA */}
            <Tooltip 
              cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }}
              content={<CustomTooltip />} 
            />
            
            <Line 
              type="monotone" 
              dataKey="chats" 
              stroke="#2563eb" 
              strokeWidth={5} 
              dot={{ r: 5, fill: '#fff', strokeWidth: 3, stroke: '#2563eb' }} 
              activeDot={{ r: 8, fill: '#2563eb', strokeWidth: 4, stroke: '#fff', className: "shadow-xl" }}
              animationDuration={1500}
              animationEasing="ease-out"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}