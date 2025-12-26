export type Role = 'Admin' | 'User';

export interface Employee {
  id: string;
  code: string;
  name: string;
  department: string;
  username?: string;
  password?: string;
  role: Role;
  avatar?: string;
}

export interface AttendanceRecord {
  status: AttendanceStatus;
  timestamp: string; // Giờ Check-in
  checkOutTime?: string; // Giờ Check-out (Mới)
  overtimeHours?: number;
  overtimeMultiplier?: number;
  // Anti-fraud fields
  latitude?: number;
  longitude?: number;
  deviceInfo?: string;
  distance?: number; // Khoảng cách tới văn phòng
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'halfday' | 'early_leave';

export interface EmployeeAttendance {
  [month: number]: {
    [day: string]: AttendanceRecord;
  };
}

export interface UserSession {
  userId: string;
  username: string;
  name: string;
  role: Role;
}

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: any;
  shortLabel: string;
}

export interface SystemSettings {
  workStartTime: string;
  workEndTime: string;
  officeLat: number;
  officeLng: number;
  allowedRadius: number;
}

// --- Mới: Kiểu dữ liệu cho Request ---
export type RequestType = 'leave' | 'overtime';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Request {
  id: number;
  employee_id: string;
  employee_name?: string; // Dùng khi join bảng
  avatar?: string; // Dùng khi join bảng
  type: RequestType;
  start_date: string;
  end_date: string; // Nếu nghỉ 1 ngày thì start = end
  reason: string;
  status: RequestStatus;
  created_at?: string;
}

// --- Mới: Kiểu dữ liệu cho Ca làm việc (Shifts) ---
export interface Shift {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  color: string;
}

export interface EmployeeSchedule {
  id?: number;
  employee_id: string;
  date: string;
  shift_id: number;
  shift?: Shift;
}