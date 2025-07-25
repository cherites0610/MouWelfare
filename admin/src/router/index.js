// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import WelfareDetail from '../views/WelfareDetail.vue'
import WelfareEdit from '../views/WelfareEdit.vue'
import WelfareCreate from '../views/WelfareCreate.vue'

const routes = [
  {
    path: '/',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/welfare/:id',
    component: WelfareDetail,
    meta: { requiresAuth: true }
  },
  { 
    path: '/welfare/:id/edit', 
    component: WelfareEdit, 
    meta: { requiresAuth: true } 
  },
  { 
    path: '/welfare/create', 
    component: WelfareCreate, 
    meta: { requiresAuth: true } 
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全域前置守衛：檢查登入狀態
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('authToken')
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router