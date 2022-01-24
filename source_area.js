export function getSource() {
  return $("#sourceCode")[0].value;
}

function setSource(source/*: string*/) {
  $("#sourceCode")[0].value = source;
}

// Keeps source across page reloads.
export function configureSourcePersistance() {
  window.addEventListener("beforeunload", function (event) {
    window.localStorage.setItem('sourceCode', getSource());
  });

  window.addEventListener('DOMContentLoaded', (event) => {
    setSource(window.localStorage.getItem('sourceCode'));
  });
}