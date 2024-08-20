(async () => {
  const chalk = (await import("chalk")).default;
  const express = require("express");
  const http = require("http");
  const socketIo = require("socket.io");
  const readline = require("readline");
  // const chalk = require("chalk");

  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server);

  let votingOpen = false;
  let votes = { A: 0, B: 0, C: 0, D: 0 };
  let currentSessionId = null;
  const usersVoted = new Set();

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
    const clientIp = socket.request.connection.remoteAddress.startsWith(
      "::ffff:",
    )
      ? socket.request.connection.remoteAddress.split("::ffff:")[1]
      : socket.request.connection.remoteAddress;

    io.emit("newConnection", clientIp);

    // Emit event for each page visit
    socket.on("pageVisit", (page) => {
      io.emit("userPageVisit", { ip: clientIp, page });
    });

    // Listen for disconnection
    socket.on("disconnect", () => {
      io.emit("userDisconnected", clientIp);
      // console.log(chalk.yellow(`User disconnected: ${clientIp}`));
    });

    // Send voting status and session ID to the client
    socket.emit("votingStatus", { votingOpen, sessionId: currentSessionId });

    socket.on("vote", ({ option, sessionId }) => {
      if (
        votingOpen &&
        votes.hasOwnProperty(option) &&
        sessionId === currentSessionId
      ) {
        const userIdentifier = `${clientIp}-${sessionId}`;

        // Check if the user has already voted
        if (usersVoted.has(userIdentifier)) {
          socket.emit("voted");
          return;
        }

        votes[option]++;
        usersVoted.add(userIdentifier); // Mark user as voted
        io.emit("updateVotes", votes);
        socket.emit("voted");
        // console.log(chalk.green(`Vote received: ${option} from ${clientIp}`));
        io.emit("voteLog",option, clientIp);
      }
    });

    socket.on("stopVoting", () => {
      votingOpen = false;
      console.log(chalk.red("Voting has been stopped by results page timer."));
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
        console.log(chalk.blue("Votes have been reset."));
        io.emit("updateVotes", votes);
        console.log(chalk.green("Voting has been started."));
        io.emit("votingStatus", { votingOpen, sessionId: currentSessionId });
        io.emit("clearSession"); // Emit event to clear session storage on all clients
        io.emit("restartTimer");
        usersVoted.clear(); // Clear the set of users who have voted
        break;
      case "stop":
        votingOpen = false;
        console.log(chalk.red("Voting has been stopped."));
        io.emit("votingStatus", { votingOpen });
        break;
      case "reset":
        votes = { A: 0, B: 0, C: 0, D: 0 };
        console.log(chalk.blue("Votes have been reset."));
        io.emit("updateVotes", votes);
        break;
      case "status":
        console.log(
          chalk.yellow(
            `Voting is currently ${votingOpen ? "open" : "closed"}.`,
          ),
        );
        console.log(chalk.yellow("Current votes:"), votes);
        break;
      case "exit":
        console.log(chalk.red("Exiting the server..."));
        rl.close();
        process.exit(0);
        break;
      case "reload results":
        console.log(chalk.cyan("Reloading results page..."));
        io.emit("reloadResults");
        break;
      case "help":
        console.log(chalk.green("Admin Panel:"));
        console.log(
          chalk.green(
            "start - start voting\nstop - stop voting\nreset - reset votes\nstatus - check status\nexit - exit",
          ),
        );
        break;
      default:
        console.log(
          chalk.red(
            "Unknown command. Available commands: start, stop, reset, status, reload <page>, exit.",
          ),
        );
    }
  }

  rl.on("line", handleAdminCommand);

  const PORT = 3000;
  // const PORT = process.env.PORT;

  server.listen(PORT, () => {
    console.log(chalk.magenta(`Server running on port ${PORT}`));
  });

  console.log(chalk.blue(" █████     ████████     █████     "));
  console.log(chalk.blue("██   ██       ██       ██   ██    "));
  console.log(chalk.blue("███████       ██       ███████    "));
  console.log(chalk.blue("██   ██       ██       ██   ██    "));
  console.log(chalk.blue("██   ██ ██    ██    ██ ██   ██ ██ By NEJAN"));
})();
