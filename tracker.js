(async () => {
  const io = require("socket.io-client");

  // Dynamically import chalk
  const chalk = (await import("chalk")).default;

  const socket = io("http://ata.nejan.serendibytes.com"); // Ensure this matches the main server's URL and port

  // Colors for different events
  const newConnectionColor = chalk.green;
  const disconnectionColor = chalk.red;
  const pageVisitColor = chalk.blue;

  // Listen for new connections
  socket.on("newConnection", (clientIp) => {
    const ip = clientIp.startsWith("::ffff:")
      ? clientIp.split("::ffff:")[1]
      : clientIp;
    console.log(newConnectionColor(`IP: ${ip} is connected`));
  });
  socket.on("remoteAlive1", () => {
    console.log(newConnectionColor(`Remote is connected`));
  });

  // Listen for disconnections
  socket.on("userDisconnected", (clientIp) => {
    const ip = clientIp.startsWith("::ffff:")
      ? clientIp.split("::ffff:")[1]
      : clientIp;
    console.log(disconnectionColor(`IP: ${ip} is disconnected`));
  });

  // Listen for votes
  socket.on("voteLog", (option, clientIp) => {
    console.log(chalk.yellow(`IP: ${clientIp} voted for ${option}`));
  });

  // Listen for page visits
  socket.on("userPageVisit", ({ ip, page }) => {
    const formattedIp = ip.startsWith("::ffff:") ? ip.split("::ffff:")[1] : ip;
    console.log(pageVisitColor(`IP: ${formattedIp} is at ${page}`));
  });

  console.log(chalk.cyan(" █████     ████████     █████     "));
  console.log(chalk.cyan("██   ██       ██       ██   ██    "));
  console.log(chalk.cyan("███████       ██       ███████    "));
  console.log(chalk.cyan("██   ██       ██       ██   ██    "));
  console.log(chalk.cyan("██   ██ ██    ██    ██ ██   ██ ██ By NEJAN"));

  console.log(chalk.magenta("ATA Tracker Daemon is running...\n"));
})();
