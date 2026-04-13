import api from './api';

const studentService = {
    // Get students with optional filters
    getStudents: async (params = {}) => {
        try {
            const res = await api.get('/students', { params });
            return res.data;
        } catch (err) {
            console.error("studentService.getStudents error:", err);
            throw err;
        }
    },

    // Get a single student by ID
    getStudent: async (id) => {
        try {
            const res = await api.get(`/students/${id}`);
            return res.data;
        } catch (err) {
            console.error(`studentService.getStudent(${id}) error:`, err);
            throw err;
        }
    },

    // Create student
    createStudent: async (data) => {
        try {
            const res = await api.post('/students', data);
            return res.data;
        } catch (err) {
            console.error("studentService.createStudent error:", err);
            throw err;
        }
    },

    // Update student
    updateStudent: async (id, data) => {
        try {
            const res = await api.put(`/students/${id}`, data);
            return res.data;
        } catch (err) {
            console.error(`studentService.updateStudent(${id}) error:`, err);
            throw err;
        }
    },

    // Delete student
    deleteStudent: async (id) => {
        try {
            const res = await api.delete(`/students/${id}`);
            return res.data;
        } catch (err) {
            console.error(`studentService.deleteStudent(${id}) error:`, err);
            throw err;
        }
    }
};

export default studentService;
