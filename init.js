import { getSource, setSource } from './source_area.js';

// Keeps source across page reloads.
function configureSourcePersistance() {
  window.addEventListener("beforeunload", function (event) {
    window.localStorage.setItem('sourceCode', getSource());
  });

  window.addEventListener('DOMContentLoaded', (event) => {
    setSource(window.localStorage.getItem('sourceCode'));
  });
}

export function init() {
  configureSourcePersistance();
}
