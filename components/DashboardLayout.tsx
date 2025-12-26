import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { UserSession } from '../types';
import { 
  Menu, X, CalendarCheck, Users, Calendar, 
  BarChart2, List, LogOut, Clock, User, Home, FileText, Settings
} from 'lucide-react';

interface Props {
  user: UserSession;
  onLogout: () => void;
}

const DashboardLayout: React.FC<Props> = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', label: 'Tổng quan', icon: Home, role: 'All' },
    { to: '/attendance', label: 'Bảng công', icon: CalendarCheck, role: 'All' },
    { to: '/requests', label: 'Yêu cầu', icon: FileText, role: 'All' },
    { to: '/bulk', label: 'Chấm hàng loạt', icon: Users, role: 'All' },
    { to: '/timeline', label: 'Timeline', icon: Calendar, role: 'All' },
    { to: '/statistics', label: 'Thống kê', icon: BarChart2, role: 'All' },
    { to: '/employees', label: 'Nhân sự', icon: List, role: 'Admin' },
    { to: '/settings', label: 'Cài đặt hệ thống', icon: Settings, role: 'Admin' }, // NEW
  ];

  const currentDate = new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-2 text-orange-600 font-bold text-xl">
              <Clock className="w-8 h-8" />
              <span>Timekeeper</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
            {navItems.filter(item => item.role === 'All' || item.role === user.role).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                  ${isActive 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-400 text-white shadow-md shadow-orange-200' 
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'}
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t bg-gray-50">
            <NavLink to="/profile" onClick={() => setSidebarOpen(false)}>
                <div className="flex items-center gap-3 mb-4 px-2 hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <User className="w-6 h-6" />
                </div>
                <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.role}</p>
                </div>
                </div>
            </NavLink>
            <button 
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800 capitalize">
               {navItems.find(i => i.to === location.pathname)?.label || (location.pathname.includes('profile') ? 'Hồ sơ cá nhân' : 'Dashboard')}
            </h1>
          </div>
          
          <div className="hidden sm:flex items-center gap-4 text-sm font-medium text-gray-500">
             <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                <span>Online</span>
             </div>
             <span>{currentDate}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;