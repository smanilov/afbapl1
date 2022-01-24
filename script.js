import { init } from './init.js';
import { Afbpl1Interpreter } from './interpreter.js';
import { getSource } from './source_area.js';

function runProgram() {
  let interpreter = new Afbpl1Interpreter(getSource());

  {
    const result = interpreter.init();
    if (result && result.isError) {
      console.log("Грешка: " + result.message);
      return;
    }
  }

  {
    const result = interpreter.continue();
    if (result && result.isError) {
      console.log("Грешка: " + result.message);
    }
  }
}

// Entry point when run button is pressed.
window.runProgram = runProgram;

init();