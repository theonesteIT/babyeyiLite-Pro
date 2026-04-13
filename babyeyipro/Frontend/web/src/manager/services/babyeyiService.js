import api from './api';

const babyeyiService = {
    /**
     * Fetch Babyeyi statistics (total, approved, pending, rejected)
     * @param {string} schoolId - Optional school ID
     */
    getStats: async (schoolId) => {
        try {
            const params = schoolId ? { school_id: schoolId } : {};
            const response = await api.get('/babyeyi/stats', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching Babyeyi stats:', error);
            throw error;
        }
    },

    /**
     * Fetch list of Babyeyi records
     * @param {Object} params - Filter parameters (status, year, term, etc.)
     */
    getList: async (params = {}) => {
        try {
            const response = await api.get('/babyeyi', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching Babyeyi list:', error);
            throw error;
        }
    },

    /**
     * Fetch a single Babyeyi record by ID
     */
    getById: async (id) => {
        try {
            const response = await api.get(`/babyeyi/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching Babyeyi record ${id}:`, error);
            throw error;
        }
    }
};

export default babyeyiService;
