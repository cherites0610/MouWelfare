// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Home from '../views/Home.vue'
import WelfareDetail from '../views/WelfareDetail.vue'
import WelfareEdit from '../views/WelfareEdit.vue'
import WelfareCreate from '../views/WelfareCreate.vue'
import WelfareList from '../views/WelfareList.vue'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
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
    path: '/welfare', 
    component: WelfareList, 
    meta: { requiresAuth: true } 
  },
  { path: '/ai-test', 
    component: () => import('../views/AITest.vue') 
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