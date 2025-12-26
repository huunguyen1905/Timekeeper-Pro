import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSettings, UserSession } from '../types';
import { Save, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    user: UserSession;
}

const Settings: React.FC<Props> = ({ user }) => {
    const [settings, setSettings] = useState<SystemSettings>({
        workStartTime: '08:00',
        workEndTime: '17:30',
        officeLat: 0,
        officeLng: 0,
        allowedRadius: 100
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const data = await api.getSettings();
        setSettings(data);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.saveSettings(settings);
            toast.success("Đã lưu cài đặt hệ thống");
        } catch (e) {
            toast.error("Lỗi khi lưu cài đặt");
        } finally {
            setLoading(false);
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Trình duyệt không hỗ trợ GPS");
            return;
        }
        navigator.geolocation.getCurrentPosition((pos) => {
            setSettings({
                ...settings,
                officeLat: pos.coords.latitude,
                officeLng: pos.coords.longitude
            });
            toast.success("Đã lấy tọa độ hiện tại làm văn phòng");
        }, () => {
            toast.error("Không lấy được vị trí");
        });
    };

    if (user.role !== 'Admin') {
        return <div className="text-center py-10">Bạn không có quyền truy cập trang này.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <SettingsIcon className="w-6 h-6 text-orange-600" /> Cài đặt hệ thống
            </h2>

            <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-6">
                <div>
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-500" /> Thời gian làm việc
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Giờ bắt đầu (Sáng)</label>
                            <input 
                                type="time" 
                                className="w-full p-3 border rounded-xl"
                                value={settings.workStartTime}
                                onChange={e => setSettings({...settings, workStartTime: e.target.value})}
                            />
                            <p className="text-xs text-gray-400 mt-1">Check-in sau giờ này sẽ tính là đi muộn</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Giờ kết thúc (Chiều)</label>
                            <input 
                                type="time" 
                                className="w-full p-3 border rounded-xl"
                                value={settings.workEndTime}
                                onChange={e => setSettings({...settings, workEndTime: e.target.value})}
                            />
                            <p className="text-xs text-gray-400 mt-1">Check-out trước giờ này tính là về sớm</p>
                        </div>
                    </div>
                </div>

                <div className="border-t pt-6">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" /> Vị trí văn phòng
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Vĩ độ (Latitude)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border rounded-xl bg-gray-50"
                                value={settings.officeLat}
                                onChange={e => setSettings({...settings, officeLat: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Kinh độ (Longitude)</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border rounded-xl bg-gray-50"
                                value={settings.officeLng}
                                onChange={e => setSettings({...settings, officeLng: parseFloat(e.target.value)})}
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleGetCurrentLocation}
                        className="text-sm text-orange-600 font-medium hover:underline mb-4 block"
                    >
                        📍 Lấy vị trí hiện tại của tôi làm Văn phòng
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Bán kính cho phép chấm công (mét)</label>
                        <input 
                            type="number" 
                            className="w-full p-3 border rounded-xl"
                            value={settings.allowedRadius}
                            onChange={e => setSettings({...settings, allowedRadius: parseFloat(e.target.value)})}
                        />
                        <p className="text-xs text-gray-400 mt-1">Nếu nhân viên check-in xa hơn khoảng này sẽ bị cảnh báo.</p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg hover:bg-orange-700 transition flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" /> {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
                </button>
            </div>
        </div>
    );
};

// Icon component import helper
function SettingsIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

export default Settings;