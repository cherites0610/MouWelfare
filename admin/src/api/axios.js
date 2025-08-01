import axios from 'axios'

const api = axios.create({
  baseURL: 'https://mou-api.cherites.org',
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api