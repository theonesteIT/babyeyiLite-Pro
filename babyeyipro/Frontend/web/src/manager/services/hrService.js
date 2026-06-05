import api from './api';
import staffService from './staffService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5100').replace(/\/+$/, '');

const hrService = {
  getDepartments: async () => {
    const response = await api.get('/school/hr/departments');
    return response.data;
  },

  seedDefaultDepartments: async () => {
    const response = await api.post('/school/hr/departments/seed-defaults');
    return response.data;
  },

  createDepartment: async (payload) => {
    const response = await api.post('/school/hr/departments', payload);
    return response.data;
  },

  updateDepartment: async (deptId, payload) => {
    const response = await api.patch(`/school/hr/departments/${deptId}`, payload);
    return response.data;
  },

  deleteDepartment: async (deptId) => {
    const response = await api.delete(`/school/hr/departments/${deptId}`);
    return response.data;
  },

  getDirectory: async (params = {}) => {
    const response = await api.get('/school/hr/directory', { params });
    return response.data;
  },

  getEmployee: async (userId) => {
    const response = await api.get(`/school/hr/employees/${userId}`);
    return response.data;
  },

  uploadEmployeeDocuments: async (userId, docFiles = {}) => {
    const fd = new FormData();
    let count = 0;
    Object.entries(docFiles).forEach(([key, entry]) => {
      const file = entry?.file;
      if (file instanceof File) {
        fd.append(key, file, file.name);
        count += 1;
      }
    });
    if (!count) return { success: true, message: 'No new documents to upload.' };
    const resp = await fetch(`${API_BASE_URL}/api/school/hr/employees/${userId}/documents`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.message || `Document upload failed (${resp.status})`);
    }
    return data;
  },

  updateEmployee: async (userId, payload, photoFile, docFiles) => {
    const res = await staffService.updateStaff(userId, payload);
    if (res?.success && photoFile) {
      const photoData = new FormData();
      photoData.append('photo', photoFile);
      await staffService.updateStaffPhoto(userId, photoData);
    }
    if (res?.success && docFiles) {
      await hrService.uploadEmployeeDocuments(userId, docFiles);
    }
    return res;
  },

  registerEmployee: async (payload, photoFile, docFiles) => {
    const res = await staffService.createStaff(payload);
    const staffId = res?.data?.id;
    if (res?.success && staffId && photoFile) {
      const photoData = new FormData();
      photoData.append('photo', photoFile);
      await staffService.updateStaffPhoto(staffId, photoData);
    }
    if (res?.success && staffId && docFiles) {
      await hrService.uploadEmployeeDocuments(staffId, docFiles);
    }
    return res;
  },

  getLeaveStats: async () => {
    const response = await api.get('/school/hr/leave/stats');
    return response.data;
  },

  getLeaveRequests: async (params = {}) => {
    const response = await api.get('/school/hr/leave', { params });
    return response.data;
  },

  getLeaveBalance: async (userId, leaveType = 'Annual Leave') => {
    const response = await api.get(`/school/hr/leave/balance/${userId}`, { params: { leave_type: leaveType } });
    return response.data;
  },

  submitLeaveRequest: async (payload) => {
    const response = await api.post('/school/hr/leave', payload);
    return response.data;
  },

  updateLeaveStatus: async (leaveId, status) => {
    const response = await api.patch(`/school/hr/leave/${leaveId}`, { status });
    return response.data;
  },
};

export default hrService;
