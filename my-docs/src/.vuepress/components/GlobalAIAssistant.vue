<template>
  <div class="global-ai-assistant" :class="{ 'is-open': isOpen }">
    <button
      type="button"
      class="ai-fab"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-label="打开机器人助手"
      @click="toggleOpen"
    >
      <span class="ai-fab-main" aria-hidden="true">
        <svg class="ai-robot-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path
            d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h3a2 2 0 0 1 2 2v2h1a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2H5a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h1V9a2 2 0 0 1 2-2h3V5.72A2 2 0 0 1 10 4a2 2 0 0 1 2-2Zm-3 8a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
          />
        </svg>
      </span>
      <span v-if="unreadCount > 0 && !isOpen" class="ai-unread">
        {{ unreadCount > 99 ? "99+" : unreadCount }}
      </span>
    </button>

    <section v-if="isOpen" class="ai-panel" aria-live="polite">
      <header class="ai-panel-head">
        <strong>AI 页面讲解</strong>
        <button type="button" class="ai-close" @click="isOpen = false">收起</button>
      </header>

      <div class="ai-config">
        <button type="button" class="ai-config-toggle" @click="showApiConfig = !showApiConfig">
          {{ showApiConfig ? "隐藏 Key 设置" : "设置 API Key" }}
        </button>
        <div v-if="showApiConfig" class="ai-key-box">
          <input
            v-model="apiKeyDraft"
            class="ai-key-input"
            type="password"
            autocomplete="off"
            placeholder="输入 OpenAI API Key (sk-...)"
          />
          <div class="ai-key-actions">
            <button type="button" class="ai-key-save" @click="saveApiKey">保存</button>
            <button type="button" class="ai-key-clear" @click="clearApiKey">清空</button>
          </div>
          <p class="ai-key-hint">{{ apiKeyHint }}</p>
        </div>
      </div>

      <div ref="messageListRef" class="ai-messages">
        <div v-for="message in messages" :key="message.id" class="ai-message" :class="`is-${message.role}`">
          <p class="ai-message-role">{{ messageRoleLabel(message.role, message.kind) }}</p>
          <p class="ai-message-text">{{ message.text }}</p>
        </div>
      </div>

      <p class="ai-status">{{ statusText }}</p>

      <form class="ai-input-area" @submit.prevent="sendManualMessage">
        <textarea
          v-model="userInput"
          class="ai-input"
          rows="3"
          placeholder="输入问题，AI 会结合当前页面回答"
        ></textarea>
        <button type="submit" class="ai-send" :disabled="isBusy || !userInput.trim()">
          {{ isBusy ? "思考中..." : "发送" }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { usePageData } from "vuepress/client";

type ChatRole = "assistant" | "user";
type ChatKind = "auto" | "manual";

type ChatMessage = {
  id: number;
  role: ChatRole;
  kind: ChatKind;
  text: string;
};

type OpenAIMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

type ProviderPreset = {
  id: "openai" | "deepseek";
  label: string;
  endpoint: string;
  model: string;
};

const OPENAI_PRESET: ProviderPreset = {
  id: "openai",
  label: "OpenAI",
  endpoint: "https://api.openai.com/v1/chat/completions",
  model: "gpt-4o-mini",
};

const DEEPSEEK_PRESET: ProviderPreset = {
  id: "deepseek",
  label: "DeepSeek",
  endpoint: "https://api.deepseek.com/chat/completions",
  model: "deepseek-chat",
};

const API_KEY_STORAGE_KEY = "zhize-openai-api-key";
const DEFAULT_OPENAI_API_KEY = "sk-56cb0ea01edc4b7fa2fa9a5fdad74901";
const API_ENDPOINT_STORAGE_KEY = "zhize-ai-endpoint";
const MODEL_STORAGE_KEY = "zhize-ai-model";

const isClient = typeof window !== "undefined" && typeof document !== "undefined";
const page = usePageData();

const isOpen = ref(false);
const isBusy = ref(false);
const unreadCount = ref(0);
const showApiConfig = ref(false);
const apiKey = ref(DEFAULT_OPENAI_API_KEY);
const apiKeyDraft = ref(DEFAULT_OPENAI_API_KEY);
const apiEndpoint = ref(DEEPSEEK_PRESET.endpoint);
const modelName = ref(DEEPSEEK_PRESET.model);
const userInput = ref("");
const statusText = ref("等待页面讲解...");
const messageListRef = ref<HTMLElement | null>(null);

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: "assistant",
    kind: "auto",
    text: "我是你的站点讲解机器人。进入新页面后我会自动讲解，你也可以手动问我问题。",
  },
]);

let nextMessageId = 2;
let lastExplainedPath = "";
let activeRequestToken = 0;

const apiKeyHint = computed(() => {
  if (!apiKey.value) return "未设置 Key。建议仅在你自己的浏览器本地保存。";
  const provider =
    apiEndpoint.value === DEEPSEEK_PRESET.endpoint
      ? DEEPSEEK_PRESET.label
      : apiEndpoint.value === OPENAI_PRESET.endpoint
        ? OPENAI_PRESET.label
        : "自定义";
  return `已保存 Key：${maskApiKey(apiKey.value)} ｜线路：${provider} ｜模型：${modelName.value}`;
});

const toggleOpen = (): void => {
  isOpen.value = !isOpen.value;
  if (isOpen.value) unreadCount.value = 0;
};

const messageRoleLabel = (role: ChatRole, kind: ChatKind): string => {
  if (role === "user") return "你";
  return kind === "auto" ? "AI 自动讲解" : "AI";
};

const maskApiKey = (key: string): string => {
  if (key.length <= 10) return "已配置";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};

const pickPresetByKey = (key: string): ProviderPreset => {
  if (key.startsWith("sk-proj-")) return OPENAI_PRESET;
  return DEEPSEEK_PRESET;
};

const normalizeText = (text: string): string => text.replace(/\s+/g, " ").trim();

const addMessage = (role: ChatRole, text: string, kind: ChatKind): void => {
  const cleanedText = normalizeText(text);
  if (!cleanedText) return;

  messages.value.push({
    id: nextMessageId,
    role,
    kind,
    text: cleanedText,
  });
  nextMessageId += 1;

  if (!isOpen.value && role === "assistant") {
    unreadCount.value += 1;
  }
};

const scrollMessagesToBottom = (): void => {
  const messageList = messageListRef.value;
  if (!messageList) return;
  messageList.scrollTop = messageList.scrollHeight;
};

const collectPageText = (): string => {
  if (!isClient) return "";

  const selectors = [".theme-hope-content", ".vp-page", ".theme-container main", "main"];
  let bestText = "";

  for (const selector of selectors) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;

    const text = normalizeText(element.innerText || element.textContent || "");
    if (text.length > bestText.length) {
      bestText = text;
    }
  }

  return bestText.slice(0, 3200);
};

const collectPageHeaders = (): string => {
  const headers = Array.isArray(page.value.headers) ? page.value.headers : [];
  if (!headers.length) return "（无）";

  return headers
    .slice(0, 12)
    .map((header, index) => `${index + 1}. ${normalizeText(header.title || "未命名小节")}`)
    .join("\n");
};

const buildPageContext = (): string => {
  const pagePath = normalizeText(page.value.path || (isClient ? window.location.pathname : ""));
  const title = normalizeText(page.value.title || (isClient ? document.title : "") || "未命名页面");
  const headers = collectPageHeaders();
  const bodyText = collectPageText() || "（未提取到正文）";

  return [
    `页面路径: ${pagePath || "未知"}`,
    `页面标题: ${title}`,
    `页面目录:`,
    headers,
    `页面正文摘录:`,
    bodyText,
  ].join("\n");
};

const parseAssistantContent = (content: unknown): string => {
  if (typeof content === "string") return normalizeText(content);

  if (Array.isArray(content)) {
    const merged = content
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && typeof item.text === "string") return item.text;
        return "";
      })
      .join("\n");

    return normalizeText(merged);
  }

  return "";
};

const requestAssistantOnce = async (
  userPrompt: string,
  mode: ChatKind,
  preset: ProviderPreset,
): Promise<string> => {
  const pageContext = buildPageContext();
  const recentConversation: OpenAIMessage[] = messages.value
    .slice(-8)
    .map((item) => ({
      role: item.role,
      content: item.text,
    }));

  const systemPrompt =
    "你是网站右下角的中文讲解机器人。回答要求准确、简洁、结构清晰，不要编造页面里没有的信息；若信息不足，直接说明不确定。";
  const modeInstruction =
    mode === "auto"
      ? "这是一次自动讲解。请先概括页面主题，再讲 3 到 5 个重点，最后给出 2 个可继续追问的问题。"
      : "这是一次手动问答。请优先结合页面内容回答，再给出可执行建议。";

  const response = await fetch(preset.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.value}`,
    },
    body: JSON.stringify({
      model: preset.model,
      temperature: 0.3,
      max_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "system", content: modeInstruction },
        { role: "system", content: `当前页面上下文如下:\n${pageContext}` },
        ...recentConversation,
        { role: "user", content: userPrompt },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAIChatResponse;

  if (!response.ok) {
    const message = payload.error?.message || `请求失败（HTTP ${response.status}）`;
    throw new Error(`${preset.label} 请求失败：${message}`);
  }

  const output = parseAssistantContent(payload.choices?.[0]?.message?.content);
  if (!output) throw new Error(`${preset.label} 未返回有效内容。`);
  return output;
};

const resolvePrimaryPreset = (): ProviderPreset => {
  if (apiEndpoint.value === OPENAI_PRESET.endpoint) {
    return {
      ...OPENAI_PRESET,
      model: modelName.value || OPENAI_PRESET.model,
    };
  }

  if (apiEndpoint.value === DEEPSEEK_PRESET.endpoint) {
    return {
      ...DEEPSEEK_PRESET,
      model: modelName.value || DEEPSEEK_PRESET.model,
    };
  }

  return {
    id: "openai",
    label: "自定义线路",
    endpoint: apiEndpoint.value,
    model: modelName.value || OPENAI_PRESET.model,
  };
};

const requestAssistant = async (userPrompt: string, mode: ChatKind): Promise<string> => {
  if (!apiKey.value) {
    throw new Error("未设置 API Key。");
  }

  const primaryPreset = resolvePrimaryPreset();
  const fallbacks: ProviderPreset[] = [];

  if (primaryPreset.endpoint !== DEEPSEEK_PRESET.endpoint) {
    fallbacks.push(DEEPSEEK_PRESET);
  }
  if (primaryPreset.endpoint !== OPENAI_PRESET.endpoint) {
    fallbacks.push(OPENAI_PRESET);
  }

  const candidates = [primaryPreset, ...fallbacks];
  let lastError: Error | null = null;

  for (let index = 0; index < candidates.length; index += 1) {
    const preset = candidates[index];
    try {
      const output = await requestAssistantOnce(userPrompt, mode, preset);
      if (index > 0) {
        apiEndpoint.value = preset.endpoint;
        modelName.value = preset.model;
        if (isClient) {
          window.localStorage.setItem(API_ENDPOINT_STORAGE_KEY, preset.endpoint);
          window.localStorage.setItem(MODEL_STORAGE_KEY, preset.model);
        }
      }
      return output;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("请求失败。");
    }
  }

  throw lastError || new Error("请求失败。");
};

const explainPage = async (path: string, force = false): Promise<void> => {
  if (!isClient || !path) return;
  if (!force && path === lastExplainedPath) return;
  if (!apiKey.value) {
    statusText.value = "未设置 API Key，暂时无法自动讲解。";
    return;
  }

  await nextTick();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 160));

  const requestToken = activeRequestToken + 1;
  activeRequestToken = requestToken;
  isBusy.value = true;
  statusText.value = "正在思考当前页面并生成讲解...";

  try {
    const explainPrompt = "请讲解我刚进入的这个页面。";
    const result = await requestAssistant(explainPrompt, "auto");
    if (requestToken !== activeRequestToken) return;

    addMessage("assistant", result, "auto");
    lastExplainedPath = path;
    statusText.value = "已完成当前页面讲解。";
  } catch (error) {
    const message = error instanceof Error ? error.message : "自动讲解失败。";
    statusText.value = `自动讲解失败：${message}`;
    addMessage("assistant", `自动讲解失败：${message}`, "auto");
  } finally {
    if (requestToken === activeRequestToken) {
      isBusy.value = false;
    }
  }
};

const sendManualMessage = async (): Promise<void> => {
  const question = normalizeText(userInput.value);
  if (!question) return;

  if (!apiKey.value) {
    statusText.value = "请先设置 API Key。";
    addMessage("assistant", "请先在“设置 API Key”中保存你的 Key，然后我才能回答。", "manual");
    return;
  }

  addMessage("user", question, "manual");
  userInput.value = "";
  isBusy.value = true;
  statusText.value = "正在思考你的问题...";

  const requestToken = activeRequestToken + 1;
  activeRequestToken = requestToken;

  try {
    const answer = await requestAssistant(question, "manual");
    if (requestToken !== activeRequestToken) return;

    addMessage("assistant", answer, "manual");
    statusText.value = "回答完成。";
  } catch (error) {
    const message = error instanceof Error ? error.message : "回答失败。";
    statusText.value = `回答失败：${message}`;
    addMessage("assistant", `回答失败：${message}`, "manual");
  } finally {
    if (requestToken === activeRequestToken) {
      isBusy.value = false;
    }
  }
};

const saveApiKey = (): void => {
  if (!isClient) return;

  const trimmed = normalizeText(apiKeyDraft.value);
  if (!trimmed) return;

  const preset = pickPresetByKey(trimmed);
  apiKey.value = trimmed;
  apiEndpoint.value = preset.endpoint;
  modelName.value = preset.model;
  window.localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
  window.localStorage.setItem(API_ENDPOINT_STORAGE_KEY, preset.endpoint);
  window.localStorage.setItem(MODEL_STORAGE_KEY, preset.model);
  showApiConfig.value = false;
  statusText.value = "API Key 已保存。";

  const currentPath = page.value.path || window.location.pathname;
  void explainPage(currentPath, true);
};

const clearApiKey = (): void => {
  if (!isClient) return;

  apiKey.value = "";
  apiKeyDraft.value = "";
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.localStorage.removeItem(API_ENDPOINT_STORAGE_KEY);
  window.localStorage.removeItem(MODEL_STORAGE_KEY);
  apiEndpoint.value = DEEPSEEK_PRESET.endpoint;
  modelName.value = DEEPSEEK_PRESET.model;
  statusText.value = "已清空 API Key。";
};

watch(
  () => messages.value.length,
  () => {
    if (!isClient) return;
    void nextTick().then(scrollMessagesToBottom);
  },
);

watch(
  () => page.value.path,
  (path) => {
    if (!isClient || !path) return;
    void explainPage(path);
  },
);

onMounted(() => {
  if (!isClient) return;

  const cachedKey = normalizeText(window.localStorage.getItem(API_KEY_STORAGE_KEY) || "");
  const cachedEndpoint = normalizeText(window.localStorage.getItem(API_ENDPOINT_STORAGE_KEY) || "");
  const cachedModel = normalizeText(window.localStorage.getItem(MODEL_STORAGE_KEY) || "");
  if (cachedKey) {
    apiKey.value = cachedKey;
    apiKeyDraft.value = cachedKey;
    if (cachedEndpoint) apiEndpoint.value = cachedEndpoint;
    if (cachedModel) modelName.value = cachedModel;
    const currentPath = page.value.path || window.location.pathname;
    void explainPage(currentPath, true);
    return;
  }

  const defaultPreset = pickPresetByKey(DEFAULT_OPENAI_API_KEY);
  apiKey.value = DEFAULT_OPENAI_API_KEY;
  apiKeyDraft.value = DEFAULT_OPENAI_API_KEY;
  apiEndpoint.value = defaultPreset.endpoint;
  modelName.value = defaultPreset.model;
  window.localStorage.setItem(API_KEY_STORAGE_KEY, DEFAULT_OPENAI_API_KEY);
  window.localStorage.setItem(API_ENDPOINT_STORAGE_KEY, defaultPreset.endpoint);
  window.localStorage.setItem(MODEL_STORAGE_KEY, defaultPreset.model);

  const currentPath = page.value.path || window.location.pathname;
  statusText.value = "已使用默认 API Key，正在准备页面讲解。";
  void explainPage(currentPath, true);
});
</script>

<style scoped>
.global-ai-assistant {
  position: fixed;
  right: clamp(0.75rem, 2.5vw, 1.6rem);
  bottom: clamp(0.75rem, 2.2vh, 1.45rem);
  z-index: 156;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.62rem;
  pointer-events: none;
}

.global-ai-assistant > * {
  pointer-events: auto;
}

.ai-fab {
  position: relative;
  width: 56px;
  height: 56px;
  border: 1px solid rgba(115, 169, 236, 0.55);
  border-radius: 999px;
  background: linear-gradient(145deg, #f4fbff 0%, #d7edff 46%, #93cbff 100%);
  color: #0a3d71;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 14px 30px rgba(7, 37, 70, 0.26);
  cursor: pointer;
}

.ai-fab-main {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.ai-robot-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.ai-unread {
  position: absolute;
  top: -5px;
  right: -2px;
  min-width: 20px;
  height: 20px;
  padding: 0 0.32rem;
  border-radius: 999px;
  background: #e02f5a;
  color: #fff;
  font-size: 0.68rem;
  line-height: 20px;
  font-weight: 700;
}

.ai-panel {
  width: min(386px, calc(100vw - 1rem));
  max-height: min(76vh, 640px);
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid rgba(126, 177, 230, 0.54);
  background: rgba(6, 19, 38, 0.92);
  color: #ecf5ff;
  box-shadow: 0 18px 36px rgba(2, 11, 23, 0.44);
  backdrop-filter: blur(7px);
  overflow: hidden;
}

.ai-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.66rem;
  padding: 0.62rem 0.72rem;
  border-bottom: 1px solid rgba(128, 172, 212, 0.32);
}

.ai-panel-head strong {
  font-size: 0.86rem;
  font-weight: 700;
}

.ai-close {
  border: 0;
  border-radius: 999px;
  padding: 0.22rem 0.56rem;
  background: rgba(154, 200, 243, 0.24);
  color: #eaf4ff;
  font-size: 0.72rem;
  cursor: pointer;
}

.ai-config {
  padding: 0.56rem 0.72rem 0;
}

.ai-config-toggle {
  width: 100%;
  border: 1px solid rgba(148, 194, 239, 0.4);
  border-radius: 9px;
  padding: 0.34rem 0.52rem;
  background: rgba(149, 203, 255, 0.16);
  color: #eef7ff;
  font-size: 0.72rem;
  cursor: pointer;
}

.ai-key-box {
  margin-top: 0.45rem;
}

.ai-key-input {
  width: 100%;
  border: 1px solid rgba(147, 189, 230, 0.42);
  border-radius: 8px;
  padding: 0.38rem 0.5rem;
  background: rgba(7, 21, 42, 0.84);
  color: #f1f8ff;
  font-size: 0.72rem;
}

.ai-key-actions {
  display: flex;
  gap: 0.44rem;
  margin-top: 0.42rem;
}

.ai-key-save,
.ai-key-clear {
  border: 0;
  border-radius: 8px;
  padding: 0.28rem 0.56rem;
  font-size: 0.7rem;
  cursor: pointer;
}

.ai-key-save {
  background: linear-gradient(120deg, #dff2ff 0%, #9cd0ff 100%);
  color: #0f3f71;
}

.ai-key-clear {
  background: rgba(206, 97, 120, 0.22);
  color: #ffdfe8;
}

.ai-key-hint {
  margin: 0.44rem 0 0;
  font-size: 0.68rem;
  color: rgba(213, 232, 250, 0.88);
}

.ai-messages {
  margin: 0.54rem 0.72rem 0;
  padding: 0.28rem;
  border-radius: 10px;
  border: 1px solid rgba(119, 169, 216, 0.35);
  background: rgba(2, 11, 23, 0.66);
  overflow-y: auto;
  min-height: 190px;
  max-height: min(36vh, 320px);
}

.ai-message {
  border-radius: 10px;
  padding: 0.42rem 0.48rem;
  margin-bottom: 0.4rem;
}

.ai-message:last-child {
  margin-bottom: 0;
}

.ai-message.is-user {
  background: rgba(125, 184, 245, 0.2);
}

.ai-message.is-assistant {
  background: rgba(255, 255, 255, 0.08);
}

.ai-message-role {
  margin: 0;
  font-size: 0.66rem;
  color: rgba(194, 224, 252, 0.88);
}

.ai-message-text {
  margin: 0.18rem 0 0;
  font-size: 0.72rem;
  line-height: 1.52;
  color: #f2f8ff;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-status {
  margin: 0.52rem 0.72rem 0;
  font-size: 0.68rem;
  color: rgba(193, 222, 248, 0.9);
}

.ai-input-area {
  display: grid;
  gap: 0.42rem;
  padding: 0.54rem 0.72rem 0.72rem;
}

.ai-input {
  width: 100%;
  border: 1px solid rgba(136, 185, 230, 0.42);
  border-radius: 10px;
  padding: 0.46rem 0.56rem;
  background: rgba(5, 17, 33, 0.88);
  color: #f3f8ff;
  resize: vertical;
  min-height: 70px;
  max-height: 140px;
  font-size: 0.74rem;
  line-height: 1.4;
}

.ai-send {
  justify-self: end;
  border: 0;
  border-radius: 9px;
  padding: 0.34rem 0.7rem;
  background: linear-gradient(120deg, #d7eeff 0%, #96cbff 100%);
  color: #103d6c;
  font-size: 0.74rem;
  font-weight: 700;
  cursor: pointer;
}

.ai-send:disabled {
  opacity: 0.66;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .global-ai-assistant {
    right: 0.62rem;
    bottom: 0.62rem;
  }

  .ai-panel {
    width: min(96vw, 390px);
    max-height: min(78vh, 620px);
  }
}
</style>
