import { configureSourcePersistance } from './source_area.js';
import { configureIOEditBehavior } from './io_area.js';

function resizeButtonToMatchTextareas() {
  const textarea = $("#sourceCode")[0];
  const button = $("#runButton")[0];
  button.style.width = textarea.offsetWidth + "px";
}

export function init() {
  configureSourcePersistance();
  configureIOEditBehavior();
  window.addEventListener('load', function() {
    resizeButtonToMatchTextareas();
  });
}
