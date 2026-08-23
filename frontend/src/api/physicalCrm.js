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
  updateStudent: (id, data) => api.put(`/physical-crm/students/${id}`, data).then(res => res.data),
  deleteStudent: (id) => api.delete(`/physical-crm/students/${id}`).then(res => res.data),

  // Classes
  getClasses: () => api.get('/physical-crm/classes').then(res => res.data),
  createClass: (data) => api.post('/physical-crm/classes', data).then(res => res.data),
  updateClass: (id, data) => api.put(`/physical-crm/classes/${id}`, data).then(res => res.data),
  deleteClass: (id) => api.delete(`/physical-crm/classes/${id}`).then(res => res.data),

  // Teachers
  getTeachers: () => api.get('/physical-crm/teachers').then(res => res.data),
  createTeacher: (data) => api.post('/physical-crm/teachers', data).then(res => res.data),
  updateTeacher: (id, data) => api.put(`/physical-crm/teachers/${id}`, data).then(res => res.data),
  deleteTeacher: (id) => api.delete(`/physical-crm/teachers/${id}`).then(res => res.data),
};

export default physicalCrmService;
