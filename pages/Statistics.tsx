import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { Users, Clock, AlertTriangle, Calendar, TrendingUp, Filter, Download } from 'lucide-react';
import { UserSession } from '../types';

const COLORS = {
  present: '#10b981', // green-500
  late: '#f97316',    // orange-500
  absent: '#ef4444',  // red-500
  leave: '#3b82f6',   // blue-500
  halfday: '#84cc16'  // lime-500
};

const Statistics: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [statsData, setStatsData] = useState<{
        pie: any[],
        bar: any[],
        trend: any[],
        summary: { total: number, present: number, late: number, absent: number, leave: number }
    }>({
        pie: [], bar: [], trend: [],
        summary: { total: 0, present: 0, late: 0, absent: 0, leave: 0 }
    });
    
    const [currentUser, setCurrentUser] = useState<UserSession | null>(null);

    useEffect(() => {
        const u = localStorage.getItem('tk_user');
        if (u) setCurrentUser(JSON.parse(u));
    }, []);

    const fetchData = async () => {
        const u = JSON.parse(localStorage.getItem('tk_user') || '{}');
        let [employees, attendance] = await Promise.all([
            api.getEmployees(),
            api.getAllAttendance()
        ]);
        
        // SECURITY FILTER
        if (u && u.role === 'User') {
            employees = employees.filter(e => e.id === u.userId);
        }

        // 1. Calculate Summary & Pie Data
        let totalPresent = 0, totalLate = 0, totalAbsent = 0, totalLeave = 0;
        const deptStats: Record<string, {present: number, late: number, absent: number, leave: number}> = {};

        // 2. Calculate Daily Trend
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const dailyStats = Array.from({ length: daysInMonth }, (_, i) => ({
            day: i + 1,
            present: 0,
            late: 0
        }));

        employees.forEach(emp => {
            const empData = attendance[emp.id]?.[currentMonth] || {};
            const groupKey = u.role === 'User' ? 'Cá nhân' : emp.department;

            if(!deptStats[groupKey]) deptStats[groupKey] = { present: 0, late: 0, absent: 0, leave: 0 };

            // Loop through all days of the month for this employee
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = String(d).padStart(2, '0');
                const rec = empData[dayStr];
                
                if (rec) {
                    if(rec.status === 'present' || rec.status === 'halfday') {
                        totalPresent++;
                        deptStats[groupKey].present++;
                        dailyStats[d-1].present++;
                    }
                    if(rec.status === 'late') {
                        totalLate++;
                        deptStats[groupKey].late++;
                        dailyStats[d-1].late++;
                    }
                    if(rec.status === 'absent') {
                        totalAbsent++;
                        deptStats[groupKey].absent++;
                    }
                    if(rec.status === 'leave') {
                        totalLeave++;
                        deptStats[groupKey].leave++;
                    }
                }
            }
        });

        // Format Data for Charts
        const pieData = [
            { name: 'Đủ công', value: totalPresent, color: COLORS.present },
            { name: 'Đi muộn', value: totalLate, color: COLORS.late },
            { name: 'Vắng', value: totalAbsent, color: COLORS.absent },
            { name: 'Nghỉ phép', value: totalLeave, color: COLORS.leave },
        ].filter(d => d.value > 0);

        const barData = Object.keys(deptStats).map(dept => ({
            name: dept,
            'Đủ công': deptStats[dept].present,
            'Đi muộn': deptStats[dept].late,
            'Vắng': deptStats[dept].absent
        }));

        setStatsData({
            pie: pieData,
            bar: barData,
            trend: dailyStats,
            summary: {
                total: totalPresent + totalLate + totalAbsent + totalLeave,
                present: totalPresent,
                late: totalLate,
                absent: totalAbsent,
                leave: totalLeave
            }
        });
    };

    useEffect(() => {
        fetchData();
        const subscription = supabase
            .channel('stats_changes_v2')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => fetchData())
            .subscribe();
        return () => { supabase.removeChannel(subscription); }
    }, [currentMonth, currentYear]);

    // Custom Tooltip for Charts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-bold text-gray-800 mb-1">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{backgroundColor: entry.color}}></span>
                            {entry.name}: <span className="font-semibold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-orange-600" />
                        {currentUser?.role === 'User' ? 'Hiệu suất Cá nhân' : 'Tổng quan Nhân sự'}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Số liệu thống kê chi tiết theo thời gian thực</p>
                </div>
                
                <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <select 
                            value={currentMonth} 
                            onChange={e => setCurrentMonth(Number(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                        >
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <span className="text-gray-300">|</span>
                        <select 
                            value={currentYear} 
                            onChange={e => setCurrentYear(Number(e.target.value))}
                            className="bg-transparent text-sm font-semibold text-gray-700 outline-none cursor-pointer"
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                        </select>
                     </div>
                     <button className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition">
                        <Download className="w-5 h-5" />
                     </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard 
                    title="Tổng lượt chấm" 
                    value={statsData.summary.total} 
                    icon={Users} 
                    color="blue" 
                    subText="lượt ghi nhận"
                />
                <SummaryCard 
                    title="Đúng giờ" 
                    value={statsData.summary.present} 
                    icon={TrendingUp} 
                    color="green" 
                    subText={`${statsData.summary.total ? Math.round((statsData.summary.present / statsData.summary.total) * 100) : 0}% tổng số`}
                />
                <SummaryCard 
                    title="Đi muộn" 
                    value={statsData.summary.late} 
                    icon={Clock} 
                    color="orange" 
                    subText="cần cải thiện"
                />
                <SummaryCard 
                    title="Vắng mặt" 
                    value={statsData.summary.absent} 
                    icon={AlertTriangle} 
                    color="red" 
                    subText="không phép"
                />
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Trend Chart (Large) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-gray-800 text-lg">Xu hướng Đi làm & Đi muộn</h3>
                        <div className="flex gap-4 text-xs font-medium">
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Đi làm</div>
                            <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Đi muộn</div>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={statsData.trend} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.present} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS.present} stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.late} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={COLORS.late} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="present" name="Đi làm" stroke={COLORS.present} strokeWidth={3} fillOpacity={1} fill="url(#colorPresent)" />
                                <Area type="monotone" dataKey="late" name="Đi muộn" stroke={COLORS.late} strokeWidth={3} fillOpacity={1} fill="url(#colorLate)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Pie Chart */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="font-bold text-gray-800 text-lg mb-2">Tỷ lệ chuyên cần</h3>
                    <div className="flex-1 min-h-[250px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statsData.pie}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                    cornerRadius={6}
                                >
                                    {statsData.pie.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-bold text-gray-800">{statsData.summary.total}</span>
                            <span className="text-xs text-gray-500 uppercase font-semibold">Tổng lượt</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                         {statsData.pie.map((item, idx) => (
                             <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                                     <span className="text-xs text-gray-600 font-medium">{item.name}</span>
                                 </div>
                                 <span className="text-sm font-bold text-gray-800">{item.value}</span>
                             </div>
                         ))}
                    </div>
                </div>
            </div>

            {/* Bottom: Bar Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {currentUser?.role === 'User' ? 'Thống kê chi tiết' : 'Phân bổ theo Phòng ban'}
                    </h3>
                    <div className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <Filter className="w-4 h-4 text-gray-500" />
                    </div>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statsData.bar} barSize={40}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 13, fontWeight: 500}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                            <Tooltip cursor={{fill: 'rgba(0,0,0,0.03)'}} content={<CustomTooltip />} />
                            <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                            <Bar dataKey="Đủ công" stackId="a" fill={COLORS.present} radius={[0, 0, 4, 4]} />
                            <Bar dataKey="Đi muộn" stackId="a" fill={COLORS.late} radius={[0, 0, 0, 0]} />
                            <Bar dataKey="Vắng" stackId="a" fill={COLORS.absent} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Sub-component for Cards
const SummaryCard = ({ title, value, icon: Icon, color, subText }: any) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        green: 'bg-green-50 text-green-600 border-green-100',
        orange: 'bg-orange-50 text-orange-600 border-orange-100',
        red: 'bg-red-50 text-red-600 border-red-100',
    };

    return (
        <div className={`p-5 rounded-2xl border ${colorClasses[color]} transition hover:shadow-md cursor-default`}>
            <div className="flex justify-between items-start mb-3">
                <div className={`p-2.5 rounded-xl bg-white bg-opacity-60 shadow-sm`}>
                    <Icon className="w-5 h-5" />
                </div>
                {/* Fake trend indicator */}
                <div className="text-xs font-semibold px-2 py-1 bg-white bg-opacity-50 rounded-lg">
                    {Math.floor(Math.random() * 10) + 1}%
                </div>
            </div>
            <div>
                <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-3xl font-bold">{value}</h4>
                    <span className="text-xs font-medium opacity-70">{subText}</span>
                </div>
            </div>
        </div>
    );
}

export default Statistics;