import { init } from './init.js';
import { Afbpl1Interpreter } from './interpreter.js';
import { getSource } from './source_area.js';

function runProgram() {
  const result = new Afbpl1Interpreter(getSource()).interpret();
  if (result && result.isError) {
    console.log("Грешка: " + result.message);
  }
}

// Entry point when run button is pressed.
window.runProgram = runProgram;

init();