function getElement() {
  return $("#ioText")[0];
}

function getIOText(element) {
  return element.value;
}

function setIOText(element, newText/*: string*/) {
  element.value = newText;
}

export function write(newText/*: string*/) {
  let element = getElement();
  let text = getIOText(element);
  text += newText;
  setIOText(element, text);
}

export function writeLine(newText/*: string*/) {
  write(newText);
  write('\n');
}

var onread = null;
var fixedIOTextLength = null;

export function readLine(callback) {
  onread = callback;
  write('> ');
  fixedIOTextLength = getIOText(getElement()).length;
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
    if (onread == null) {
      event.preventDefault();
      return;
    }
    if (event.inputType === "insertLineBreak") {
      console.log('finish input; fixedIOTextLength=' + fixedIOTextLength);
      const callback = onread;
      onread = null;
      callback(getIOText(element).substring(fixedIOTextLength));
    }
  });
}