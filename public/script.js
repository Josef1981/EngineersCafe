
const socket = io();

const messagesDiv = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const imageInput = document.getElementById('image-input');
const typingIndicator = document.getElementById('typing-indicator');
const activeUsersDiv = document.getElementById('active-users');
const overlay = document.getElementById('overlay');
const usernameInput = document.getElementById('username-input');
const enterChatButton = document.getElementById('enter-chat');
const toggleDarkModeButton = document.getElementById('toggle-dark-mode');

let username = '';

// Handle entering the chat
enterChatButton.addEventListener('click', () => {
    username = usernameInput.value.trim();
    if (username) {
        overlay.style.display = 'none';
        socket.emit('user joined', username);
    }
});

// Handle dark mode toggle
toggleDarkModeButton.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
});

// Load existing messages and active users
socket.on('load messages', ({ messages, activeUsers }) => {
    messages.forEach(({ content, image, username }) => {
        if (content) addMessage(content, username);
        if (image) addImage(image, username);
    });
    updateActiveUsers(activeUsers);
});

// Update active users count
socket.on('update active users', (count) => {
    updateActiveUsers(count);
});

// Listen for new messages
socket.on('chat message', ({ msg, username }) => {
    addMessage(msg, username);
});

// Listen for new images
socket.on('chat image', ({ imagePath, username }) => {
    addImage(imagePath, username);
});

// Handle typing indicator
messageInput.addEventListener('input', () => {
    socket.emit('typing', username);
});

socket.on('typing', (username) => {
    typingIndicator.textContent = `${username} يكتب الآن...`;
    typingIndicator.style.display = 'block';
    setTimeout(() => (typingIndicator.style.display = 'none'), 2000);
});

// Handle form submission
messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = messageInput.value;

    // Send text message if available
    if (msg.trim()) {
        socket.emit('chat message', { msg, username });
        messageInput.value = '';
    }

    // Upload image if selected
    if (imageInput.files.length > 0) {
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        fetch('/upload', {
            method: 'POST',
            body: formData,
        });
        imageInput.value = '';
    }
});

// Add message to the chat
function addMessage(msg, username) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (username === window.username) {
        messageElement.classList.add('sent');
    }
    const usernameElement = document.createElement('span');
    usernameElement.textContent = username;
    usernameElement.classList.add('username');
    messageElement.appendChild(usernameElement);

    const textNode = document.createTextNode(msg);
    messageElement.appendChild(textNode);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Add image to the chat
function addImage(imagePath, username) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    if (username === window.username) {
        messageElement.classList.add('sent');
    }
    const usernameElement = document.createElement('span');
    usernameElement.textContent = username;
    usernameElement.classList.add('username');
    messageElement.appendChild(usernameElement);

    const imageElement = document.createElement('img');
    imageElement.src = imagePath;
    imageElement.style.maxWidth = '100%';
    imageElement.style.margin = '5px 0';
    messageElement.appendChild(imageElement);
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Update active users count
function updateActiveUsers(count) {
    activeUsersDiv.textContent = `المستخدمين النشطين: ${count}`;
}
