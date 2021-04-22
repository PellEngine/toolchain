const exec = require('child_process').exec;
const chalk = require('chalk');

const errorChalk = chalk.red;

module.exports = function(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if(error) {
        console.log(errorChalk(error));
      }

      resolve(stdout ? stdout : stderr);
    });
  });
}