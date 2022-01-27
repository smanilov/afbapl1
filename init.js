import { configureSourcePersistance } from './source_area.js';
import { configureIOEditBehavior } from './io_area.js';

function resizeAllToMatchTextarea() {
  const button = $("#runButton")[0];
  const div = $("#sourceCode")[0];
  const textarea = $("#ioText")[0];
  
  button.style.width = textarea.offsetWidth + "px";

  // Subtract border and padding for the div.
  div.style.width = textarea.offsetWidth - 6 + "px";
}

export function init() {
  configureSourcePersistance();
  configureIOEditBehavior();
  window.addEventListener('load', function() {
    resizeAllToMatchTextarea();
  });
}
