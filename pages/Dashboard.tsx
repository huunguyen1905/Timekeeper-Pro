import React, { useState, useEffect } from 'react';
import { UserSession, AttendanceRecord, SystemSettings } from '../types';
import { api } from '../services/api';
import { Clock, Calendar, CheckCircle, XCircle, AlertCircle, Coffee, MapPin, LogOut, Settings as SettingsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  user: UserSession;
}

const Dashboard: React.FC<Props> = ({ user }) => {
  const [time, setTime] = useState(new Date());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    fetchData();
    return () => clearInterval(timer);
  }, [user.userId]);

  const fetchData = async () => {
    try {
        // Parallel fetch for speed
        const [allAtt, sysSettings] = await Promise.all([
            api.getAllAttendance(),
            api.getSettings()
        ]);

        setSettings(sysSettings);

        const today = new Date();
        const month = today.getMonth() + 1;
        const day = String(today.getDate()).padStart(2, '0');

        // Get today's record
        const userAtt = allAtt[user.userId];
        if (userAtt && userAtt[month] && userAtt[month][day]) {
            setTodayRecord(userAtt[month][day]);
        }

        // Calc simple stats for current month
        if (userAtt && userAtt[month]) {
            let p = 0, l = 0, a = 0;
            Object.values(userAtt[month]).forEach(rec => {
                if (rec.status === 'present' || rec.status === 'halfday') p++;
                if (rec.status === 'late') l++;
                if (rec.status === 'absent') a++;
            });
            setStats({ present: p, late: l, absent: a });
        }
    } catch (e) {
        console.error("Dashboard fetch error:", e);
    }
  };

  const getPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Trình duyệt không hỗ trợ định vị."));
        } else {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            });
        }
    });
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180; // φ, λ in radians
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  const handleAction = async (type: 'check-in' | 'check-out') => {
    setLoading(true);
    const toastId = toast.loading(`Đang ${type === 'check-in' ? 'Check-in' : 'Check-out'}...`);
    
    try {
        if (!settings) throw new Error("Chưa tải được cài đặt hệ thống. Vui lòng thử lại.");

        // 1. Get GPS
        const position = await getPosition();
        const { latitude, longitude } = position.coords;
        const deviceInfo = navigator.userAgent;

        // 2. Validate Distance (Geofencing)
        let distance = 0;
        if (settings.officeLat && settings.officeLng) {
            distance = calculateDistance(latitude, longitude, settings.officeLat, settings.officeLng);
            if (distance > settings.allowedRadius) {
                toast.error(`Bạn đang ở cách văn phòng ${Math.round(distance)}m (Cho phép: ${settings.allowedRadius}m). Vẫn ghi nhận nhưng sẽ bị đánh dấu!`, { duration: 5000 });
            }
        }

        const now = new Date();
        const month = now.getMonth() + 1;
        const day = String(now.getDate()).padStart(2, '0');
        const timestamp = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        let record: AttendanceRecord;

        if (type === 'check-in') {
             // Logic Check-in
             const [startH, startM] = settings.workStartTime.split(':').map(Number);
             const isLate = now.getHours() > startH || (now.getHours() === startH && now.getMinutes() > startM);
             
             record = {
                status: isLate ? 'late' : 'present',
                timestamp: timestamp,
                latitude: latitude,
                longitude: longitude,
                deviceInfo: deviceInfo,
                distance: Math.round(distance)
             };
        } else {
            // Logic Check-out
            const [endH, endM] = settings.workEndTime.split(':').map(Number);
            const isEarly = now.getHours() < endH || (now.getHours() === endH && now.getMinutes() < endM);

            if (!todayRecord) throw new Error("Không tìm thấy dữ liệu Check-in");

            record = {
                ...todayRecord,
                checkOutTime: timestamp,
                status: isEarly ? 'early_leave' : todayRecord.status
            };
        }

        await api.saveAttendance(user.userId, month, day, record);
        setTodayRecord(record);
        
        toast.dismiss(toastId);
        toast.success(`${type === 'check-in' ? 'Check-in' : 'Check-out'} thành công!`, { duration: 3000 });
        fetchData(); 
    } catch (e: any) {
        toast.dismiss(toastId);
        console.error("Action error:", e);
        
        // Xử lý message lỗi chi tiết hơn để tránh [object Object]
        let errorMsg = "Lỗi xử lý không xác định";
        if (typeof e === 'string') {
            errorMsg = e;
        } else if (e instanceof Error) {
            errorMsg = e.message;
        } else if (e && typeof e === 'object') {
            // Lấy message từ Supabase error object (message, details, hint)
            errorMsg = e.message || e.error_description || JSON.stringify(e);
        }

        // Kiểm tra các mã lỗi cụ thể
        if (errorMsg.includes('check_out_time') || errorMsg.includes('column') || e?.code === '42703' || e?.code === 'PGRST204') {
            toast.error("Lỗi Database: Thiếu cột dữ liệu (check_out_time, latitude...). Vui lòng chạy lệnh trong SQL_UPDATE.sql", { duration: 5000 });
        } else if (e?.code === 1) { 
            toast.error("Vui lòng BẬT GPS và cấp quyền truy cập vị trí để chấm công!");
        } else {
            toast.error(errorMsg);
        }
    } finally {
        setLoading(false);
    }
  };

  const greeting = () => {
      const h = time.getHours();
      if (h < 12) return 'Chào buổi sáng';
      if (h < 18) return 'Chào buổi chiều';
      return 'Chào buổi tối';
  };

  return (
    <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-2">{greeting()}, {user.name}!</h1>
                <p className="opacity-90">
                    {settings ? `Giờ làm việc: ${settings.workStartTime} - ${settings.workEndTime}` : 'Đang tải cấu hình...'}
                </p>
                
                <div className="mt-8 flex items-end gap-2">
                    <span className="text-6xl font-bold">{time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center gap-2 mt-2 opacity-90 text-sm">
                    <Calendar className="w-4 h-4" />
                    {time.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>
             {/* Background decoration */}
             <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
             <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400 opacity-20 rounded-full -ml-10 -mb-10 blur-xl"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Action Card */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center space-y-4 md:col-span-1">
                <div className="w-16 h-16 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                    <Clock className="w-8 h-8" />
                </div>
                <div className="w-full">
                    <h3 className="text-lg font-bold text-gray-800">Chấm công hôm nay</h3>
                    {todayRecord ? (
                        <div className="mt-3 flex flex-col gap-2 w-full">
                             {/* Check In Status */}
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                <span className="text-sm text-gray-500">Vào</span>
                                <div className="flex items-center gap-2">
                                     <span className="font-bold text-gray-800">{todayRecord.timestamp}</span>
                                     {todayRecord.status === 'late' && <span className="text-xs bg-orange-100 text-orange-600 px-1 rounded">Muộn</span>}
                                </div>
                            </div>

                            {/* Check Out Status or Button */}
                            {todayRecord.checkOutTime ? (
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
                                    <span className="text-sm text-gray-500">Ra</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-gray-800">{todayRecord.checkOutTime}</span>
                                        {todayRecord.status === 'early_leave' && <span className="text-xs bg-yellow-100 text-yellow-600 px-1 rounded">Sớm</span>}
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleAction('check-out')}
                                    disabled={loading}
                                    className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-2 mt-2"
                                >
                                    {loading ? 'Đang xử lý...' : (
                                        <>
                                            <LogOut className="w-5 h-5" /> CHECK OUT
                                        </>
                                    )}
                                </button>
                            )}
                            
                            {todayRecord.distance !== undefined && (
                                <p className={`text-xs mt-1 ${todayRecord.distance > (settings?.allowedRadius || 100) ? 'text-red-500' : 'text-green-600'}`}>
                                    <MapPin className="w-3 h-3 inline mr-1" />
                                    Cách văn phòng: {todayRecord.distance}m
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-500 mt-1 text-sm mb-4">Bạn chưa chấm công hôm nay</p>
                    )}
                </div>
                
                {!todayRecord && (
                    <button 
                        onClick={() => handleAction('check-in')}
                        disabled={loading}
                        className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-orange-200 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Đang định vị...' : (
                            <>
                                <MapPin className="w-5 h-5" /> CHECK IN (GPS)
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Stats Cards */}
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><CheckCircle className="w-5 h-5" /></div>
                    </div>
                    <p className="text-gray-500 text-sm">Ngày công tháng này</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.present}</p>
                </div>
                <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white rounded-lg text-orange-600 shadow-sm"><Clock className="w-5 h-5" /></div>
                    </div>
                    <p className="text-gray-500 text-sm">Số lần đi muộn</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.late}</p>
                </div>
                <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-white rounded-lg text-red-600 shadow-sm"><XCircle className="w-5 h-5" /></div>
                    </div>
                    <p className="text-gray-500 text-sm">Vắng mặt/Nghỉ</p>
                    <p className="text-3xl font-bold text-gray-800 mt-1">{stats.absent}</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Dashboard;