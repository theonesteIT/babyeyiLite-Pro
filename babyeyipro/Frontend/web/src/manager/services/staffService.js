import api from './api';

const fileToPhotoJsonPayload = async (file) => {
    if (!(file instanceof File)) return null;
    const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
    });
    const comma = dataUrl.indexOf(',');
    const photoBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
    return { photoBase64, mimeType };
};

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
            let response;
            try {
                // Newer backend variants use PATCH.
                response = await api.patch(`/school/staff/${staffId}`, staffData);
            } catch (patchError) {
                const status = patchError?.response?.status;
                // Older backend variants use PUT for this endpoint.
                if (status === 404 || status === 405) {
                    response = await api.put(`/school/staff/${staffId}`, staffData);
                } else {
                    throw patchError;
                }
            }
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
            const photoFile = formData instanceof FormData ? formData.get('photo') : null;
            if (!(photoFile instanceof File)) {
                throw new Error('No photo file provided.');
            }
            const jsonPayload = await fileToPhotoJsonPayload(photoFile);

            // Stable path first: JSON payload avoids multipart stream/parser issues.
            try {
                const response = await api.post(`/school/staff/${staffId}/photo`, jsonPayload);
                return response.data;
            } catch (jsonError) {
                const status = jsonError?.response?.status;
                const msg = String(jsonError?.response?.data?.message || '').toLowerCase();

                // Same endpoint might expect multipart field instead of JSON.
                const expectsMultipartOnPhotoRoute =
                    msg.includes('no image uploaded') ||
                    msg.includes('multipart') ||
                    msg.includes('photo upload failed') ||
                    msg.includes('unexpected end of form') ||
                    msg.includes('unexpected field');

                if (expectsMultipartOnPhotoRoute) {
                    const response = await api.post(`/school/staff/${staffId}/photo`, formData);
                    return response.data;
                }

                // Alternate backend route fallback.
                if (status === 404 || status === 405) {
                    const response = await api.put(`/school/staff/${staffId}/identity/photo`, formData);
                    return response.data;
                }
                throw jsonError;
            }
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
    },

    /** School-wide Shule Avance monthly cap (% of net salary) */
    getShuleAvancePolicy: async () => {
        const response = await api.get('/school/shule-avance-policy');
        return response.data;
    },

    /** Resolve existing staff for spreadsheet import (National ID / RSSB). */
    lookupStaffForImport: async (params = {}) => {
        const response = await api.get('/school/staff/import-lookup', { params });
        return response.data;
    },

    updateShuleAvancePolicy: async (maxPercent) => {
        const response = await api.patch('/school/shule-avance-policy', { max_percent: maxPercent });
        return response.data;
    },

    /** Toggle per-staff Shule Avance access (Lite + Pro) */
    setStaffAllowAdvance: async (staffId, allowAdvance) => {
        const response = await api.patch(`/school/staff/${staffId}`, { allow_advance: !!allowAdvance });
        return response.data;
    },
};

export default staffService;
