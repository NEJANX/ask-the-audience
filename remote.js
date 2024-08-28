const { exit } = require("process");

(async () => {
  const chalk = (await import("chalk")).default;
  const io = require("socket.io-client");
  const readline = require('readline');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const socket = io('http://localhost:3000'); 

  const colors = [
    chalk.red,
    chalk.green,
    chalk.yellow,
    chalk.blue,
    chalk.magenta,
    chalk.cyan,
    chalk.white,
    chalk.black,
    chalk.gray,
    chalk.grey,
    chalk.redBright,
    chalk.greenBright,
    chalk.yellowBright,
    chalk.blueBright,
    chalk.magentaBright,
    chalk.cyanBright,
    chalk.whiteBright
  ];

  const getRandomColor = () => {
    const randomIndex = Math.floor(Math.random() * colors.length);
    return colors[randomIndex];
  };

  socket.on('connect', () => {
    socket.emit('remoteAlive');
    console.log(chalk.green('Connected to server'));

    const promptForCommand = () => {
      rl.question(getRandomColor()('> '), (command) => {
        if (command=="start") {
          let currentQuestion;
          let currentAnswers = {};

          rl.question(chalk.yellow("Enter the question: "), (question) => {
            currentQuestion = question;

            rl.question(chalk.yellow("Enter answer A: "), (answerA) => {
              currentAnswers.A = answerA;

              rl.question(chalk.yellow("Enter answer B: "), (answerB) => {
                currentAnswers.B = answerB;

                rl.question(chalk.yellow("Enter answer C: "), (answerC) => {
                  currentAnswers.C = answerC;

                  rl.question(chalk.yellow("Enter answer D: "), (answerD) => {
                    currentAnswers.D = answerD;

                    socket.emit("remote-questionUpdate", currentQuestion, currentAnswers);

                    promptForCommand();
                  });
                });
              });
            });
          });
        promptForCommand();
        }else{
          socket.emit('adminCommand', command);
        promptForCommand();
        }
        
        promptForCommand();
      });
    };

    promptForCommand();
  });
  
  socket.on(`Current votes: `, (votes) => {
    console.log(chalk.yellow("Current votes:"), votes);
  });

  socket.on('disconnect', () => {
    console.log(chalk.red('\nDisconnected from server'));
    process.exit();
  });

  socket.on('toRemoteLog-votes_reset', () => {
    console.log(chalk.blue("Votes have been reset."));
  });

  socket.on('toRemoteLog-votes_start', () => {
    console.log(chalk.green("Voting has been started."));
  });

  socket.on('toRemoteLog-votes_stop', () => {
    console.log(chalk.red("Voting has been stopped."));
  });

  socket.on('toRemoteLog-results_page_ready', () => {
    console.log(chalk.cyan("Results page set to ready"));
  });

  socket.on('toRemoteLog-results_page_notready', () => {
    console.log(chalk.cyan("Results page set to not ready"));
  });

  socket.on('reloadResults', () => {
    console.log(chalk.cyan("Reloading results page..."));
  });

  socket.on('toRemoteLog-cmd_error', () => {
    console.log(
      chalk.red("Unknown command."),
    );
  });

  socket.on('toRemoteLog-votes_stop-respage', () => {
    console.log(
      chalk.red("Voting has been stopped by results page timer."),
    );
  });

  console.log(chalk.magentaBright(" █████     ████████     █████     "));
  console.log(chalk.magentaBright("██   ██       ██       ██   ██    "));
  console.log(chalk.magentaBright("███████       ██       ███████    "));
  console.log(chalk.magentaBright("██   ██       ██       ██   ██    "));
  console.log(chalk.magentaBright("██   ██ ██    ██    ██ ██   ██ ██ By NEJAN"));
})();