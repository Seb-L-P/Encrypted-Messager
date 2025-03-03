document.addEventListener('DOMContentLoaded', () => {
  // Get references to DOM elements
  const outputDiv = document.getElementById('output');
  const currentLineSpan = document.getElementById('current-line');
  const hiddenInput = document.getElementById('hidden-input');

  let currentLine = '';       // The text the user is currently typing
  let commandHistory = [];    // For navigating previous commands
  let historyIndex = 0;

  const socket = io();
  let isLoggedIn = false;
  let username = null;

  // Always keep the hidden input focused
  hiddenInput.focus();
  hiddenInput.addEventListener('blur', () => {
    hiddenInput.focus();
  });

  // Update the displayed current line (live input)
  function renderTerminal() {
    currentLineSpan.textContent = currentLine;
  }

  // Append a new line of text to the output area and scroll down
  function printToTerminal(text) {
    outputDiv.innerHTML += `<div>${text}</div>`;
    outputDiv.scrollTop = outputDiv.scrollHeight;
  }

  // Process a command (or message) when Enter is pressed
  async function handleCommand(command) {
    const trimmed = command.trim();
    if (!trimmed) return;

    // Universal commands (available regardless of login state)
    if (trimmed.toLowerCase() === 'clear') {
      outputDiv.innerHTML = '';
      currentLine = '';
      renderTerminal();
      return;
    }

    if (trimmed.toLowerCase() === 'logout') {
      if (isLoggedIn) {
        isLoggedIn = false;
        username = null;
        printToTerminal('You have been logged out.');
      } else {
        printToTerminal('You are not logged in!');
      }
      return;
    }

    // If logged in, treat input as chat unless it begins with a slash (for chat commands)
    if (isLoggedIn) {
      if (trimmed.startsWith('/')) {
        const actualCommand = trimmed.slice(1).toLowerCase();
        if (actualCommand === 'help') {
          printToTerminal(`na cmon bro u know better than this`);
        } else {
          printToTerminal(`What the fuck is ${actualCommand}`);
        }
      } else {
        // Send text as a chat message
        socket.emit('message', trimmed);
      }
      return;
    }

    // If not logged in, process signup, login, or help commands
    const parts = trimmed.split(' ');
    const mainCmd = parts[0].toLowerCase();
    switch (mainCmd) {
      case 'signup':
        await handleSignup(parts.slice(1));
        break;
      case 'login':
        await handleLogin(parts.slice(1));
        break;
      case 'help':
        printToTerminal(`you is not real bruh quit askin for help`);
        break;
      default:
        printToTerminal(`What is dis shit: ${mainCmd}
Type "help" for available commands I swear it'll be helpful.`);
    }
  }

  // Handle signup by calling the /signup API endpoint
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

  // Handle login by calling the /login API endpoint
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

  // Parse arguments in the form "username=xxx password=yyy"
  function parseArgs(args) {
    const result = {};
    args.forEach(arg => {
      const [key, value] = arg.split('=');
      if (key === 'username') result.user = value;
      if (key === 'password') result.pass = value;
    });
    return result;
  }

  // Listen for incoming messages from the server via Socket.IO
  socket.on('message', (msg) => {
    printToTerminal(msg);
  });

  // Capture keydown events for user input
  document.addEventListener('keydown', (e) => {
    hiddenInput.focus(); // Keep hidden input focused

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
});
