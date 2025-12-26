import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { UserSession, Request, RequestType } from '../types';
import { Plus, Check, X, Clock, Calendar, FileText, Filter } from 'lucide-react';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';

interface Props {
  user: UserSession;
}

const Requests: React.FC<Props> = ({ user }) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
      type: 'leave' as RequestType,
      start_date: '',
      end_date: '',
      reason: ''
  });

  useEffect(() => {
    loadRequests();
    
    const subscription = supabase
        .channel('requests_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, () => {
            loadRequests();
        })
        .subscribe();
    return () => { supabase.removeChannel(subscription); }
  }, []);

  const loadRequests = async () => {
      const data = await api.getRequests();
      setRequests(data);
  };

  const handleCreate = async () => {
      if (!formData.start_date || !formData.end_date || !formData.reason) {
          toast.error("Vui lòng điền đầy đủ thông tin");
          return;
      }

      try {
          await api.createRequest({
              employee_id: user.userId,
              type: formData.type,
              start_date: formData.start_date,
              end_date: formData.end_date,
              reason: formData.reason
          });
          toast.success("Gửi yêu cầu thành công");
          setIsModalOpen(false);
          setFormData({ type: 'leave', start_date: '', end_date: '', reason: '' });
      } catch (e) {
          toast.error("Lỗi khi gửi yêu cầu");
      }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
      try {
          await api.updateRequestStatus(id, status);
          toast.success(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} yêu cầu`);
      } catch (e) {
          toast.error("Lỗi cập nhật trạng thái");
      }
  };

  const filteredRequests = requests.filter(r => {
      if (user.role === 'User' && r.employee_id !== user.userId) return false;
      if (filter === 'pending') return r.status === 'pending';
      return true;
  });

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-orange-500" /> 
                Quản lý Yêu cầu
            </h2>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 shadow-lg shadow-orange-200"
            >
                <Plus className="w-5 h-5" /> Tạo yêu cầu
            </button>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => setFilter('all')} 
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'all' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 border'}`}
            >
                Tất cả
            </button>
            <button 
                onClick={() => setFilter('pending')} 
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${filter === 'pending' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border'}`}
            >
                Chờ duyệt
            </button>
        </div>

        <div className="grid gap-4">
            {filteredRequests.length === 0 && (
                <div className="text-center py-12 text-gray-400">Chưa có yêu cầu nào.</div>
            )}
            {filteredRequests.map(req => (
                <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <div className={`p-3 rounded-full flex-shrink-0 ${req.type === 'leave' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                        {req.type === 'leave' ? <Calendar className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-800">{req.employee_name || 'Nhân viên'}</span>
                            <span className="text-gray-400 text-xs">• {new Date(req.created_at!).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <p className="text-sm text-gray-600">
                            <span className="font-semibold">{req.type === 'leave' ? 'Xin nghỉ phép' : 'Đăng ký tăng ca'}</span>: 
                            {req.start_date === req.end_date 
                                ? ` Ngày ${new Date(req.start_date).toLocaleDateString('vi-VN')}`
                                : ` Từ ${new Date(req.start_date).toLocaleDateString('vi-VN')} đến ${new Date(req.end_date).toLocaleDateString('vi-VN')}`
                            }
                        </p>
                        <p className="text-sm text-gray-500 mt-1 italic">"{req.reason}"</p>
                    </div>

                    <div className="flex items-center gap-3">
                        {req.status === 'pending' ? (
                            <>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wide">Chờ duyệt</span>
                                {user.role === 'Admin' && (
                                    <div className="flex gap-2 ml-2">
                                        <button onClick={() => handleApprove(req.id, 'approved')} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200"><Check className="w-4 h-4" /></button>
                                        <button onClick={() => handleApprove(req.id, 'rejected')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><X className="w-4 h-4" /></button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                                req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                                {req.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>

        <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Tạo yêu cầu mới"
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Loại yêu cầu</label>
                    <select 
                        className="w-full p-2 border rounded-lg bg-white"
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as RequestType})}
                    >
                        <option value="leave">Xin nghỉ phép</option>
                        <option value="overtime">Đăng ký tăng ca</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border rounded-lg"
                            value={formData.start_date}
                            onChange={e => setFormData({...formData, start_date: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border rounded-lg"
                            value={formData.end_date}
                            onChange={e => setFormData({...formData, end_date: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lý do</label>
                    <textarea 
                        className="w-full p-2 border rounded-lg h-24 resize-none"
                        placeholder="Nhập lý do nghỉ/tăng ca..."
                        value={formData.reason}
                        onChange={e => setFormData({...formData, reason: e.target.value})}
                    ></textarea>
                </div>
                <button 
                    onClick={handleCreate}
                    className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition"
                >
                    Gửi yêu cầu
                </button>
            </div>
        </Modal>
    </div>
  );
};

export default Requests;