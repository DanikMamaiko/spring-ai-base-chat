class ChatApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.clearButton = document.getElementById('clearButton');
        this.streamToggle = document.getElementById('streamToggle');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.statusText = document.getElementById('statusText');

        this.isStreaming = true;
        this.isProcessing = false;

        this.init();
    }

    init() {
        this.setInitialTime();
        this.bindEvents();
        this.focusInput();
    }

    setInitialTime() {
        const timeElement = document.getElementById('initialTime');
        timeElement.textContent = this.getCurrentTime();
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        this.clearButton.addEventListener('click', () => this.clearChat());
        this.streamToggle.addEventListener('change', (e) => {
            this.isStreaming = e.target.checked;
        });

        // Enable/disable send button based on input
        this.messageInput.addEventListener('input', () => {
            this.sendButton.disabled = !this.messageInput.value.trim() || this.isProcessing;
        });
    }

    focusInput() {
        this.messageInput.focus();
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.sendButton.disabled = true;
        this.isProcessing = true;

        this.addTypingIndicator();

        try {
            if (this.isStreaming) {
                await this.streamMessage(message);
            } else {
                await this.fetchMessage(message);
            }
        } catch (error) {
            this.addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'bot');
            console.error('Chat error:', error);
        } finally {
            this.removeTypingIndicator();
            this.isProcessing = false;
            this.sendButton.disabled = false;
            this.focusInput();
        }
    }

    async streamMessage(question) {
        const response = await fetch(`/ask-stream?question=${encodeURIComponent(question)}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let botMessageElement = this.createBotMessageElement('');
        this.chatMessages.appendChild(botMessageElement);

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const messageText = botMessageElement.querySelector('.message-text');
            messageText.textContent += chunk;

            // Auto-scroll to bottom
            botMessageElement.scrollIntoView({ behavior: 'smooth' });
        }

        this.addMessageTime(botMessageElement);
    }

    async fetchMessage(question) {
        const response = await fetch(`/ask?question=${encodeURIComponent(question)}`);
        const answer = await response.text();
        this.removeTypingIndicator();
        this.addMessage(answer, 'bot');
    }

    addMessage(text, sender) {
        const messageElement = this.createMessageElement(text, sender);
        this.chatMessages.appendChild(messageElement);
        messageElement.scrollIntoView({ behavior: 'smooth' });
    }

    createMessageElement(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.textContent = text;

        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = this.getCurrentTime();

        content.appendChild(textElement);
        content.appendChild(timeElement);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        return messageDiv;
    }

    createBotMessageElement(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const textElement = document.createElement('div');
        textElement.className = 'message-text';
        textElement.textContent = text;

        content.appendChild(textElement);

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        return messageDiv;
    }

    addMessageTime(messageElement) {
        const timeElement = document.createElement('div');
        timeElement.className = 'message-time';
        timeElement.textContent = this.getCurrentTime();
        messageElement.querySelector('.message-content').appendChild(timeElement);
    }

    addTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const content = document.createElement('div');
        content.className = 'message-content typing-indicator';

        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            content.appendChild(dot);
        }

        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        this.chatMessages.appendChild(typingDiv);
        typingDiv.scrollIntoView({ behavior: 'smooth' });
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    clearChat() {
        // Keep only the first bot message
        const messages = this.chatMessages.querySelectorAll('.message');
        messages.forEach((message, index) => {
            if (index > 0) {
                message.remove();
            }
        });

        // Update time of initial message
        const initialTime = document.getElementById('initialTime');
        if (initialTime) {
            initialTime.textContent = this.getCurrentTime();
        }
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setStatus(online) {
        if (online) {
            this.statusIndicator.style.background = '#10b981';
            this.statusText.textContent = 'Online';
        } else {
            this.statusIndicator.style.background = '#ef4444';
            this.statusText.textContent = 'Offline';
        }
    }
}

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});

// Handle connection status
window.addEventListener('online', () => {
    document.getElementById('statusIndicator').style.background = '#10b981';
    document.getElementById('statusText').textContent = 'Online';
});

window.addEventListener('offline', () => {
    document.getElementById('statusIndicator').style.background = '#ef4444';
    document.getElementById('statusText').textContent = 'Offline';
});