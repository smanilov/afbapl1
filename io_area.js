function getIOText() {
  return $("#ioText")[0].value;
}

function setIOText(newText/*: string*/) {
  $("#ioText")[0].value = newText;
}

export function writeLine(newText/*: string*/) {
  let text = getIOText();
  text += newText + '\n';
  setIOText(text);
}