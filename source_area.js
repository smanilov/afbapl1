export function getSource() {
  return $("#sourceCode")[0].value;
}

export function setSource(source/*: string*/) {
  $("#sourceCode")[0].value = source;
}