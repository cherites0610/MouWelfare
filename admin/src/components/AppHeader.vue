<template>
  <el-container style="min-height: 100vh">
    <!-- 側邊欄 -->
    <el-aside width="200px">
      <div class="p-4 font-bold text-lg">哞福利後台</div>
      <el-menu :default-active="activeMenu" class="border-none" router>
        <el-menu-item index="/">
            <span>異常福利列表</span>
          </el-menu-item>
        <el-menu-item index="/welfare">
          <span>福利管理</span>
        </el-menu-item>
        <el-menu-item index="/ai-test">
          <span>AI 對話測試</span>
        </el-menu-item>

      </el-menu>
    </el-aside>

    <!-- 主區塊 -->
    <el-container>
      <el-header class="flex justify-end items-center px-6 bg-white shadow-sm" height="60px">
        <el-button v-if="token" type="danger" size="small" @click="logout">登出</el-button>
      </el-header>

      <el-main class="p-6 bg-gray-50">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { computed } from 'vue'

const route = useRoute()
const router = useRouter()

const token = localStorage.getItem('authToken')
const activeMenu = computed(() => route.path)

const logout = () => {
  localStorage.removeItem('authToken')
  ElMessage.success('已登出')
  router.push('/login')
}
</script>

<style scoped>
.bg-gray-100 {
  background-color: #f5f5f5;
}
.bg-gray-50 {
  background-color: #fafafa;
}
.shadow-sm {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
</style>