const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const readline = require("readline");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let votingOpen = false;
let votes = { A: 0, B: 0, C: 0, D: 0 };
let currentSessionId = null;

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/vote", (req, res) => {
  if (!votingOpen) return res.redirect("/");
  res.sendFile(__dirname + "/public/vote.html");
});

app.get("/success", (req, res) => {
  res.sendFile(__dirname + "/public/success.html");
});

app.get("/results", (req, res) => {
  res.sendFile(__dirname + "/public/results.html");
});

app.get("/current-votes", (req, res) => {
  res.json(votes);
});

io.on("connection", (socket) => {
  // Send voting status and session ID to the client
  socket.emit("votingStatus", { votingOpen, sessionId: currentSessionId });

  socket.on("vote", ({ option, sessionId }) => {
    if (
      votingOpen &&
      votes.hasOwnProperty(option) &&
      sessionId === currentSessionId
    ) {
      votes[option]++;
      io.emit("updateVotes", votes);
      socket.emit("voted");
    }
  });

  socket.on("stopVoting", () => {
    votingOpen = false;
    console.log("Voting has been stopped by results page timer.");
    io.emit("votingStatus", { votingOpen });
  });
});

// Create a readline interface for the terminal input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function handleAdminCommand(command) {
  switch (command.trim()) {
    case "start":
      votingOpen = true;
      votes = { A: 0, B: 0, C: 0, D: 0 };
      currentSessionId = Date.now().toString(); // Generate a unique session ID
      console.log("Votes have been reset.");
      io.emit("updateVotes", votes);
      console.log("Voting has been started.");
      io.emit("votingStatus", { votingOpen, sessionId: currentSessionId });
      io.emit("clearSession"); // Emit event to clear session storage on all clients
      io.emit("reloadPage");
      break;
    case "stop":
      votingOpen = false;
      console.log("Voting has been stopped.");
      io.emit("votingStatus", { votingOpen });
      break;
    case "reset":
      votes = { A: 0, B: 0, C: 0, D: 0 };
      console.log("Votes have been reset.");
      io.emit("updateVotes", votes);
      break;
    case "status":
      console.log(`Voting is currently ${votingOpen ? "open" : "closed"}.`);
      console.log("Current votes:", votes);
      break;
    case "exit":
      console.log("Exiting the server...");
      rl.close();
      process.exit(0);
      break;
    case "help":
      console.log("Admin Panel:");
      console.log(
        "start - start voting\nstop - stop voting\nreset - reset votes\nstatus - check status\nexit - exit",
      );
      break;
    default:
      console.log(
        "Unknown command. Available commands: start, stop, reset, status, exit.",
      );
  }
}

rl.on("line", handleAdminCommand);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

console.log("█████╗ ████████╗ █████╗ ");
console.log("██╔══██╗╚══██╔══╝██╔══██╗");
console.log("███████║   ██║   ███████║");
console.log("██╔══██║   ██║   ██╔══██║");
console.log("██║  ██║   ██║   ██║  ██║");
console.log("╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝ By NEJAN");
