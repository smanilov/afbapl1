// Converts the innerHtml of the contenteditable div that contains the source
// to lines separated by '\n'.
function stripTags(sourceHtml) {
  // Basically, replace all </div>, <br>, and </p> to '\n', while stripping
  // all <div>, and <p>.
  var sourceCode = sourceHtml;
  sourceCode = sourceCode.replaceAll('<div>', '');
  sourceCode = sourceCode.replaceAll('<p>', '');

  sourceCode = sourceCode.replaceAll('</div>', '\n');
  sourceCode = sourceCode.replaceAll('</p>', '\n');
  sourceCode = sourceCode.replaceAll('<br>', '\n');

  // It turns out that spaces are also a problem.
  sourceCode = sourceCode.replaceAll('&nbsp;', ' ');

  sourceCode = sourceCode.trim();
  return sourceCode;
}

// The inverse of stripTags... to some extent.
function addTags(sourceCode) {
  // Just replace '\n' with </div><div> and add <div> at the start and </div>
  // at the end.
  var sourceHtml = sourceCode;

  sourceHtml = sourceHtml.replaceAll('\n', '</div><div>');
  sourceHtml = '<div>' + sourceHtml + '</div>';

  // Preserve indentations and wide spaces in general.
  sourceHtml = sourceHtml.replaceAll('  ', '&nbsp; ');

  // Do it again, in case there was an odd number of spaces anywhere.
  sourceHtml = sourceHtml.replaceAll('  ', '&nbsp; ');

  return sourceHtml;
}

export function getSource() {
  return stripTags($("#sourceCode")[0].innerHTML);
}

function setSource(source/*: string*/) {
  $("#sourceCode")[0].innerHTML = addTags(source);
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