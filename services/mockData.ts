import { Employee, EmployeeAttendance } from '../types';

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'ID001',
    code: 'NV001',
    name: 'Nguyễn Văn Admin',
    department: 'IT',
    username: 'admin',
    password: '123',
    role: 'Admin',
    avatar: 'https://picsum.photos/200'
  },
  {
    id: 'ID002',
    code: 'NV002',
    name: 'Trần Thị User',
    department: 'HR',
    username: 'user',
    password: '123',
    role: 'User',
    avatar: 'https://picsum.photos/201'
  },
  {
    id: 'ID003',
    code: 'NV003',
    name: 'Lê Văn C',
    department: 'Sales',
    role: 'User',
    avatar: 'https://picsum.photos/202'
  },
  {
    id: 'ID004',
    code: 'NV004',
    name: 'Phạm Thị D',
    department: 'Sales',
    role: 'User',
  },
  {
    id: 'ID005',
    code: 'NV005',
    name: 'Hoàng Văn E',
    department: 'Operations',
    role: 'User',
  }
];

export const INITIAL_ATTENDANCE: Record<string, EmployeeAttendance> = {};

// Initialize some random attendance data
const today = new Date();
const currentMonth = today.getMonth() + 1;

INITIAL_EMPLOYEES.forEach(emp => {
  INITIAL_ATTENDANCE[emp.id] = {
    [currentMonth]: {}
  };
  
  // Fill random status for first 15 days
  for(let i = 1; i <= 15; i++) {
    const day = String(i).padStart(2, '0');
    const rand = Math.random();
    let status: any = 'present';
    if(rand > 0.9) status = 'absent';
    else if(rand > 0.8) status = 'late';
    
    INITIAL_ATTENDANCE[emp.id][currentMonth][day] = {
      status,
      timestamp: '08:00',
      overtimeHours: rand > 0.95 ? 2 : 0,
      overtimeMultiplier: 1.5
    };
  }
});