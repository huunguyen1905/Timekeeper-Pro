import { Employee, EmployeeAttendance, AttendanceRecord, Request, RequestStatus, SystemSettings, Shift, EmployeeSchedule } from '../types';
import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';
import { INITIAL_EMPLOYEES } from './mockData';

export const api = {
  // --- Auth & Nhân viên ---

  login: async (username: string, password: string): Promise<Employee | null> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;
      return data as Employee;
    } catch (error: any) {
      console.error('Chi tiết lỗi đăng nhập:', error.message || JSON.stringify(error));
      throw error;
    }
  },

  changePassword: async (userId: string, newPassword: string): Promise<void> => {
      try {
          const { error } = await supabase.from('employees').update({ password: newPassword }).eq('id', userId);
          if (error) throw error;
      } catch (error: any) {
          console.error("Lỗi đổi mật khẩu:", error.message || JSON.stringify(error));
          throw error;
      }
  },

  initializeData: async (): Promise<boolean> => {
    try {
        const { count, error: countError } = await supabase
            .from('employees')
            .select('*', { count: 'exact', head: true });
        
        if (countError) throw countError;
        
        if (count === 0) {
            const { error } = await supabase
                .from('employees')
                .insert(INITIAL_EMPLOYEES.map(e => ({
                    id: e.id,
                    code: e.code,
                    name: e.name,
                    department: e.department,
                    role: e.role,
                    username: e.username,
                    password: e.password,
                    avatar: e.avatar
                })));
            
            if (error) throw error;
            return true;
        }
        return false;
    } catch (error: any) {
        console.error("Lỗi khởi tạo dữ liệu:", error.message || JSON.stringify(error));
        throw error;
    }
  },

  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []) as Employee[];
    } catch (error: any) {
      console.error('Lỗi tải nhân viên:', error.message || JSON.stringify(error));
      return [];
    }
  },

  saveEmployee: async (employee: Employee): Promise<Employee> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .upsert({
          id: employee.id,
          code: employee.code,
          name: employee.name,
          department: employee.department,
          role: employee.role,
          username: employee.username,
          password: employee.password,
          avatar: employee.avatar
        })
        .select()
        .single();

      if (error) throw error;
      return data as Employee;
    } catch (error: any) {
      console.error('Lỗi lưu nhân viên:', error.message || JSON.stringify(error));
      throw error;
    }
  },

  deleteEmployee: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('employees').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error('Lỗi xóa nhân viên:', error.message || JSON.stringify(error));
      throw error;
    }
  },

  // --- Settings (Mới) ---
  getSettings: async (): Promise<SystemSettings> => {
      try {
          const { data, error } = await supabase.from('system_settings').select('*');
          // Nếu bảng chưa tồn tại hoặc lỗi, trả về default
          if (error) {
              console.warn("Lỗi tải settings (có thể do chưa tạo bảng):", error.message);
              return { workStartTime: '08:00', workEndTime: '17:30', officeLat: 0, officeLng: 0, allowedRadius: 100 };
          }
          
          const settings: any = {};
          data?.forEach((row: any) => {
              settings[row.key] = row.value;
          });

          return {
              workStartTime: settings.work_start_time || '08:00',
              workEndTime: settings.work_end_time || '17:30',
              officeLat: parseFloat(settings.office_lat || '0'),
              officeLng: parseFloat(settings.office_lng || '0'),
              allowedRadius: parseFloat(settings.allowed_radius || '100'),
          };
      } catch (e) {
          return { workStartTime: '08:00', workEndTime: '17:30', officeLat: 0, officeLng: 0, allowedRadius: 100 };
      }
  },

  saveSettings: async (settings: SystemSettings): Promise<void> => {
      try {
          const updates = [
              { key: 'work_start_time', value: settings.workStartTime || '08:00' },
              { key: 'work_end_time', value: settings.workEndTime || '17:30' },
              { key: 'office_lat', value: String(settings.officeLat ?? 0) },
              { key: 'office_lng', value: String(settings.officeLng ?? 0) },
              { key: 'allowed_radius', value: String(settings.allowedRadius ?? 100) },
          ];
          const { error } = await supabase.from('system_settings').upsert(updates);
          if (error) throw error;
      } catch (error: any) {
          console.error("Lỗi lưu cài đặt:", error.message || JSON.stringify(error));
          throw error;
      }
  },

  // --- Chấm công (Attendance) ---

  getAllAttendance: async (): Promise<Record<string, EmployeeAttendance>> => {
    try {
      const { data, error } = await supabase.from('attendance').select('*');
      if (error) throw error;

      const result: Record<string, EmployeeAttendance> = {};
      if (data) {
        data.forEach((row: any) => {
          const empId = row.employee_id;
          const month = row.month;
          const day = row.day;

          if (!result[empId]) result[empId] = {};
          if (!result[empId][month]) result[empId][month] = {};

          result[empId][month][day] = {
            status: row.status,
            timestamp: row.timestamp,
            checkOutTime: row.check_out_time,
            overtimeHours: row.overtime_hours,
            overtimeMultiplier: row.overtime_multiplier,
            latitude: row.latitude,
            longitude: row.longitude,
            deviceInfo: row.device_info,
            distance: row.distance
          };
        });
      }
      return result;
    } catch (error: any) {
      console.error('Lỗi tải dữ liệu chấm công:', error.message || JSON.stringify(error));
      return {};
    }
  },

  saveAttendance: async (employeeId: string, month: number, day: string, record: AttendanceRecord | null): Promise<void> => {
    try {
      if (record === null) {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .match({ employee_id: employeeId, month, day });
        if (error) throw error;
      } else {
        // Chuẩn bị payload
        const payload: any = {
            employee_id: employeeId,
            month: month,
            day: day,
            status: record.status,
            timestamp: record.timestamp,
        };
        
        // Optional fields
        if (record.checkOutTime !== undefined) payload.check_out_time = record.checkOutTime;
        if (record.overtimeHours !== undefined) payload.overtime_hours = record.overtimeHours;
        if (record.overtimeMultiplier !== undefined) payload.overtime_multiplier = record.overtimeMultiplier;
        if (record.latitude !== undefined) payload.latitude = record.latitude;
        if (record.longitude !== undefined) payload.longitude = record.longitude;
        if (record.deviceInfo !== undefined) payload.device_info = record.deviceInfo;
        if (record.distance !== undefined) payload.distance = record.distance;

        const { error } = await supabase
          .from('attendance')
          .upsert(payload, { onConflict: 'employee_id, month, day' });
        
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Lỗi lưu chấm công (API):', error.message || JSON.stringify(error));
      throw error;
    }
  },

  saveBulkAttendance: async (employeeIds: string[], dates: Date[], record: AttendanceRecord): Promise<void> => {
    try {
      const rowsToInsert: any[] = [];
      employeeIds.forEach(empId => {
        dates.forEach(date => {
          const month = date.getMonth() + 1;
          const day = String(date.getDate()).padStart(2, '0');
          rowsToInsert.push({
            employee_id: empId,
            month: month,
            day: day,
            status: record.status,
            timestamp: record.timestamp,
            overtime_hours: record.overtimeHours || 0,
            overtime_multiplier: record.overtimeMultiplier || 1.5
          });
        });
      });

      if (rowsToInsert.length > 0) {
        const { error } = await supabase
          .from('attendance')
          .upsert(rowsToInsert, { onConflict: 'employee_id, month, day' });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Lỗi chấm công hàng loạt:', error.message || JSON.stringify(error));
      throw error;
    }
  },

  // --- Requests ---

  getRequests: async (): Promise<Request[]> => {
    try {
        const { data, error } = await supabase
            .from('requests')
            .select(`
                *,
                employees (name, avatar)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((r: any) => ({
            ...r,
            employee_name: r.employees?.name,
            avatar: r.employees?.avatar
        }));
    } catch (error: any) {
        console.error('Lỗi lấy requests:', error.message || JSON.stringify(error));
        return [];
    }
  },

  createRequest: async (req: Omit<Request, 'id' | 'status' | 'created_at' | 'employee_name' | 'avatar'>): Promise<void> => {
      try {
          const { error } = await supabase.from('requests').insert({
              employee_id: req.employee_id,
              type: req.type,
              start_date: req.start_date,
              end_date: req.end_date,
              reason: req.reason,
              status: 'pending'
          });
          if (error) throw error;
      } catch (error: any) {
          console.error("Lỗi tạo request", error.message || JSON.stringify(error));
          throw error;
      }
  },

  updateRequestStatus: async (id: number, status: RequestStatus): Promise<void> => {
      try {
          // CHỈ CẬP NHẬT TRẠNG THÁI.
          // Việc cập nhật bảng Attendance đã được chuyển giao cho Database Trigger (SQL) xử lý.
          // Xem file: SUPABASE_TRIGGERS.sql
          const { error } = await supabase.from('requests').update({ status }).eq('id', id);
          if (error) throw error;
      } catch (error: any) {
           console.error("Lỗi cập nhật request", error.message || JSON.stringify(error));
           throw error;
      }
  },

  // --- Hotel Shifts (Mới) ---
  getShifts: async (): Promise<Shift[]> => {
    try {
      const { data, error } = await supabase.from('shifts').select('*').order('start_time');
      if (error) throw error;
      return data || [];
    } catch (e: any) {
      console.warn("Chưa có bảng shifts:", e.message);
      return [
        { id: 1, name: 'Ca Sáng (A)', start_time: '06:00', end_time: '14:00', color: '#10b981' },
        { id: 2, name: 'Ca Chiều (B)', start_time: '14:00', end_time: '22:00', color: '#f59e0b' },
        { id: 3, name: 'Ca Đêm (C)', start_time: '22:00', end_time: '06:00', color: '#6366f1' },
        { id: 4, name: 'Hành chính', start_time: '08:00', end_time: '17:00', color: '#6b7280' },
      ];
    }
  },

  getSchedules: async (month: number, year: number): Promise<EmployeeSchedule[]> => {
    try {
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month).padStart(2, '0')}-31`;
      
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*, shifts(*)')
        .gte('date', startStr)
        .lte('date', endStr);
        
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        shift: d.shifts
      })) || [];
    } catch (e) {
      return [];
    }
  },

  assignShift: async (employeeId: string, date: string, shiftId: number | null): Promise<void> => {
    try {
      if (shiftId === null) {
        await supabase.from('employee_schedules').delete().match({ employee_id: employeeId, date });
      } else {
        await supabase.from('employee_schedules').upsert(
            { employee_id: employeeId, date, shift_id: shiftId },
            { onConflict: 'employee_id, date' }
        );
      }
    } catch (e: any) {
      console.error("Lỗi phân ca:", e.message);
      throw e;
    }
  }
};