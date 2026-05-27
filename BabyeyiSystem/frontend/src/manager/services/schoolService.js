import api from './api';

const schoolService = {
    getProfile: async (id) => {
        const response = await api.get(`/schools/${id}`);
        return response.data;
    },
    updateProfile: async (id, profileData) => {
        try {
            const response = await api.put(`/schools/${id}`, profileData);
            return response.data;
        } catch (error) {
            console.error('Error updating school profile:', error);
            throw error;
        }
    },

    /**
     * Fetch school groups (classes/streams)
     */
    getGroups: async (id) => {
        try {
            const response = await api.get(`/schools/${id}/classes`);
            return response.data;
        } catch (error) {
            console.error('Error fetching school classes:', error);
            throw error;
        }
    },

    /**
     * Update school groups (classes/streams)
     */
    updateGroups: async (id, groups) => {
        try {
            const response = await api.post(`/schools/${id}/classes`, { groups });
            return response.data;
        } catch (error) {
            console.error('Error updating school classes:', error);
            throw error;
        }
    },

    uploadMedia: async (id, type, file) => {
        const formData = new FormData();
        formData.append(type, file);
        const endpoint = type === 'logo' ? 'logo' : (type === 'signature' ? 'signature' : 'stamp');
        const response = await api.post(`/schools/${id}/${endpoint}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    }
};

export default schoolService;
