<script setup>
import AppHeader from './components/AppHeader.vue'
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <!-- 如果是 login 頁面，就單獨顯示 -->
  <router-view v-if="route.name === 'Login'" />

  <!-- 其餘頁面都用 AppHeader 當 layout -->
  <AppHeader v-else />
</template>