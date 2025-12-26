import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Employee } from '../types';
import { Plus, Edit2, Trash2, Search, User } from 'lucide-react';
import Modal from '../components/Modal';
import { ROLES } from '../constants';
import toast from 'react-hot-toast';

const Employees: React.FC = () => {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filter, setFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<Employee>>({});

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        const data = await api.getEmployees();
        setEmployees(data);
    };

    const handleOpenModal = (emp?: Employee) => {
        if (emp) {
            setEditingEmp(emp);
            setFormData({...emp});
        } else {
            setEditingEmp(null);
            setFormData({
                role: 'User',
                department: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.code || !formData.department) {
            toast.error("Vui lòng điền các trường bắt buộc");
            return;
        }

        const empToSave: Employee = {
            id: editingEmp ? editingEmp.id : `ID${Math.floor(Math.random() * 10000)}`,
            code: formData.code!,
            name: formData.name!,
            department: formData.department!,
            role: formData.role as any || 'User',
            username: formData.username,
            password: formData.password,
            avatar: formData.avatar
        };

        try {
            await api.saveEmployee(empToSave);
            toast.success(editingEmp ? 'Cập nhật thành công' : 'Thêm mới thành công');
            setIsModalOpen(false);
            loadEmployees();
        } catch (e) {
            toast.error('Có lỗi xảy ra khi lưu');
        }
    };

    const handleDelete = async (id: string) => {
        if(window.confirm("Bạn có chắc muốn xóa nhân viên này?")) {
            try {
                await api.deleteEmployee(id);
                toast.success("Đã xóa nhân viên");
                loadEmployees();
            } catch (e) {
                toast.error('Có lỗi xảy ra khi xóa');
            }
        }
    };

    const filtered = employees.filter(e => 
        e.name.toLowerCase().includes(filter.toLowerCase()) || 
        e.code.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm nhân viên..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition shadow-lg shadow-orange-200"
                >
                    <Plus className="w-5 h-5" /> Thêm mới
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
                        <tr>
                            <th className="p-4">Nhân viên</th>
                            <th className="p-4">Mã NV</th>
                            <th className="p-4">Phòng ban</th>
                            <th className="p-4">Quyền</th>
                            <th className="p-4 text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(emp => (
                            <tr key={emp.id} className="hover:bg-orange-50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                             <img src={emp.avatar || `https://ui-avatars.com/api/?name=${emp.name}`} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.username}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600 font-medium">{emp.code}</td>
                                <td className="p-4">
                                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-medium">
                                        {emp.department}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${emp.role === 'Admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {emp.role}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(emp)} className="p-2 bg-white border rounded-lg hover:text-orange-600 hover:border-orange-600"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDelete(emp.id)} className="p-2 bg-white border rounded-lg hover:text-red-600 hover:border-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEmp ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
                footer={
                    <>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Hủy</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Lưu</button>
                    </>
                }
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã NV <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.code || ''}
                            onChange={e => setFormData({...formData, code: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phòng ban <span className="text-red-500">*</span></label>
                        <input 
                            type="text"
                            placeholder="Nhập tên phòng ban"
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.department || ''}
                            onChange={e => setFormData({...formData, department: e.target.value})}
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quyền</label>
                        <select 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.role}
                            onChange={e => setFormData({...formData, role: e.target.value as any})}
                        >
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2 pt-4 border-t mt-2">
                        <h4 className="text-sm font-semibold text-gray-500 mb-3">Thông tin đăng nhập</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={formData.username || ''}
                                    onChange={e => setFormData({...formData, username: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input 
                                    type="password" 
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    value={formData.password || ''}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    placeholder={editingEmp ? "(Không đổi)" : ""}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="col-span-2">
                         <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                         <input 
                            type="text" 
                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                            value={formData.avatar || ''}
                            onChange={e => setFormData({...formData, avatar: e.target.value})}
                            placeholder="https://..."
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Employees;