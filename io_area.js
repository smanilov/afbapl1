function getElement() {
  return $("#ioText")[0];
}

function getIOText(element) {
  return element.value;
}

function setIOText(element, newText/*: string*/) {
  element.value = newText;
}

export function writeLine(newText/*: string*/) {
  let element = getElement();
  let text = getIOText(element);
  text += newText + '\n';
  setIOText(element, text);
}

function isTextSelected(element) {
  return element.selectionStart != element.selectionEnd;
}

// Whether there is no text selected in the IO text area and the cursor is
// pointing after the last character of the contained text.
function isCursorAtEnd(element) {
  if (isTextSelected(element)) {
    return false;
  }
  return element.textLength == element.selectionStart;
}

export function configureIOEditBehavior() {
  let element = getElement();
  element.addEventListener("beforeinput", function (event) {
    if (!isCursorAtEnd(element)) {
      event.preventDefault();
    }
  });
}