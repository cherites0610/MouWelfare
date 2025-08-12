import api from './axios'

export const getAbnormalWelfares = () => {
  return api.get('/welfare/admin/abnormal')
}

export const markAsNormal = (id) => {
  return api.post(`/welfare/${id}/abnormal/false`)
}

export const getWelfareById = (id) => {
  return api.get(`/welfare/${id}`)
}

export const deleteWelfare = (id) => {
  return api.delete(`/welfare/${id}`)
}

export const updateWelfare = (id, data) => {
  return api.patch(`/welfare/${id}`, data)
}

export const createWelfare = (data) => {
  return api.post('/welfare', data)
}

export const getAllWelfares = (params) => {
  return api.get('/welfare', { params })
}