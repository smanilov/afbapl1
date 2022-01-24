function getElement() {
  return $("#ioText")[0];
}

function getIOText(element) {
  return element.value;
}

function setIOText(element, newText/*: string*/) {
  element.value = newText;
}

// Clears the IO textarea from any text.
export function clear() {
  setIOText(getElement(), '');
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

export function readLineAndThen(callback) {
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
    const isWaitingForInput = onread != null;
    const isEditingOldText = element.selectionStart < fixedIOTextLength;
    const isBackspacingLastFixedChar =
      element.selectionStart == element.selectionEnd &&
      element.selectionStart == fixedIOTextLength &&
      event.inputType.match('delete.*Backward');
    if (!isWaitingForInput || isEditingOldText || isBackspacingLastFixedChar) {
      event.preventDefault();
      return;
    }

    if (event.inputType === "insertLineBreak") {
      element.selectionStart = getIOText(element).length;
      element.selectionEnd = element.selectionStart;
    }
  });

  element.addEventListener("input", function (event) {
    if (event.inputType === "insertLineBreak") {
      const callback = onread;
      onread = null;
      const text = getIOText(element);
      callback(text.substring(fixedIOTextLength, text.length - 1));
    }
  });
}