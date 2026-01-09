import { marked } from 'marked';
import hljs from 'highlight.js';

interface Account {
  id: string;
  name: string;
  token: string;
  isMain?: boolean;
}

interface IElectronAPI {
  getAccounts: () => Promise<Account[]>;
  getCurrentAccountId: () => Promise<string | undefined>;
  switchAccount: (id: string) => Promise<boolean>;
  removeAccount: (id: string) => Promise<Account[]>;
  openAuthWindow: () => Promise<void>;
  sendMessage: (payload: any) => Promise<void>;
  onMessageStream: (callback: (chunk: string) => void) => void;
  onMessageThinking: (callback: (chunk: string) => void) => void;
  onMessageComplete: (callback: () => void) => void;
  onError: (callback: (error: string) => void) => void;
  onAuthSuccess: (callback: () => void) => void;
  onAccountsUpdated: (callback: (accounts: Account[]) => void) => void;
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
const apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
const messageInput = document.getElementById('message-input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('send-btn')!;
const messagesContainer = document.getElementById('messages-container')!;

// Sidebar Elements
const sidebar = document.getElementById('sidebar')!;
const menuBtn = document.getElementById('menu-btn');
const closeSidebarBtn = document.getElementById('close-sidebar-btn')!;
const addAccountBtn = document.getElementById('add-account-btn')!;
const accountListContainer = document.getElementById('account-list')!;

// Change UI Text
if (document.querySelector('#setup-screen h1')) {
  document.querySelector('#setup-screen h1')!.textContent = 'Login to DeepSeek';
}
if (document.querySelector('#setup-screen p')) {
  document.querySelector('#setup-screen p')!.textContent = 'Click below to login via browser';
}
if (apiKeyInput) {
  apiKeyInput.style.display = 'none'; // Hide input
}
if (loginBtn) {
  loginBtn.textContent = 'Open Login Window';
}

// Setup
async function init() {
  await refreshAccounts();
}

async function refreshAccounts() {
  try {
    const accounts = await window.electronAPI.getAccounts();
    const currentId = await window.electronAPI.getCurrentAccountId();

    renderAccountList(accounts, currentId);

    if (accounts.length > 0) {
      showChat();
    } else {
      showSetup();
    }
  } catch (err) {
    console.error('Failed to refresh accounts:', err);
  }
}

function renderAccountList(accounts: Account[], currentId: string | undefined) {
  if (!accountListContainer) return;
  accountListContainer.innerHTML = '';

  accounts.forEach((acc) => {
    const item = document.createElement('div');
    item.className = `account-item ${acc.id === currentId ? 'active' : ''}`;

    const info = document.createElement('div');
    info.className = 'account-info';
    info.innerHTML = `<span class="account-name">${acc.name}</span>`;

    const actions = document.createElement('div');
    actions.className = 'account-actions';

    const removeBtn = document.createElement('button');
    removeBtn.innerText = '✕';
    removeBtn.title = 'Remove Account';
    removeBtn.onclick = async (e) => {
      e.stopPropagation();
      if (confirm(`Remove account ${acc.name}?`)) {
        await window.electronAPI.removeAccount(acc.id);
        await refreshAccounts();
      }
    };

    actions.appendChild(removeBtn);

    item.appendChild(info);
    item.appendChild(actions);

    item.onclick = async () => {
      if (acc.id !== currentId) {
        await window.electronAPI.switchAccount(acc.id);
        await refreshAccounts();
        // Clear chat
        conversation = [];
        messagesContainer.innerHTML = '';
      }
    };

    accountListContainer.appendChild(item);
  });
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

// Sidebar Logic
function toggleSidebar() {
  sidebar.classList.toggle('hidden');
}

if (menuBtn) {
  menuBtn.addEventListener('click', toggleSidebar);
}
if (closeSidebarBtn) {
  closeSidebarBtn.addEventListener('click', toggleSidebar);
}
if (addAccountBtn) {
  addAccountBtn.addEventListener('click', async () => {
    await window.electronAPI.openAuthWindow();
  });
}

// Event Listeners
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    await window.electronAPI.openAuthWindow();
  });
}

// Auth Success & Updates Listener
if (window.electronAPI.onAuthSuccess) {
  window.electronAPI.onAuthSuccess(async () => {
    await refreshAccounts();
  });
}

if (window.electronAPI.onAccountsUpdated) {
  window.electronAPI.onAccountsUpdated((accounts) => {
    refreshAccounts();
  });
}

if (sendBtn) {
  sendBtn.addEventListener('click', sendMessage);
}

if (messageInput) {
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

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
    model: 'deepseek-chat',
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
