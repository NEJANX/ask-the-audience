(async () => {
  const chalk = (await import("chalk")).default;
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
  const usersVoted = new Set();

  let currentQuestion = "";
  let currentAnswers = { A: "", B: "", C: "", D: "" };

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
    let clientIp;

    const forwarded = socket.handshake.headers["x-forwarded-for"];

    if (forwarded) {
      clientIp = forwarded.split(",")[0];
    } else {
      clientIp = socket.request.connection.remoteAddress.startsWith("::ffff:")
        ? socket.request.connection.remoteAddress.split("::ffff:")[1]
        : socket.request.connection.remoteAddress;
    }

    io.emit("newConnection", clientIp);

    socket.on("pageVisit", (page) => {
      io.emit("userPageVisit", { ip: clientIp, page });
    });

    socket.on("disconnect", () => {
      io.emit("userDisconnected", clientIp);
    });

    socket.emit("votingStatus", { votingOpen, sessionId: currentSessionId });

    socket.on("vote", ({ option, sessionId }) => {
      if (
        votingOpen &&
        votes.hasOwnProperty(option) &&
        sessionId === currentSessionId
      ) {
        const userIdentifier = `${clientIp}-${sessionId}`;

        if (usersVoted.has(userIdentifier)) {
          socket.emit("voted");
          return;
        }

        votes[option]++;
        usersVoted.add(userIdentifier);
        io.emit("updateVotes", votes);
        socket.emit("voted");
        io.emit("voteLog", option, clientIp);
      }
    });

    socket.on("stopVoting", () => {
      votingOpen = false;
      console.log(chalk.red("Voting has been stopped by results page timer."));
      io.emit("votingStatus", { votingOpen });
      io.emit("toRemoteLog-votes_stop-respage");
    });

    socket.on("adminCommand", (command) => {
      handleAdminCommand(command);
    });

    socket.on("remoteAlive", () => {
      socket.emit('remoteAlive1');
    });

    // let currentQuestion;
    // let currentAnswers = {};

    socket.on("remote-questionUpdate", (currentQuestion, currentAnswers) => {
        // let currentQuestion = question;
        // let currentAnswers = answers;

        votingOpen = true;
        votes = { A: 0, B: 0, C: 0, D: 0 };
        currentSessionId = Date.now().toString();

        io.emit("hideReady");
        io.emit("toRemoteLog-votes_reset");
        console.log(chalk.blue("Votes have been reset."));
        io.emit("updateVotes", votes);
        io.emit("clearSession");
        usersVoted.clear();

        io.emit("questionUpdate", {
          question: currentQuestion,
          answers: currentAnswers,
        });
        
        setTimeout(() => {
          io.emit("restartTimer");
          io.emit("toRemoteLog-votes_start");
          console.log(chalk.green("Voting has been started."));
          io.emit("votingStatus", {
            votingOpen,
            sessionId: currentSessionId,
          });
        }, 10000);
    });
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function handleAdminCommand(command) {
    const [cmd, ...args] = command.trim().split(" ");

    switch (cmd) {
      case "start":
        let currentQuestion;
        let currentAnswers = {};

        votingOpen = true;
        votes = { A: 0, B: 0, C: 0, D: 0 };
        currentSessionId = Date.now().toString();

        // To Remote
        io.emit("toRemoteLog-votes_reset");
        io.emit("toRemoteLog-votes_start");

        io.emit("hideReady");
        console.log(chalk.blue("Votes have been reset."));
        io.emit("updateVotes", votes);
        console.log(chalk.green("Voting has been started."));
        io.emit("votingStatus", {
          votingOpen,
          sessionId: currentSessionId,
        });
        io.emit("clearSession");
        usersVoted.clear();

        io.emit("questionUpdate", {
          question: currentQuestion,
          answers: currentAnswers,
        });

        setTimeout(() => {
          io.emit("restartTimer");
        }, 10000);
        break;

      case "stop":
        votingOpen = false;
        console.log(chalk.red("Voting has been stopped."));
        io.emit("votingStatus", { votingOpen });
        io.emit("toRemoteLog-votes_stop");
        break;

      case "ready":
        console.log(chalk.cyan("Results page set to ready"));
        io.emit("toRemoteLog-results_page_ready");
        io.emit("showReady");
        break;

      case "notready":
        console.log(chalk.cyan("Results page set to not ready"));
        io.emit("toRemoteLog-results_page_notready");
        io.emit("hideReady");
        break;

      case "reset":
        votes = { A: 0, B: 0, C: 0, D: 0 };
        console.log(chalk.blue("Votes have been reset."));
        io.emit("toRemoteLog-votes_reset");
        io.emit("updateVotes", votes);
        break;

      case "status":
        console.log(
          chalk.yellow(
            `Voting is currently ${votingOpen ? "open" : "closed"}.`,
          ),
        );
        console.log(chalk.yellow("Current votes:"), votes);

        io.emit(`Voting is currently ${votingOpen ? "open" : "closed"}.`);
        io.emit(`Current votes: `, votes);
        break;

      case "exit":
        console.log(chalk.red("Exiting the server..."));
        rl.close();
        process.exit(0);
        break;

      case "reload":
        console.log(chalk.cyan("Reloading results page..."));
        io.emit("reloadResults");
        break;

      case "help":
        console.log(chalk.green("Admin Panel:"));
        console.log(
          chalk.green(
            "start <question> <answer A> <answer B> <answer C> <answer D> - start voting\nstop - stop voting\nreset - reset votes\nstatus - check status\nexit - exit",
          ),
        );
        break;

      default:
        console.log(
          chalk.red("Unknown command. Type 'help' for a list of commands."),
        );
        io.emit("toRemoteLog-cmd_error");
    }
  }

  rl.on("line", handleAdminCommand);

  const PORT = 3000;
  const HOST = "13.229.128.209";
  server.listen(PORT, () => {
    console.log(chalk.magenta(`Server running on port ${PORT}`));
  });

  console.log(chalk.blue(" █████     ████████     █████     "));
  console.log(chalk.blue("██   ██       ██       ██   ██    "));
  console.log(chalk.blue("███████       ██       ███████    "));
  console.log(chalk.blue("██   ██       ██       ██   ██    "));
  console.log(chalk.blue("██   ██ ██    ██    ██ ██   ██ ██ By NEJAN"));
})();
