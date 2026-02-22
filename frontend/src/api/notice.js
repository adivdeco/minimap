import api from './axiosClient';

export const getNotices = async (libraryId, activeOnly = false) => {
    const response = await api.get(`/notices/library/${libraryId}`, {
        params: { activeOnly }
    });
    return response.data;
};

export const createNotice = async (noticeData) => {
    const response = await api.post('/notices', noticeData);
    return response.data;
};

export const updateNotice = async (noticeId, noticeData) => {
    const response = await api.put(`/notices/${noticeId}`, noticeData);
    return response.data;
};

export const deleteNotice = async (noticeId) => {
    const response = await api.delete(`/notices/${noticeId}`);
    return response.data;
};
