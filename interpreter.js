import { clear, readLineAndThen, writeLine } from './io_area.js';

const hasCompletedSuccessfully = {
  isError: false,
  message: "Изпълнението на програмата приключи успешно!"
};

const reachedStartAgainError = {
  isError: true,
  message: "Изпълнението на програмата стигна повторно до 'начало', " +
    "без преди това да срещне 'край'."
};

const waitingForInput = {
  isError: false,
  message: "Изпълнението на програмата е временно спряно, докато " +
    "потребителя въведе нужния вход."
}

// Returns the last element of an array, assuming that it has at least one element.
function lastOf(array) {
  return array[array.length - 1];
}


class Afbpl1Interpreter {
  /*
  source: SourceCode;
  startLine: number;
  numberedInstructions: { line: number, value: string }[];
  trimmedInstructions: { line: number, value: string }[];
  */

  constructor(source/*: SourceCode*/) {
    this.source = source;
    this.symbolTable = {};
    this.typeOf = {};
    this.conditionalStack = [];
  }

  init() {
    const startLineOrError = this.findStartLine();
    if (startLineOrError.isError) {
      return startLineOrError;
    }
    this.currentLine = startLineOrError.value;
    this.source.markStart(this.currentLine);

    const unitOffsetOrError = this.computeUnitOffset(this.currentLine);
    if (unitOffsetOrError.isError) {
      return unitOffsetOrError;
    }
    this.unitOffset = unitOffsetOrError.unitOffset;
  }

  // Continue the interpretation of the program from the last interpreted
  // statement.
  //
  // At the beginning, this would be the 'начало' statement.
  resume() {
    loop1:
    for (this.currentLine++; ; this.currentLine++) {
      if (this.currentLine == this.source.instructions.length) {
        this.currentLine = 0;
      }

      const inst = this.source.instructions[this.currentLine];

      if (this.isEmpty(inst)) {
        continue;
      }

      const indent = this.computeIndent(inst);

      if (this.isEnd(inst)) {
        this.source.markEnd(this.currentLine);
        return hasCompletedSuccessfully;
      }
      if (this.isStart(inst)) {
        this.source.markStart(this.currentLine);
        return reachedStartAgainError;
      }

      if (this.conditionalStack.length) {
        do {
          var keepItPoppin = false;
          const lastConditional = lastOf(this.conditionalStack);
          if (lastConditional.indent == indent) {
            if (this.isElse(inst)) {
              lastConditional.isNegated = true;
              this.source.markElse(this.currentLine);
              continue loop1;
            } else {
              this.conditionalStack.pop();
            }
          } else if (lastConditional.indent > indent) {
            this.conditionalStack.pop();
            keepItPoppin = true;
          }
        } while (keepItPoppin && this.conditionalStack.length);
      }

      if (this.conditionalStack.length) {
        const lastConditional = lastOf(this.conditionalStack);
        if (lastConditional.indent >= indent) {
          throw "Internal error: lastConditional expected to have lower " +
          "indent at this point";
        }

        if ((lastConditional.holds && lastConditional.isNegated) ||
          (!lastConditional.holds && !lastConditional.isNegated)) {
          continue;
        }
      }

      if (this.isOutput(inst)) {
        const maybeError = this.performOutput(inst);
        if (maybeError && maybeError.isError) {
          const error = maybeError;
          return error;
        }
        continue;
      }
      if (this.isInput(inst)) {
        this.prepareForInput(inst);
        return waitingForInput;
      }
      if (this.isConditional(inst)) {
        const conditionalOrError = this.performConditional(inst);
        if (conditionalOrError.isError) {
          const error = conditionalOrError;
          return error;
        }
        const conditional = conditionalOrError;
        this.conditionalStack.push(conditional);
      }
    }
  }

  isEmpty(instruction) {
    return instruction.trim() === '';
  }

  isStart(instruction) {
    return instruction.trim() === 'начало';
  }

  isEnd(instruction) {
    return instruction.trim() === 'край';
  }

  isOutput(instruction) {
    return instruction.trim().startsWith('изход');
  }

  isInput(instruction) {
    return instruction.trim().startsWith('вход');
  }

  isConditional(instruction) {
    return instruction.trim().startsWith('ако');
  }

  isElse(instruction) {
    return instruction.trim().startsWith('иначе');
  }

  performOutput(instruction) {
    if (!this.isOutput(instruction)) {
      throw "Internal error: performOutput called on an instruction that is " +
      "not an output instruction, but [" + instruction + "]";
    }
    this.source.markOutput(this.currentLine);

    const stringEnds = Array.from(instruction.matchAll("\""));
    const argumentIsStringLiteral = stringEnds.length == 2;

    const indent = this.computeIndent(instruction);
    const kwLength = "изход".length;
    const isKeywordFollowedBySpace = instruction[indent + kwLength] === ' ';

    const argument = instruction.substring(indent + kwLength + 1);

    var valueToOutput;
    if (argumentIsStringLiteral) {
      valueToOutput = instruction.substring(
        stringEnds[0].index + 1,
        stringEnds[1].index
      );
      this.source.markStringLiteral(
        this.currentLine,
        stringEnds[0].index,
        stringEnds[1].index + 1
      );
    } else {
      if (!isKeywordFollowedBySpace) {
        this.source.markError(
          this.currentLine,
          indent + kwLength,
          indent + kwLength + 1
        )
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от празно " +
            "място, ако аргументът не е текст в кавички."
        };
      }
      if (!this.hasVariable(argument)) {
        this.source.markError(
          this.currentLine,
          indent + kwLength + 1,
          indent + kwLength + 1 + argument.length
        )
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от име на известна вече променлива, или текст в " +
            "двойни кавички (\")."
        };
      }
      this.source.markVariable(
        this.currentLine,
        indent + kwLength + 1,
        indent + kwLength + 1 + argument.length
      )
      valueToOutput = this.getVariable(argument);
    }

    writeLine(valueToOutput);
  }

  prepareForInput(instruction) {
    this.source.markInput(this.currentLine);

    const indent = this.computeIndent(instruction);
    const kwLength = "вход".length;
    const argument = instruction.substring(indent + kwLength + 1);

    this.source.markVariable(
      this.currentLine,
      indent + kwLength + 1,
      indent + kwLength + 1 + argument.length
    )

    readLineAndThen((valueRead) => {
      theInterpreter.setVariable(argument, valueRead);
      resumeInterpreter();
    });
  }

  performConditional(instruction) {
    this.source.markConditional(this.currentLine);

    const indent = this.computeIndent(instruction);
    const kwLength = "ако".length;
    const argument = instruction.substring(indent + kwLength + 1).trim();

    var operand1 = null, operand2 = null;
    for (const [key, ] of Object.entries(this.symbolTable)) {
      if (argument.startsWith(key)) {
        operand1 = key;
        this.source.markVariable(
          this.currentLine,
          indent + kwLength + 1,
          indent + kwLength + 1 + key.length
        );
      }
      if (argument.endsWith(key)) {
        operand2 = key;
        this.source.markVariable(
          this.currentLine,
          indent + kwLength + 1 + argument.length - key.length,
          indent + kwLength + 1 + argument.length
        );
      }
    }

    if (operand1 == null && operand2 == null) {
      this.source.markError(
        this.currentLine,
        indent + kwLength + 1,
        indent + kwLength + 1 + argument.length
      )
      return {
        isError: true,
        message: "Поне една от страните на проверката трябва да е вече " +
          "известна променлива."
      };
    }

    var operator = null;
    if (operand1 != null) {
      operator = argument.substring(operand1.length);
      operator = operator.trim();
      operator = operator.split(' ')[0];

      var start = argument.indexOf(operator, operand1.length);
      var end = start + operator.length;

      if (operand2 == null) {
        operand2 = argument.substring(end).trim();
      } else {

      }

      start += indent + kwLength + 1;
      end += indent + kwLength + 1;
      this.source.markArithmetic(this.currentLine, start, end);
    } else {
      // operand1 == null && operand2 != null
      operator = argument.substring(0, argument.length - operand2.length);
      operator = operator.trim();
      operator = operator.split(' ');
      operator = lastOf(operator);

      var start = argument.lastIndexOf(operator, argument.length - operand2.length);
      var end = start + operator.length;
      operand1 = argument.substring(0, end).trim();

      start += indent + kwLength + 1;
      end += indent + kwLength + 1;
      this.source.markArithmetic(this.currentLine, start, end);
    }

    return {
      isError: false,
      indent: indent,
      holds: this.performOperator(operator, operand1, operand2),
      isNegated: false,
    };
  }

  performOperator(operator, operand1, operand2) {
    if (operator == "е") {
      if (operand1 in this.symbolTable) {
        if (operand2 in this.symbolTable) {
          return this.symbolTable[operand1] === this.symbolTable[operand2];
        }
        // TODO:
        if (this.typeOf[operand1] == 'целочислен') {
          return this.symbolTable[operand1] == parseInt(operand2);
        }
      } else {
        if (this.typeOf[operand2] == 'целочислен') {
          return this.symbolTable[operand2] == parseInt(operand1);
        }
      }
    }
  }

  // Whether a variable of the given name has been given value already.
  hasVariable(variableName) {
    return variableName in this.symbolTable;
  }

  // Returns the value of a variable, assuming it exists in the symbol table.
  getVariable(variableName) {
    return this.symbolTable[variableName];
  }

  // Sets the value of a variable in the symbol table.
  setVariable(variableName, newValue) {
    const intValue = parseInt(newValue, 10);
    const floatValue = parseFloat(newValue, 10);
    if (!isNaN(intValue) && intValue == floatValue && ('' + intValue) === newValue.trim()) {
      this.symbolTable[variableName] = intValue;
      this.typeOf[variableName] = 'целочислен';
    } else if (!isNaN(floatValue) && ('' + floatValue) === newValue.trim()) {
      this.symbolTable[variableName] = floatValue;
      this.typeOf[variableName] = 'дробно число';
    } else {
      this.symbolTable[variableName] = newValue;
      this.typeOf[variableName] = 'текст';
    }
    console.log('type of ' + variableName + ' is ' + this.typeOf[variableName]);
  }

  // Returns the line at which the only "начало" in the program can be found.
  //
  // If there are not exactly one "начало", an error is returned.
  findStartLine() {
    var numberedInstructions = new Array(this.source.instructions.length);
    for (let i = 0; i < this.source.instructions.length; i++) {
      numberedInstructions[i] = { line: i, value: this.source.instructions[i] };
    }

    const starts = numberedInstructions.filter(
      inst => this.isStart(inst.value.trim())
    );

    if (starts.length === 1) {
      return {
        isError: false,
        value: starts[0].line
      }
    } else {
      return {
        isError: true,
        message: "Програмата трябва да има точно едно начало. В момента, има " +
          starts.length + "."
      };
    }
  }

  // Returns the indentation difference between the start line and the following
  // line, if it's a positive integer.
  //
  // Returns 0 only in the case of the trivial program containing only a start
  // and an end.
  //
  // Otherwise, returns an error.
  computeUnitOffset(startLine/*: number*/) {
    const baseIndent = this.computeIndent(this.source.instructions[startLine]);
    var currentLine = startLine + 1;
    // skip empty lines
    while (this.source.instructions[currentLine].trim() === "") ++currentLine;
    const nextInst = this.source.instructions[currentLine];
    const nextIndent = this.computeIndent(nextInst);

    if ((baseIndent < nextIndent) ||
      (baseIndent == nextIndent && this.isEnd(nextInst))) {
      return {
        isError: false,
        unitOffset: nextIndent - baseIndent
      };
    }

    return {
      isError: true,
      message: "Първият не-празен ред след 'начало' трябва да е отместен " +
        "надясно, поне с едно празно място."
    };
  }

  // Counts the number of spaces that an instruction or comment starts with.
  // Throws an exception if the argument contains nothing but spaces.
  computeIndent(instructionOrComment) {
    const index = instructionOrComment.search("[^ ]");
    if (index === -1) {
      throw "Internal error: computeIndent works only with non-empty " +
      "instructions or comments.";
    }
    return index;
  }
}

var theInterpreter = null;

// Creates a new interpreter object and stores it in the global singleton
// variable and returns 'true'.
//
// Fails if the given source does not have a single "начало" or if there is an
// indentation problem and returns 'false'.
export function createInterpreter(source, setSource) {
  clear();

  const interpreter = new Afbpl1Interpreter(source, setSource);

  const result = interpreter.init();
  if (result && result.isError) {
    writeLine("Грешка: " + result.message);
    return false;
  }

  theInterpreter = interpreter;
  return true;
}

// Resumes the interpreter.
//
// Assumes that the interpreter singleton is not null.
export function resumeInterpreter() {
  const result = theInterpreter.resume();
  if (!result) {
    throw "Internal error: interpreter.resume() didn't return a value.";
  }
  if (result.isError) {
    writeLine("Грешка: " + result.message);
    theInterpreter = null;
  }
  if (result == hasCompletedSuccessfully) {
    writeLine(result.message);
    theInterpreter = null;
  }
  if (result == waitingForInput) {
    // return from function when waiting for input
  }
}