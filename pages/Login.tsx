import React, { useState } from 'react';
import { api } from '../services/api';
import { UserSession } from '../types';
import { Lock, User, Database } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onLogin: (session: UserSession) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await api.login(username, password);

      if (user) {
        const session: UserSession = {
          userId: user.id,
          username: user.username || '',
          name: user.name,
          role: user.role
        };
        toast.success(`Xin chào, ${user.name}!`);
        onLogin(session);
      } else {
        toast.error('Sai tên đăng nhập hoặc mật khẩu');
      }
    } catch (error: any) {
      if (error.message && (error.message.includes('API Key') || error.code === '401' || error.message.includes('FetchError'))) {
          toast.error('Kết nối thất bại. Vui lòng kiểm tra lại API Key và URL Supabase.');
      } else {
          toast.error('Lỗi hệ thống. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitData = async () => {
    setIsInitializing(true);
    try {
        const seeded = await api.initializeData();
        if (seeded) {
            toast.success("Đã khởi tạo dữ liệu mẫu thành công! Bạn có thể đăng nhập bằng: admin / 123");
        } else {
            toast.success("Dữ liệu đã tồn tại, không cần khởi tạo lại.");
        }
    } catch (error: any) {
        console.error(error);
        if (error.code === '42501') {
            toast.error("Lỗi quyền truy cập (RLS). Vui lòng tắt RLS trong Supabase hoặc chạy lệnh SQL.");
        } else {
            toast.error("Không thể khởi tạo dữ liệu. Vui lòng kiểm tra kết nối.");
        }
    } finally {
        setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-inner">
            TK
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Timekeeper Pro</h1>
          <p className="text-gray-500 mt-2">Đăng nhập hệ thống chấm công</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors"
                placeholder="Nhập username (vd: admin)"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-600 ml-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-orange-500 focus:ring-0 outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100">
            <button
                type="button"
                onClick={handleInitData}
                disabled={isInitializing}
                className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition-colors py-2 rounded-lg hover:bg-orange-50"
            >
                <Database className="w-4 h-4" />
                {isInitializing ? "Đang khởi tạo..." : "Khởi tạo dữ liệu mẫu (Dành cho lần đầu)"}
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">
                Nếu bấm nút trên bị lỗi, vui lòng chạy lệnh SQL hoặc tắt RLS trong Supabase.
            </p>
        </div>
      </div>
    </div>
  );
};

export default Login;