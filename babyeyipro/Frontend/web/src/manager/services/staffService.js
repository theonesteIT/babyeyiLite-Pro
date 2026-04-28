import api from './api';

const staffService = {
    /**
     * Fetch staff for the school
     */
    getStaff: async () => {
        try {
            const response = await api.get('/school/staff');
            return response.data;
        } catch (error) {
            console.error('Error fetching staff:', error);
            throw error;
        }
    },

    /**
     * Create new staff member
     */
    createStaff: async (staffData) => {
        try {
            const response = await api.post('/school/staff', staffData);
            return response.data;
        } catch (error) {
            console.error('Error creating staff:', error);
            throw error;
        }
    },

    /**
     * Update existing staff profile and biometrics
     */
    updateStaff: async (staffId, staffData) => {
        try {
            const response = await api.patch(`/school/staff/${staffId}`, staffData);
            return response.data;
        } catch (error) {
            console.error('Error updating staff:', error);
            throw error;
        }
    },

    /**
     * Update staff profile photo exclusively
     */
    updateStaffPhoto: async (staffId, formData) => {
        try {
            const response = await api.post(
                `/school/staff/${staffId}/photo`,
                formData,
                { headers: { 'Content-Type': undefined } }   // let axios auto-set multipart/form-data + boundary
            );
            return response.data;
        } catch (error) {
            console.error('Error updating staff photo:', error);
            throw error;
        }
    },

    /**
     * Resend/Reset invitation credentials for a staff member
     */
    resendInvitation: async (staffId) => {
        try {
            const response = await api.post(`/school/staff/${staffId}/resend-invite`);
            return response.data;
        } catch (error) {
            console.error('Error resending invitation:', error);
            throw error;
        }
    },

    /**
     * Delete staff account (soft-delete on backend)
     */
    deleteStaff: async (staffId) => {
        try {
            const response = await api.delete(`/school/staff/${staffId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting staff:', error);
            throw error;
        }
    },

    /**
     * Activate / deactivate staff account
     */
    setStaffActive: async (staffId, isActive) => {
        try {
            const response = await api.patch(`/school/staff/${staffId}`, { is_active: !!isActive });
            return response.data;
        } catch (error) {
            console.error('Error changing staff active status:', error);
            throw error;
        }
    }
};

export default staffService;
