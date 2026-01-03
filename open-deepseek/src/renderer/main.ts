import { marked } from 'marked';
import hljs from 'highlight.js';

// Define types locally since this file is excluded from root tsconfig
interface IElectronAPI {
  getApiKey: () => Promise<string | undefined>;
  saveApiKey: (key: string) => Promise<boolean>;
  openAuthWindow: () => Promise<void>;
  sendMessage: (payload: any) => Promise<void>;
  onMessageStream: (callback: (chunk: string) => void) => void;
  onMessageThinking: (callback: (chunk: string) => void) => void;
  onMessageComplete: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  onAuthSuccess: (callback: () => void) => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}

// State
let conversation: { role: 'user' | 'assistant'; content: string }[] = [];
let currentStreamingMessage = '';
let currentThinking = '';
let isThinking = false;
let isGenerating = false;

// DOM Elements
const setupScreen = document.getElementById('setup-screen')!;
const chatScreen = document.getElementById('chat-screen')!;
const loginBtn = document.getElementById('save-key-btn')!;
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement; // Re-purposed or hidden
const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn')!;
const messagesContainer = document.getElementById('messages-container')!;

// Change UI Text
document.querySelector('#setup-screen h1')!.textContent = 'Login to DeepSeek';
document.querySelector('#setup-screen p')!.textContent = 'Click below to login via browser';
apiKeyInput.style.display = 'none'; // Hide input
loginBtn.textContent = 'Open Login Window';

// Setup
async function init() {
  const existingKey = await window.electronAPI.getApiKey();
  if (existingKey) {
    showChat();
  } else {
    showSetup();
  }
}

function showSetup() {
  setupScreen.classList.remove('hidden');
  chatScreen.classList.add('hidden');
}

function showChat() {
  setupScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');
  messageInput.focus();
}

// Event Listeners
loginBtn.addEventListener('click', async () => {
  // Open Auth Window
  await window.electronAPI.openAuthWindow();
});

// Auth Success Listener
window.electronAPI.onAuthSuccess(() => {
  showChat();
});

sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isGenerating) return;

  // UI Updates
  messageInput.value = '';
  appendMessage('user', text);
  isGenerating = true;

  // Add to history
  conversation.push({ role: 'user', content: text });

  // Prepare for bot response
  currentStreamingMessage = '';
  currentThinking = '';
  isThinking = false;

  // Create placeholder for bot message
  createBotMessagePlaceholder();

  // Send to Main
  window.electronAPI.sendMessage({
    model: 'deepseek-chat', // or deepseek-reasoner
    messages: conversation,
    stream: true,
  });
}

// IPC Handlers
window.electronAPI.onMessageThinking((chunk: string) => {
  if (!isThinking) {
    isThinking = true;
    // Render thinking block start if needed
  }
  currentThinking += chunk;
  updateBotMessageThinking(currentThinking);
});

window.electronAPI.onMessageStream((chunk: string) => {
  currentStreamingMessage += chunk;
  updateBotMessageContent(currentStreamingMessage);
});

window.electronAPI.onMessageComplete(() => {
  isGenerating = false;
  conversation.push({ role: 'assistant', content: currentStreamingMessage });
});

window.electronAPI.onError((error: string) => {
  alert(error);
  isGenerating = false;
});

// DOM Helpers
function highlightBlock(element: HTMLElement) {
  element.querySelectorAll('pre code').forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}

function appendMessage(role: string, text: string) {
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `
    <div class="message-role">${role}</div>
    <div class="message-content">${marked.parse(text)}</div>
  `;
  messagesContainer.appendChild(div);
  highlightBlock(div);
  scrollToBottom();
}

let currentBotMessageDiv: HTMLElement | null = null;
let currentThinkingDiv: HTMLElement | null = null;

function createBotMessagePlaceholder() {
  const div = document.createElement('div');
  div.className = 'message';
  div.innerHTML = `
    <div class="message-role">assistant</div>
    <div class="message-content">
       <div class="thinking-block hidden"></div>
       <div class="markdown-body"></div>
    </div>
  `;
  messagesContainer.appendChild(div);
  currentBotMessageDiv = div;
  currentThinkingDiv = div.querySelector('.thinking-block') as HTMLElement;
  scrollToBottom();
  return div;
}

function updateBotMessageThinking(text: string) {
  if (currentThinkingDiv) {
    currentThinkingDiv.classList.remove('hidden');
    currentThinkingDiv.innerText = text; // Raw text for thinking
    scrollToBottom();
  }
}

function updateBotMessageContent(text: string) {
  if (currentBotMessageDiv) {
    const contentDiv = currentBotMessageDiv.querySelector('.markdown-body')!;
    contentDiv.innerHTML = marked.parse(text) as string;
    highlightBlock(contentDiv as HTMLElement);
    scrollToBottom();
  }
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

init();
