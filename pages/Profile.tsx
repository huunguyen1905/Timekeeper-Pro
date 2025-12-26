import React, { useState } from 'react';
import { UserSession } from '../types';
import { api } from '../services/api';
import { User, Lock, Save } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
    user: UserSession;
}

const Profile: React.FC<Props> = ({ user }) => {
    const [passwords, setPasswords] = useState({
        new: '',
        confirm: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!passwords.new || passwords.new.length < 3) {
            toast.error("Mật khẩu phải từ 3 ký tự trở lên");
            return;
        }
        if (passwords.new !== passwords.confirm) {
            toast.error("Mật khẩu nhập lại không khớp");
            return;
        }

        setLoading(true);
        try {
            await api.changePassword(user.userId, passwords.new);
            toast.success("Đổi mật khẩu thành công!");
            setPasswords({ new: '', confirm: '' });
        } catch (e) {
            toast.error("Lỗi khi đổi mật khẩu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <User className="w-6 h-6 text-orange-600" /> Thông tin cá nhân
            </h2>

            <div className="bg-white p-8 rounded-2xl shadow-sm border text-center">
                <div className="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mb-4 text-3xl font-bold">
                    {user.name.charAt(0)}
                </div>
                <h3 className="text-xl font-bold text-gray-800">{user.name}</h3>
                <p className="text-gray-500">@{user.username} • {user.role}</p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border">
                <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-500" /> Đổi mật khẩu
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Mật khẩu mới</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border rounded-xl"
                            value={passwords.new}
                            onChange={e => setPasswords({...passwords, new: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Nhập lại mật khẩu mới</label>
                        <input 
                            type="password" 
                            className="w-full p-3 border rounded-xl"
                            value={passwords.confirm}
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})}
                        />
                    </div>

                    <button 
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold shadow-lg hover:bg-gray-900 transition mt-4"
                    >
                        {loading ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;