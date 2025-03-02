const socket = io();

async function signup() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const response = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (response.ok) alert('Signed up! Now log in.');
  else alert('Signup failed');
}

async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const response = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (response.ok) {
    document.getElementById('auth').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    socket.emit('userConnected', username);
  } else {
    alert('Login failed');
  }
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value;
  if (message) {
    socket.emit('message', message);
    input.value = '';
  }
}

socket.on('message', (msg) => {
  const messages = document.getElementById('messages');
  messages.innerHTML += `<p>${msg}</p>`;
  messages.scrollTop = messages.scrollHeight;
});