import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Employee } from '../types';
import { STATUS_CONFIG, DEPARTMENTS } from '../constants';
import * as XLSX from 'xlsx';
import { Download, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';

const Timeline: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [attendance, setAttendance] = useState<Record<string, any>>({});
    const [currentDate, setCurrentDate] = useState(new Date());
    const [filterDept, setFilterDept] = useState('All');
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Lấy user từ localStorage để phân quyền hiển thị
    useEffect(() => {
        const u = localStorage.getItem('tk_user');
        if (u) setCurrentUser(JSON.parse(u));
    }, []);

    const fetchData = async () => {
        const u = JSON.parse(localStorage.getItem('tk_user') || '{}');
        let [empData, attData] = await Promise.all([
            api.getEmployees(),
            api.getAllAttendance()
        ]);
        
        // SECURITY FILTER: Nếu là User, chỉ giữ lại bản thân trong danh sách nhân viên
        if (u && u.role === 'User') {
            empData = empData.filter(e => e.id === u.userId);
        }

        setEmployees(empData);
        setAttendance(attData);
    };

    useEffect(() => {
        fetchData();
        
        const subscription = supabase
            .channel('timeline_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
                fetchData();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); }
    }, [currentDate]);

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const daysInMonth = new Date(year, month, 0).getDate();

    const filteredEmployees = useMemo(() => {
        if (filterDept === 'All') return employees;
        return employees.filter(e => e.department === filterDept);
    }, [employees, filterDept]);

    const changeMonth = (offset: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const exportExcel = () => {
        // Chỉ Admin mới được xuất Excel toàn bộ, User chỉ xuất của mình (logic filter đã xử lý ở trên)
        const wb = XLSX.utils.book_new();
        const data: any[] = [];

        // Headers
        const header = ['Mã NV', 'Tên NV', 'Phòng ban', ...Array.from({length: daysInMonth}, (_, i) => String(i + 1)), 'Tổng công', 'Tăng ca'];
        data.push(header);

        filteredEmployees.forEach(emp => {
            const row: (string | number)[] = [emp.code, emp.name, emp.department];
            let totalWork = 0;
            let totalOt = 0;

            for(let i = 1; i <= daysInMonth; i++) {
                const day = String(i).padStart(2, '0');
                const rec = attendance[emp.id]?.[month]?.[day];
                
                let cellVal = '';
                if(rec) {
                    cellVal = STATUS_CONFIG[rec.status as keyof typeof STATUS_CONFIG].shortLabel;
                    if(rec.status === 'present') totalWork += 1;
                    if(rec.status === 'halfday') totalWork += 0.5;
                    if(rec.overtimeHours) totalOt += rec.overtimeHours;
                }
                row.push(cellVal);
            }
            row.push(totalWork, totalOt);
            data.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, `T${month}-${year}`);
        XLSX.writeFile(wb, `ChamCong_T${month}_${year}.xlsx`);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border gap-4">
                <div className="flex items-center gap-4 bg-gray-50 p-1.5 rounded-lg">
                    <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
                    <span className="font-bold w-32 text-center">Tháng {month}/{year}</span>
                    <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight className="w-5 h-5" /></button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Chỉ Admin mới thấy bộ lọc phòng ban, vì User chỉ thấy mỗi mình mình */}
                    {currentUser?.role === 'Admin' && (
                        <select 
                            value={filterDept} 
                            onChange={e => setFilterDept(e.target.value)}
                            className="p-2 border rounded-lg bg-white"
                        >
                            <option value="All">Tất cả phòng ban</option>
                            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    )}
                    <button 
                        onClick={exportExcel}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <Download className="w-4 h-4" /> Excel
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col h-[calc(100vh-220px)]">
                <div className="overflow-auto flex-1 relative scrollbar-default">
                    <table className="w-full text-sm border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-20 shadow-sm">
                            <tr>
                                <th className="sticky left-0 z-20 bg-gray-50 p-3 border-b border-r text-left w-48 font-bold text-gray-700">Nhân viên</th>
                                {Array.from({length: daysInMonth}).map((_, i) => {
                                    const day = i + 1;
                                    const date = new Date(year, month - 1, day);
                                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                    return (
                                        <th key={i} className={`p-1 border-b border-r min-w-[36px] text-center ${isWeekend ? 'bg-orange-50 text-orange-600' : ''}`}>
                                            <div className="text-xs font-normal">{['CN','T2','T3','T4','T5','T6','T7'][date.getDay()]}</div>
                                            <div className="font-bold">{day}</div>
                                        </th>
                                    );
                                })}
                                <th className="sticky right-0 z-20 bg-gray-50 p-2 border-b border-l font-bold min-w-[60px]">Công</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEmployees.map((emp) => {
                                const empData = attendance[emp.id]?.[month] || {};
                                let totalWork = 0;

                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-2 border-b border-r border-gray-100">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
                                                    <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} alt="" className="w-full h-full object-cover" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <div className="font-medium text-gray-900 truncate w-32">{emp.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {Array.from({length: daysInMonth}).map((_, i) => {
                                            const day = String(i + 1).padStart(2, '0');
                                            const record = empData[day];
                                            const config = record ? STATUS_CONFIG[record.status as keyof typeof STATUS_CONFIG] : null;
                                            
                                            if (record?.status === 'present') totalWork += 1;
                                            if (record?.status === 'halfday') totalWork += 0.5;

                                            return (
                                                <td key={i} className="p-0 border-b border-r border-gray-100 text-center relative h-10">
                                                    {config ? (
                                                        <div 
                                                            className={`w-full h-full flex items-center justify-center font-bold text-xs ${config.color} ${config.bgColor} bg-opacity-30`}
                                                            title={`${config.label} ${record.latitude ? '- Có GPS' : ''}`}
                                                        >
                                                            {config.shortLabel}
                                                            {record.overtimeHours ? <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500"></div> : null}
                                                            {record.latitude && <div className="absolute bottom-0 right-0 text-[8px] text-blue-600"><MapPin size={8} /></div>}
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                        <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 p-2 border-b border-l font-bold text-center text-orange-600">
                                            {totalWork}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Timeline;