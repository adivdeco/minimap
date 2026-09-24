import axiosClient from './axiosClient';

export const getFloorElements = async (libraryId) => {
    const res = await axiosClient.get(`/floor-elements/library/${libraryId}`);
    return res.data;
};

export const addFloorElement = async (data) => {
    const res = await axiosClient.post('/floor-elements', data);
    return res.data;
};

export const updateFloorElementPositions = async (elements) => {
    const res = await axiosClient.put('/floor-elements/positions', { elements });
    return res.data;
};

export const deleteFloorElement = async (id) => {
    const res = await axiosClient.delete(`/floor-elements/${id}`);
    return res.data;
};
