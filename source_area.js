import { SourceCode } from './source_code_abstraction.js';

// Converts the innerHtml of the contenteditable div that contains the source
// to lines separated by '\n'.
function stripTags(sourceHtml) {
  // Basically, replace all </div>, <br>, and </p> to '\n', while stripping
  // all <div>, and <p>.
  var sourceCode = sourceHtml;
  sourceCode = sourceCode.replaceAll('</div><div>', '\n');
  sourceCode = sourceCode.replaceAll('</p>', '\n');
  sourceCode = sourceCode.replaceAll('<br>', '\n');

  sourceCode = sourceCode.replaceAll('<div>', '');
  sourceCode = sourceCode.replaceAll('</div>', '');
  sourceCode = sourceCode.replaceAll('<p>', '');
  
  sourceCode = sourceCode.replaceAll(/<span[^>]*>/g, '');
  sourceCode = sourceCode.replaceAll('</span>', '');

  // It turns out that spaces are also a problem.
  sourceCode = sourceCode.replaceAll('&nbsp;', ' ');
  return sourceCode;
}

// The inverse of stripTags... to some extent.
function addEmptySpaceTags(rawSource) {
  // Just replace '\n' with </div><div> and add <div> at the start and </div>
  // at the end.
  var sourceHtml = rawSource;

  sourceHtml = sourceHtml.replaceAll('\n', '</div><div>');
  sourceHtml = '<div>' + sourceHtml + '</div>';

  // Preserve indentations and wide spaces in general.
  sourceHtml = sourceHtml.replaceAll('  ', '&nbsp; ');

  // Do it again, in case there was an odd number of spaces anywhere.
  sourceHtml = sourceHtml.replaceAll('  ', '&nbsp; ');

  return sourceHtml;
}

function addAnnotationTags(sourceCode) {
  var rawSource = sourceCode.rawSource;
  // Assuming annotations are not overlapping.
  for (var i = sourceCode.annotations.length - 1; i >= 0; --i) {
    rawSource = sourceCode.annotations[i].apply(rawSource);
  }
  return rawSource;
}

function addTags(sourceCode) {
  var rawSource = addAnnotationTags(sourceCode);
  rawSource = addEmptySpaceTags(rawSource);
  return rawSource;
}

export function getSource() {
  const rawSource = stripTags($("#sourceCode")[0].innerHTML);
  
  return new SourceCode(rawSource, setSource);
}

function setSource(source/*: SourceCode*/) {
  $("#sourceCode")[0].innerHTML = addTags(source);
}

// Keeps source across page reloads.
export function configureSourcePersistance() {
  window.addEventListener("beforeunload", function (event) {
    window.localStorage.setItem('sourceCode', getSource().rawSource);
  });

  window.addEventListener('DOMContentLoaded', (event) => {
    const rawSource = window.localStorage.getItem('sourceCode');
    setSource(new SourceCode(rawSource, setSource));
  });
}