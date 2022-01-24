import { init } from './init.js';
import { createInterpreter, resumeInterpreter } from './interpreter.js';
import { getSource } from './source_area.js';

function runProgram() {
  if (createInterpreter(getSource())) {
    resumeInterpreter();
  }
}

// Entry point when the run button is pressed.
window.runProgram = runProgram;

init();