import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Employee, UserSession, AttendanceStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { CheckSquare, Square, Calendar, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    user: UserSession;
}

const BulkAttendance: React.FC<Props> = ({ user }) => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [selectedEmps, setSelectedEmps] = useState<Set<string>>(new Set());
    const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
    const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
    const [overtime, setOvertime] = useState('');
    const [multiplier, setMultiplier] = useState('1.5');
    
    // Calendar Generation
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        const load = async () => {
            const data = await api.getEmployees();
            // LOGIC QUYỀN HẠN: Nếu là User, chỉ hiển thị chính họ
            if (user.role === 'User') {
                const me = data.filter(e => e.id === user.userId);
                setEmployees(me);
                // Tự động chọn chính mình luôn cho tiện
                if (me.length > 0) {
                    setSelectedEmps(new Set([me[0].id]));
                }
            } else {
                setEmployees(data);
            }
        }
        load();
    }, [user.role, user.userId]);

    const toggleEmp = (id: string) => {
        // Nếu là User, không cho phép bỏ chọn chính mình (hoặc logic tùy chỉnh, ở đây giữ nguyên logic chọn/bỏ chọn nhưng danh sách đã bị giới hạn)
        const newSet = new Set(selectedEmps);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedEmps(newSet);
    };

    const toggleAll = () => {
        if (selectedEmps.size === employees.length) setSelectedEmps(new Set());
        else setSelectedEmps(new Set(employees.map(e => e.id)));
    };

    const toggleDate = (day: number) => {
        const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toISOString().split('T')[0];
        const newSet = new Set(selectedDates);
        if (newSet.has(dateStr)) newSet.delete(dateStr);
        else newSet.add(dateStr);
        setSelectedDates(newSet);
    };

    const handleSubmit = async () => {
        if (selectedEmps.size === 0 || selectedDates.size === 0) {
            toast.error("Vui lòng chọn nhân viên và ngày!");
            return;
        }

        const datesArr = Array.from(selectedDates).map((d: string) => new Date(d));
        const empArr = Array.from(selectedEmps) as string[];
        const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        const record: any = { status: selectedStatus, timestamp };
        if (overtime) {
            record.overtimeHours = parseFloat(overtime);
            record.overtimeMultiplier = parseFloat(multiplier);
        }

        try {
            await api.saveBulkAttendance(empArr, datesArr, record);
            toast.success(`Đã chấm công cho ${empArr.length} người vào ${datesArr.length} ngày!`);
            setSelectedDates(new Set());
            if (user.role === 'Admin') {
                setSelectedEmps(new Set());
            }
            // Nếu là User, giữ nguyên select bản thân
        } catch (e) {
            toast.error("Lỗi khi lưu chấm công");
        }
    };

    // Calendar Helper
    const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const startOffset = (firstDay + 6) % 7;

    return (
        <div className="space-y-6">
            {/* Control Panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-500" />
                        Chọn ngày ({viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })})
                    </h3>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        <div className="text-gray-400 text-xs py-1">T2</div>
                        <div className="text-gray-400 text-xs py-1">T3</div>
                        <div className="text-gray-400 text-xs py-1">T4</div>
                        <div className="text-gray-400 text-xs py-1">T5</div>
                        <div className="text-gray-400 text-xs py-1">T6</div>
                        <div className="text-gray-400 text-xs py-1">T7</div>
                        <div className="text-red-400 text-xs py-1">CN</div>
                        
                        {Array.from({length: startOffset}).map((_, i) => <div key={`empty-${i}`} />)}
                        
                        {Array.from({length: daysInMonth}).map((_, i) => {
                            const day = i + 1;
                            const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).toISOString().split('T')[0];
                            const isSelected = selectedDates.has(dateStr);
                            return (
                                <button
                                    key={day}
                                    onClick={() => toggleDate(day)}
                                    className={`
                                        aspect-square rounded-lg text-sm font-medium transition-all
                                        ${isSelected ? 'bg-orange-500 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}
                                    `}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="w-full md:w-80 space-y-4 border-l pl-0 md:pl-6">
                    <h3 className="font-bold text-gray-800">Thiết lập trạng thái</h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedStatus(key as AttendanceStatus)}
                                className={`
                                    flex items-center gap-2 p-2 rounded-lg border text-sm transition-all
                                    ${selectedStatus === key ? `border-${config.color.split('-')[1]}-500 bg-${config.color.split('-')[1]}-50` : 'border-gray-200 hover:bg-gray-50'}
                                `}
                            >
                                <config.icon className={`w-4 h-4 ${config.color}`} />
                                {config.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Tăng ca (h)</label>
                            <input 
                                type="number" 
                                value={overtime} 
                                onChange={e => setOvertime(e.target.value)} 
                                className="w-full p-2 border rounded-lg text-sm"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Hệ số lương</label>
                            <select 
                                value={multiplier}
                                onChange={e => setMultiplier(e.target.value)}
                                className="w-full p-2 border rounded-lg text-sm"
                            >
                                <option value="1.5">x1.5 (Ngày thường)</option>
                                <option value="2.0">x2.0 (Cuối tuần)</option>
                                <option value="3.0">x3.0 (Lễ tết)</option>
                            </select>
                        </div>
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={selectedEmps.size === 0 || selectedDates.size === 0}
                        className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold shadow-lg hover:shadow-orange-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Save className="w-5 h-5" />
                        Lưu chấm công
                    </button>
                </div>
            </div>

            {/* Employee Selection Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 text-lg">
                        {user.role === 'Admin' ? `Chọn nhân viên (${selectedEmps.size})` : 'Nhân viên (Bạn)'}
                    </h3>
                    {user.role === 'Admin' && (
                        <button onClick={toggleAll} className="flex items-center gap-2 text-orange-600 font-medium hover:bg-orange-50 px-3 py-1.5 rounded-lg transition">
                            {selectedEmps.size === employees.length ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            {selectedEmps.size === employees.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {employees.map(emp => (
                        <div 
                            key={emp.id}
                            onClick={() => toggleEmp(emp.id)}
                            className={`
                                cursor-pointer bg-white p-4 rounded-xl border-2 transition-all flex items-center gap-4 relative overflow-hidden group
                                ${selectedEmps.has(emp.id) ? 'border-orange-500 shadow-md' : 'border-transparent shadow-sm hover:border-gray-200'}
                            `}
                        >
                            {selectedEmps.has(emp.id) && (
                                <div className="absolute top-0 right-0 p-1 bg-orange-500 text-white rounded-bl-xl">
                                    <CheckSquare className="w-4 h-4" />
                                </div>
                            )}
                            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                                <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="overflow-hidden">
                                <h4 className="font-semibold text-gray-800 truncate">{emp.name}</h4>
                                <p className="text-sm text-gray-500 truncate">{emp.department}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BulkAttendance;