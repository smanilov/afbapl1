function getAllIndexes(heap, needle) {
  var last = -1;
  var result = [];
  while (true) {
    last = heap.indexOf(needle, last + 1)
    if (last == -1) break;
    result.push(last);
  }

  return result;
}

function insertInString(str, position, newStr) {
  return str.substring(0, position) + newStr + str.substring(position);
}

// Annotates a section of the raw source.
class Annotation {
  constructor(label, start, end) {
    this.label = label;
    this.start = start;
    this.end = end;
  }

  isKeyword() {
    return this.label.startsWith("Keyword");
  }

  isOperator() {
    return this.label.startsWith("Operator");
  }

  isLiteral() {
    return this.label.startsWith("Literal");
  }

  isError() {
    return this.label.startsWith("Error");
  }

  isVariable() {
    return this.label.startsWith("Variable");
  }

  isArithmetic() {
    return this.label.startsWith("Arithmetic");
  }

  getCssClass() {
    if (this.isKeyword()) {
      return "codeKeyword";
    }
    if (this.isOperator()) {
      return "codeOperator";
    }
    if (this.isLiteral()) {
      return "codeLiteral";
    }
    if (this.isError()) {
      return "codeError";
    }
    if (this.isVariable()) {
      return "codeVariable";
    }
    if (this.isArithmetic()) {
      return "codeArithmetic";
    }
    
    throw "Internal error: unsupported annotation label [" + this.label + "]";
  }

  apply(rawSource) {
    // Assuming the indexing is maintained.
    const cssClass = this.getCssClass();
    rawSource = insertInString(rawSource, this.end, '</span>');
    rawSource = insertInString(rawSource, this.start, '<span class="' + cssClass + '">');
    return rawSource;
  }
}

// Represents the source code, together with semantic annotations and other
// metadata.
export class SourceCode {
  // setSource is a function to update the source in the editor (after adding highlighting, e.g.)
  constructor(rawSource, setSource) {
    this.rawSource = rawSource;
    this.setSource = setSource;

    this.instructions = this.rawSource.split('\n');
    this.newLinePositions = getAllIndexes(this.rawSource, '\n');
    this.annotations = [];
  }

  markStart(instIndex) {
    this.markCategory(instIndex, 'начало', 'KeywordStart');
  }

  markEnd(instIndex) {
    this.markCategory(instIndex, 'край', 'KeywordEnd');
  }

  markOutput(instIndex) {
    this.markCategory(instIndex, 'изход', 'OperatorOutput');
  }

  markInput(instIndex) {
    this.markCategory(instIndex, 'вход', 'OperatorInput');
  }

  markConditional(instIndex) {
    this.markCategory(instIndex, 'ако', 'OperatorConditional');
  }

  markElse(instIndex) {
    this.markCategory(instIndex, 'иначе', 'OperatorElse');
  }

  markArithmetic(instIndex, start, end) {
    this.markSpan(instIndex, start, end, 'Arithmetic');
  }

  markStringLiteral(instIndex, start, end) {
    this.markSpan(instIndex, start, end, 'LiteralString');
  }

  markError(instIndex, start, end) {
    this.markSpan(instIndex, start, end, 'Error');
  }

  markVariable(instIndex, start, end) {
    this.markSpan(instIndex, start, end, 'Variable');
  }

  markCategory(instIndex, needle, annotationLabel) {
    const spanStart = this.instructions[instIndex].indexOf(needle);
    const spanEnd = spanStart + needle.length;
    
    this.markSpan(instIndex, spanStart, spanEnd, annotationLabel);
  }

  markSpan(instIndex, spanStart, spanEnd, annotationLabel) {
    const instStart =
      instIndex == 0
        ? 0
        : this.newLinePositions[instIndex - 1] + 1;

    const annotationStart = instStart + spanStart;
    const annotationEnd = instStart + spanEnd;
    const annotation = new Annotation(annotationLabel, annotationStart, annotationEnd);

    // Assuming annotations don't overlap for now.
    var i = 0;
    for (i = 0; i < this.annotations.length; ++i) {
      if (this.annotations[i].start > annotationStart) break;
    }
    this.annotations.splice(i, 0, annotation);
    
    this.setSource(this);
  }
}