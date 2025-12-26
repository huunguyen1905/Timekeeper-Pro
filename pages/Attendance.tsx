import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { Employee, AttendanceRecord, UserSession, AttendanceStatus } from '../types';
import { STATUS_CONFIG } from '../constants';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface Props {
  user: UserSession;
}

const Attendance: React.FC<Props> = ({ user }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceRecord>>({});
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOvertime, setModalOvertime] = useState('');
  const [modalMultiplier, setModalMultiplier] = useState('1.5');

  // Load Employees
  useEffect(() => {
    const fetchData = async () => {
      const allEmps = await api.getEmployees();
      setEmployees(allEmps);

      if (user.role === 'User') {
        const me = allEmps.find(e => e.id === user.userId) || allEmps[0];
        if (me) setSelectedEmployeeId(me.id);
      } else if (allEmps.length > 0) {
        setSelectedEmployeeId(allEmps[0].id);
      }
    };
    fetchData();
  }, [user]);

  // Load Attendance & Realtime Subscription
  useEffect(() => {
    if (selectedEmployeeId) {
      loadAttendance();

      // REAL-TIME: Lắng nghe thay đổi từ Supabase
      const subscription = supabase
        .channel('attendance_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
          // Khi có bất kỳ thay đổi nào (Insert/Update/Delete) ở bảng attendance, load lại dữ liệu
          loadAttendance();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedEmployeeId, currentDate]);

  const loadAttendance = async () => {
    // Lưu ý: Trong app thực tế nên filter theo tháng/năm ở phía API để nhẹ hơn
    // Ở đây dùng getAllAttendance theo cấu trúc hiện tại
    const allAtt = await api.getAllAttendance();
    const month = currentDate.getMonth() + 1;
    const empAtt = allAtt[selectedEmployeeId];
    setAttendanceData(empAtt && empAtt[month] ? empAtt[month] : {});
  };

  const selectedEmployee = employees.find(e => e.id === selectedEmployeeId);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
  const startingEmptyCells = (firstDayOfMonth + 6) % 7; // Adjust so Monday is 0

  const handleDateClick = (day: number) => {
    if (user.role === 'User') return; // Read only for users
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(date);
    
    // Reset modal fields
    const dayStr = String(day).padStart(2, '0');
    const record = attendanceData[dayStr];
    
    if (record?.overtimeHours) {
        setModalOvertime(String(record.overtimeHours));
        setModalMultiplier(String(record.overtimeMultiplier || 1.5));
    } else {
        setModalOvertime('');
        // Logic thông minh: Nếu là Chủ Nhật (day 0), mặc định hệ số 2.0, ngược lại 1.5
        const isWeekend = date.getDay() === 0;
        setModalMultiplier(isWeekend ? '2.0' : '1.5');
    }
    
    setIsModalOpen(true);
  };

  const handleStatusSelect = async (status: AttendanceStatus | 'clear') => {
    if (!selectedDate || !selectedEmployeeId) return;
    
    const month = selectedDate.getMonth() + 1;
    const dayStr = String(selectedDate.getDate()).padStart(2, '0');
    const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    let record: AttendanceRecord | null = null;

    if (status !== 'clear') {
        record = {
            status,
            timestamp,
        };
        const ot = parseFloat(modalOvertime);
        if (ot > 0) {
            record.overtimeHours = ot;
            record.overtimeMultiplier = parseFloat(modalMultiplier);
        }
    }

    try {
        // Optimistic update có thể thêm ở đây nếu muốn UI cập nhật ngay lập tức trước khi server trả về
        await api.saveAttendance(selectedEmployeeId, month, dayStr, record);
        // Không cần gọi loadAttendance() ở đây vì Realtime subscription sẽ tự gọi
        setIsModalOpen(false);
        toast.success(status === 'clear' ? 'Đã xóa chấm công' : 'Đã chấm công thành công');
    } catch (e) {
        toast.error("Lỗi khi chấm công");
    }
  };

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  // Stats calculation
  let present = 0, overtimeTotal = 0;
  Object.values(attendanceData).forEach((rec: AttendanceRecord) => {
    if (rec.status === 'present') present++;
    if (rec.status === 'halfday') present += 0.5;
    if (rec.status === 'late') present += 1;
    // Tính tổng giờ công quy đổi (Giờ thực * Hệ số)
    if (rec.overtimeHours) overtimeTotal += (rec.overtimeHours * (rec.overtimeMultiplier || 1));
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar / Controls */}
        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="flex items-center justify-between mb-4 bg-gray-50 p-2 rounded-xl">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-lg transition shadow-sm"><ChevronLeft className="w-5 h-5" /></button>
              <span className="font-semibold text-lg">{currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-lg transition shadow-sm"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <select 
              className="w-full p-3 border rounded-xl bg-white focus:ring-2 focus:ring-orange-500 outline-none"
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={user.role === 'User'}
            >
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
              ))}
            </select>

            {selectedEmployee && (
              <div className="mt-6 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-400 to-red-500 p-1">
                    <img 
                        src={selectedEmployee.avatar || `https://ui-avatars.com/api/?name=${selectedEmployee.name}`} 
                        alt="avatar" 
                        className="w-full h-full rounded-full object-cover bg-white"
                    />
                </div>
                <h3 className="mt-3 font-bold text-lg text-gray-800">{selectedEmployee.name}</h3>
                <p className="text-gray-500 text-sm">{selectedEmployee.department}</p>
                
                <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-green-50 p-3 rounded-xl">
                        <p className="text-gray-500 mb-1">Ngày công</p>
                        <p className="font-bold text-green-600 text-lg">{present}</p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-xl">
                        <p className="text-gray-500 mb-1">Tăng ca (Quy đổi)</p>
                        <p className="font-bold text-orange-600 text-lg">{overtimeTotal}h</p>
                    </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-3">
            <h4 className="font-semibold text-gray-700 mb-2">Chú thích</h4>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div key={key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                        <config.icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <span className="text-sm text-gray-600">{config.label}</span>
                </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border p-6">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-semibold text-gray-400 uppercase tracking-wider">
            <div>T2</div><div>T3</div><div>T4</div><div>T5</div><div>T6</div><div>T7</div><div className="text-red-400">CN</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: startingEmptyCells }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayStr = String(day).padStart(2, '0');
              const record = attendanceData[dayStr];
              const isWeekend = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() === 0; // Sunday
              
              const config = record ? STATUS_CONFIG[record.status] : null;

              return (
                <div 
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`
                    aspect-square rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all hover:scale-105 hover:shadow-md
                    ${config ? `${config.bgColor} border-transparent` : 'bg-gray-50 border-transparent hover:border-orange-200'}
                    ${!config && isWeekend ? 'bg-gray-100 text-gray-400' : ''}
                  `}
                >
                  <span className={`text-sm font-bold ${config ? 'text-gray-800' : 'text-gray-500'}`}>{day}</span>
                  {config && (
                    <>
                        <config.icon className={`w-6 h-6 mt-1 ${config.color}`} />
                        {record.overtimeHours && record.overtimeHours > 0 && (
                            <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white px-1 rounded-full font-bold">
                                +{record.overtimeHours}
                            </span>
                        )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Chấm công ${selectedDate?.toLocaleDateString('vi-VN')}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
            <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">Trạng thái</label>
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <button
                            key={key}
                            onClick={() => handleStatusSelect(key as AttendanceStatus)}
                            className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:border-orange-500 bg-white`}
                        >
                            <div className={`p-2 rounded-full ${config.bgColor}`}>
                                <config.icon className={`w-4 h-4 ${config.color}`} />
                            </div>
                            <span className="font-medium text-gray-700">{config.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="pt-4 border-t space-y-4">
                <div className="flex items-center gap-2 text-orange-600 font-medium">
                    <Clock className="w-5 h-5" />
                    <span>Tăng ca (Tùy chọn)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Số giờ</label>
                        <input 
                            type="number" 
                            value={modalOvertime}
                            onChange={(e) => setModalOvertime(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                            placeholder="0"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Hệ số lương</label>
                        <select 
                            value={modalMultiplier}
                            onChange={(e) => setModalMultiplier(e.target.value)}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="1.5">x1.5 (Ngày thường)</option>
                            <option value="2.0">x2.0 (Cuối tuần)</option>
                            <option value="3.0">x3.0 (Lễ tết)</option>
                        </select>
                    </div>
                </div>
            </div>

            <button 
                onClick={() => handleStatusSelect('clear')}
                className="w-full py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-medium transition-colors"
            >
                Xóa chấm công ngày này
            </button>
        </div>
      </Modal>
    </div>
  );
};

export default Attendance;