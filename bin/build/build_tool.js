const chalk = require('chalk');

const header = chalk.bold.cyan;
const error = chalk.bold.red;
const successPrint = chalk.green;

class BuildProcess {
  constructor() {
    this._buildSteps = [];
  }

  registerBuildStep(buildStep) {
    this._buildSteps.push(buildStep);
  }

  async run(params) {
    let stepNumber = 1;

    for(let step of this._buildSteps) {
      console.log(header(`(${stepNumber}): ` + step.name));
      console.log();

      const { success, message } = await (step.execute.call(this, params));

      if(!success) {
        if(message) {
          console.log(error(message))
        } else {
          console.log(error(step.name + ' failed!'));
        }
        break;
      } else {
        if(message) {
          console.log(successPrint(message));
          console.log();
        }
      }

      stepNumber++;
    }
  }
}

module.exports = {
  BuildProcess
};