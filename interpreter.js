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

class Afbpl1Interpreter {
  /*
  rawSource: string;
  startLine: number;
  instructions: string[];
  numberedInstructions: { line: number, value: string }[];
  trimmedInstructions: { line: number, value: string }[];
  */

  constructor(rawSource/*: string*/) {
    this.rawSource = rawSource;
    this.symbolTable = {};
  }

  init() {
    this.instructions = this.rawSource.split('\n');

    const startLineOrError = this.findStartLine();
    if (startLineOrError.isError) {
      return startLineOrError;
    }
    this.currentLine = startLineOrError.value;

    const unitOffsetOrError = this.computeUnitOffset(this.currentLine);
    if (unitOffsetOrError.isError) {
      return unitOffsetOrError;
    }
  }

  // Continue the interpretation of the program from the last interpreted
  // statement.
  //
  // At the beginning, this would be the 'начало' statement.
  resume() {
    for (this.currentLine++; ; this.currentLine++) {
      if (this.currentLine == this.instructions.length) {
        this.currentLine = 0;
      }
      const inst = this.instructions[this.currentLine];
      if (this.isEnd(inst)) {
        return hasCompletedSuccessfully;
      }
      if (this.isStart(inst)) {
        return reachedStartAgainError;
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
        const maybeError = this.prepareForInput(inst);
        if (maybeError && maybeError.isError) {
          const error = maybeError;
          return error;
        }
        return waitingForInput;
      }
    }
  }

  isStart(instruction) {
    return instruction.trim() === "начало";
  }

  isEnd(instruction) {
    return instruction.trim() === "край";
  }

  isOutput(instruction) {
    return instruction.trim().startsWith("изход");
  }

  isInput(instruction) {
    return instruction.trim().startsWith("вход");
  }

  performOutput(instruction) {
    if (!this.isOutput(instruction)) {
      throw "Internal error: performOutput called on an instruction that is " +
      "not an output instruction, but [" + instruction + "]";
    }

    const stringEnds = Array.from(instruction.matchAll("\""));
    const argumentIsStringLiteral = stringEnds.length == 2;

    const trimmed_inst = instruction.trim();
    const kwLength = "изход".length;
    const isKeywordFollowedBySpace = trimmed_inst[kwLength] === ' ';

    const argument = trimmed_inst.substring(kwLength + 1);
    const argumentContainsSpaces = argument.indexOf(' ') !== -1;

    var valueToOutput;
    if (argumentIsStringLiteral) {
      valueToOutput = instruction.substring(stringEnds[0].index + 1, stringEnds[1].index);
    } else {
      if (!isKeywordFollowedBySpace) {
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от празно " +
            "място, ако аргументът не е текст в кавички."
        };
      }
      if (argumentContainsSpaces) {
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от празно " +
            "място, ако аргументът не е текст в кавички."
        };
      }
      if (!this.hasVariable(argument)) {
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от име на известна вече променлива, или текст в " +
            "двойни кавички (\")."
        };
      }
      valueToOutput = this.getVariable(argument);
    }

    writeLine(valueToOutput);
  }

  prepareForInput(instruction) {
    const variableName = instruction.trim().split(' ')[1];

    readLineAndThen((valueRead) => {
      theInterpreter.setVariable(variableName, valueRead);
      resumeInterpreter();
    });
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
    this.symbolTable[variableName] = newValue;
  }

  // Returns the line at which the only "начало" in the program can be found.
  //
  // If there are not exactly one "начало", an error is returned.
  findStartLine() {
    var numberedInstructions = new Array(this.instructions.length);
    for (let i = 0; i < this.instructions.length; i++) {
      numberedInstructions[i] = { line: i, value: this.instructions[i] };
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
    const baseIndent = this.computeIndent(this.instructions[startLine]);
    var currentLine = startLine + 1;
    // skip empty lines
    while (this.instructions[currentLine].trim() === "") ++currentLine;
    const nextInst = this.instructions[currentLine];
    const nextIndent = this.computeIndent(nextInst);

    if ((baseIndent < nextIndent) ||
      (baseIndent == nextIndent && this.isEnd(nextInst))) {
      return {
        isError: false,
        value: nextIndent - baseIndent
      };
    }

    return {
      isError: true,
      message: "Първия не-празен ред след 'начало' трябва да е отместен " +
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
export function createInterpreter(source) {
  clear();

  const interpreter = new Afbpl1Interpreter(source);

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