<template>
  <div class="ai-chat-page p-6">
    <h1 class="text-2xl font-bold mb-4">阿哞AI福利助手</h1>

    <gen-search-widget configId="7a2b98db-d899-4f7c-8197-c8a2f0ae7565" triggerId="searchWidgetTrigger">
    </gen-search-widget>

    <input placeholder="在這裡搜尋" id="searchWidgetTrigger" />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { marked } from 'marked';

const userQuery = ref('');
const conversation = ref([]);
const isLoading = ref(false);
const chatHistoryRef = ref(null);

// 元件載入時，AI開場白
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
      const el = chatHistoryRef.value;
      el.scrollTop = el.scrollHeight;
    }
  });
};

const sendMessage = async () => {
  if (!userQuery.value.trim()) {
    ElMessage.warning('請輸入問題後再發送！');
    return;
  }

  const userMessage = userQuery.value.trim();
  conversation.value.push({ sender: 'user', text: userMessage });
  userQuery.value = '';
  isLoading.value = true;
  scrollToBottom();

  try {
    const response = await axios.post('http://localhost:5000/api/ai-test', {
      query: userMessage,
    });

    if (response.data && response.data.answer_text) {
      conversation.value.push({
        sender: 'ai',
        text: response.data.answer_text,
        citations: response.data.citations || [],
        related_questions: response.data.related_questions || [],
      });
    } else {
      conversation.value.push({
        sender: 'ai',
        text: 'AI 未能找到相關回覆。',
      });
    }
  } catch (error) {
    console.error('API 呼叫失敗:', error);
    conversation.value.push({
      sender: 'ai',
      text: '服務異常，請稍後再試。',
    });
  } finally {
    isLoading.value = false;
    scrollToBottom();
  }
};

const sendRelatedQuery = (question) => {
  userQuery.value = question;
  sendMessage();
};
</script>

<style scoped>
.ai-chat-page {
  max-width: 800px;
  margin: 0 auto;
}

.chat-container {
  display: flex;
  flex-direction: column;
}

.chat-history {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
  border-bottom: 1px solid #e0e0e0;
  max-height: 500px;
  /* 或你想要的固定高度 */
}

.input-area {
  display: flex;
  padding: 10px 0;
}

.message-item {
  margin-bottom: 15px;
  display: flex;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.user .message-bubble {
  background-color: #e1ffc7;
}

.message-item.ai {
  justify-content: flex-start;
}

.message-item.ai .message-bubble {
  background-color: #f1f0f0;
}

.message-bubble p {
  margin: 0 0 0.6em 0;
}

.message-bubble ul {
  margin: 0 0 0.6em 1.2em;
  padding-left: 0;
}

.message-bubble li {
  margin-bottom: 0.3em;
}

.message-bubble {
  display: inline-block;
  padding: 8px 12px;
  border-radius: 18px;
  max-width: 80%;
  text-align: left;
  word-wrap: break-word;
  /* 防止長字串溢出 */
  white-space: pre-wrap;
  /* 會保留字串中的換行符號 */
  max-width: 70%;
  /* 控制泡泡不過寬 */
}

.reference-list {
  text-align: left;
  margin-left: 20px;
  margin-top: 5px;
  word-wrap: break-word;
}
</style>