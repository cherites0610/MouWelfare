<template>
  <div style="max-width: 400px; margin: 100px auto">
    <el-card>
      <h2>登入哞福利後台</h2>
      <el-input v-model="apiKey" placeholder="請輸入 API Key" />
      <el-button type="primary" class="mt-2" @click="login">登入</el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const apiKey = ref('')
const router = useRouter()

const login = () => {
  if (!apiKey.value) return ElMessage.error('請輸入 API Key')

  const token = btoa(apiKey.value) // Base64 編碼
  localStorage.setItem('authToken', token)
  ElMessage.success('登入成功')
  router.push('/')
}
</script>

<style>
.mt-2 {
  margin-top: 12px;
}
</style>