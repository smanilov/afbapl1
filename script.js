import { init } from './init.js';
import { writeLine } from './io_area.js';
import { Afbpl1Interpreter, hasCompletedSuccessfully, waitingForInput } from './interpreter.js';
import { getSource } from './source_area.js';

var interpreter = null;

function runProgram() {
  interpreter = new Afbpl1Interpreter(getSource());

  {
    const result = interpreter.init();
    if (result && result.isError) {
      writeLine("Грешка: " + result.message);
      return;
    }
  }

  {
    const result = interpreter.continue();
    if (!result) {
      throw "Internal error: interpreter.continue() didn't return a value.";
    }
    if (result.isError) {
      writeLine("Грешка: " + result.message);
      interpreter = null;
    }
    if (result == hasCompletedSuccessfully) {
      interpreter = null;
    }
    if (result == waitingForInput) {

    }
  }
}

// Entry point when run button is pressed.
window.runProgram = runProgram;

init();