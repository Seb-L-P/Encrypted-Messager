// Get references to DOM elements
const terminalDiv = document.getElementById('terminal');
const promptText = document.getElementById('prompt-text');
const hiddenInput = document.getElementById('hidden-input');

let currentLine = '';       // Stores user input on the current line
let commandHistory = [];    // For command history navigation
let historyIndex = 0;

const socket = io();
let isLoggedIn = false;
let username = null;

// Focus the hidden input to capture key events
hiddenInput.focus();

// Render the terminal prompt (the blinking caret is provided via CSS on #prompt-text::after)
function renderTerminal() {
  promptText.textContent = `> ${currentLine}`;
}

// Parse and handle a command (or, if logged in, send it as a message)
async function handleCommand(command) {
  // If the user is logged in, we normally treat any text as a message.
  // However, if the user types a command starting with a slash ("/"), we parse it as a command.
  if (isLoggedIn) {
    if (command.startsWith('/')) {
      const actualCommand = command.slice(1).trim();
      const parts = actualCommand.split(' ');
      const mainCmd = parts[0].toLowerCase();
      switch (mainCmd) {
        case 'help':
          printToTerminal(`Commands available while chatting:
  /help  - Show this help message`);
          break;
        default:
          printToTerminal(`Unknown command: ${mainCmd}`);
      }
    } else if (command.trim() !== '') {
      // Send any non-empty text as a chat message
      socket.emit('message', command);
    }
    return;
  }
  
  // If not logged in, process commands for signing up and logging in.
  const parts = command.split(' ');
  const mainCmd = parts[0].toLowerCase();
  switch (mainCmd) {
    case 'signup':
      await handleSignup(parts.slice(1));
      break;
    case 'login':
      await handleLogin(parts.slice(1));
      break;
    case 'help':
      printToTerminal(`Available commands:
signup username=xxx password=yyy
login username=xxx password=yyy
(Once logged in, simply type your message or type "/help" for chat commands)`);
      break;
    default:
      printToTerminal(`Unknown command: ${mainCmd}
Type "help" for a list of available commands.`);
  }
}

// Signup command handler
async function handleSignup(args) {
  const { user, pass } = parseArgs(args);
  if (!user || !pass) {
    printToTerminal('Usage: signup username=xxx password=yyy');
    return;
  }
  try {
    const response = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (response.ok) {
      printToTerminal('Signup successful. You can now login.');
    } else {
      printToTerminal('Signup failed. That user might already exist.');
    }
  } catch (error) {
    printToTerminal('Error signing up.');
    console.error(error);
  }
}

// Login command handler
async function handleLogin(args) {
  const { user, pass } = parseArgs(args);
  if (!user || !pass) {
    printToTerminal('Usage: login username=xxx password=yyy');
    return;
  }
  try {
    const response = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user, password: pass })
    });
    if (response.ok) {
      isLoggedIn = true;
      username = user;
      printToTerminal(`Login successful. Welcome, ${user}!`);
      socket.emit('userConnected', username);
    } else {
      printToTerminal('Invalid credentials. Try again.');
    }
  } catch (error) {
    printToTerminal('Error logging in.');
    console.error(error);
  }
}

// Simple argument parser for commands like "username=xxx password=yyy"
function parseArgs(args) {
  const result = {};
  args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key === 'username') result.user = value;
    if (key === 'password') result.pass = value;
  });
  return result;
}

// Append text to the terminal output (on a new line)
function printToTerminal(text) {
  terminalDiv.innerHTML += `\n${text}`;
}

// Listen for messages from the server via Socket.IO
socket.on('message', (msg) => {
  printToTerminal(msg);
});

// Handle keydown events for capturing input
document.addEventListener('keydown', (e) => {
  hiddenInput.focus();

  if (e.key === 'Enter') {
    const command = currentLine.trim();
    commandHistory.push(command);
    historyIndex = commandHistory.length;
    handleCommand(command);
    currentLine = '';
    e.preventDefault();
  } else if (e.key === 'Backspace') {
    currentLine = currentLine.slice(0, -1);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    if (historyIndex > 0) {
      historyIndex--;
      currentLine = commandHistory[historyIndex] || '';
    }
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      currentLine = commandHistory[historyIndex] || '';
    } else {
      currentLine = '';
    }
    e.preventDefault();
  } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    currentLine += e.key;
  }

  renderTerminal();
});

// Initial render of the prompt
renderTerminal();
