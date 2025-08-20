<template>
  <div class="ai-chat-page p-6">
    <h1 class="text-2xl font-bold mb-4">阿哞AI福利助手</h1>

    <div class="chat-history" ref="chatHistoryRef">
      <div v-for="(msg, index) in conversation" :key="index" :class="['message-item', msg.sender]">
        <div class="message-bubble">
          <p>{{ msg.text }}</p>
          <ul v-if="msg.welfareCards?.length">
            <li v-for="card in msg.welfareCards" :key="card.id">
              <strong>{{ card.title }}</strong>: {{ card.summary }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="input-area">
      <input v-model="userQuery" @keyup.enter="sendMessage" placeholder="在這裡輸入問題" />
      <button @click="sendMessage" :disabled="isLoading">送出</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';

const userQuery = ref('');
const conversation = ref([]);
const isLoading = ref(false);
const chatHistoryRef = ref(null);

onMounted(() => {
  conversation.value.push({
    sender: 'ai',
    text: '您好，我是阿哞AI福利助手，請問需要什麼幫助呢？',
  });
  scrollToBottom();
});

const scrollToBottom = () => {
  nextTick(() => {
    if (chatHistoryRef.value) {
      chatHistoryRef.value.scrollTop = chatHistoryRef.value.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  if (!userQuery.value.trim()) {
    ElMessage.warning('請輸入問題後再發送！');
    return;
  }

  const message = userQuery.value.trim();
  conversation.value.push({ sender: 'user', text: message });
  userQuery.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    // 呼叫 NestJS 後端 API
    const res = await axios.post('http://localhost:3000/vertex/search', {
      query: message,
    });

    conversation.value.push({
      sender: 'ai',
      text: res.data.answer,
      welfareCards: res.data.welfareCards || [],
    });
  } catch (err) {
    console.error(err);
    conversation.value.push({
      sender: 'ai',
      text: '服務異常，請稍後再試。',
      welfareCards: [],
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};
</script>