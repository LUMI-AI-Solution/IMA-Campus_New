import api from './axios';

export const physicalCrmService = {
  // Schools
  getSchools: () => api.get('/physical-crm/schools').then(res => res.data),
  createSchool: (data) => api.post('/physical-crm/schools', data).then(res => res.data),
  updateSchool: (id, data) => api.put(`/physical-crm/schools/${id}`, data).then(res => res.data),
  deleteSchool: (id) => api.delete(`/physical-crm/schools/${id}`).then(res => res.data),

  // Students
  getStudents: () => api.get('/physical-crm/students').then(res => res.data),
  createStudent: (data) => api.post('/physical-crm/students', data).then(res => res.data),
  importExcelStudents: (formData) => api.post('/physical-crm/students/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  allocateExcelToClass: (formData) => api.post('/physical-crm/students/allocate-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => res.data),
  updateStudent: (id, data) => api.put(`/physical-crm/students/${id}`, data).then(res => res.data),
  deleteStudent: (id) => api.delete(`/physical-crm/students/${id}`).then(res => res.data),

  // Classes
  getClasses: () => api.get('/physical-crm/classes').then(res => res.data),
  compareClasses: (classIds) => api.get('/physical-crm/classes/compare', { params: { classIds } }).then(res => res.data),
  createClass: (data) => api.post('/physical-crm/classes', data).then(res => res.data),
  updateClass: (id, data) => api.put(`/physical-crm/classes/${id}`, data).then(res => res.data),
  deleteClass: (id) => api.delete(`/physical-crm/classes/${id}`).then(res => res.data),

  // Teachers
  getTeachers: () => api.get('/physical-crm/teachers').then(res => res.data),
  createTeacher: (data) => api.post('/physical-crm/teachers', data).then(res => res.data),
  updateTeacher: (id, data) => api.put(`/physical-crm/teachers/${id}`, data).then(res => res.data),
  deleteTeacher: (id) => api.delete(`/physical-crm/teachers/${id}`).then(res => res.data),

  // Fee Matrix & Payments
  getClassFeeMatrix: (classId) => api.get(`/physical-crm/classes/${classId}/fee-matrix`).then(res => res.data),
  toggleFeePayment: (data) => api.post('/physical-crm/classes/toggle-fee', data).then(res => res.data),

  // Teacher Reports & Invoices
  getTeacherReports: (teacherId, params = {}) => api.get(`/physical-crm/teachers/${teacherId}/reports`, { params }).then(res => res.data),

  // Student Reports & Matrix
  getStudentReports: (params = {}) => api.get('/physical-crm/student-reports', { params }).then(res => res.data),
  getStudentFullDetails: (id) => api.get(`/physical-crm/student-reports/${id}`).then(res => res.data),

  // E-SMS Gateway & Bulk SMS
  getSmsSettings: () => api.get('/physical-crm/sms/settings').then(res => res.data),
  saveSmsSettings: (data) => api.post('/physical-crm/sms/settings', data).then(res => res.data),
  sendTestSms: (data) => api.post('/physical-crm/sms/test', data).then(res => res.data),
  sendBulkSms: (data) => api.post('/physical-crm/sms/send-bulk', data).then(res => res.data),
  getSmsLogs: (params = {}) => api.get('/physical-crm/sms/logs', { params }).then(res => res.data),
};

export default physicalCrmService;
