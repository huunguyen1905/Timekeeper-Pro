import { CheckCircle, XCircle, Clock, CalendarX, UserCheck, LogOut } from 'lucide-react';
import { AttendanceStatus } from './types';

export const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: any; shortLabel: string }> = {
  present: { 
    label: 'Đủ công', 
    color: 'text-green-600', 
    bgColor: 'bg-green-100 border-green-200',
    icon: CheckCircle, 
    shortLabel: '✓' 
  },
  halfday: { 
    label: 'Nửa công', 
    color: 'text-lime-600', 
    bgColor: 'bg-lime-100 border-lime-200',
    icon: UserCheck, 
    shortLabel: '½' 
  },
  absent: { 
    label: 'Vắng mặt', 
    color: 'text-red-600', 
    bgColor: 'bg-red-100 border-red-200',
    icon: XCircle, 
    shortLabel: '✕' 
  },
  late: { 
    label: 'Đi muộn', 
    color: 'text-orange-500', 
    bgColor: 'bg-orange-100 border-orange-200',
    icon: Clock, 
    shortLabel: 'M' 
  },
  early_leave: { 
    label: 'Về sớm', 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-100 border-yellow-200',
    icon: LogOut, 
    shortLabel: 'S' 
  },
  leave: { 
    label: 'Nghỉ phép', 
    color: 'text-blue-500', 
    bgColor: 'bg-blue-100 border-blue-200',
    icon: CalendarX, 
    shortLabel: 'P' 
  }
};

export const DEPARTMENTS = ['IT', 'HR', 'Sales', 'Marketing', 'Operations', 'Finance', 'Warehouse'];

export const ROLES = ['Admin', 'User'];