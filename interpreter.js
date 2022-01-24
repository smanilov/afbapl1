import { clear, readLine, writeLine } from './io_area.js';

export const hasCompletedSuccessfully = {
  isError: false,
  message: "Изпълнението на програмата приключи успешно."
};

export const reachedStartAgainError = {
  isError: true,
  message: "Изпълнението на програмата стигна повторно до 'начало', " +
    "без преди това да срещне 'край'."
};

export const waitingForInput = {
  isError: false,
  message: "Изпълнението на програмата е временно спряно, докато " +
    "потребителя въведе нужния вход."
}

export class Afbpl1Interpreter {
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
    const startLineOrError = this.findStartLine();
    if (startLineOrError.isError) {
      return startLineOrError;
    }
    this.currentLine = startLineOrError.value;

    const unitOffsetOrError = this.computeUnitOffset(this.currentLine);
    if (unitOffsetOrError.isError) {
      return unitOffsetOrError;
    }

    clear();
  }

  // Continue the interpretation of the program from the last interpreted
  // statement.
  //
  // At the beginning, this would be the 'начало' statement.
  continue() {
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
    if (stringEnds.length != 2) {
      return {
        isError: true,
        message: "Инструкцията за изход трябва да е последвана от текст в двойни кавички (\")."
      };
    }
    const valueToOutput = instruction.substring(stringEnds[0].index + 1, stringEnds[1].index);
    writeLine(valueToOutput);
  }

  prepareForInput(instruction) {
    var interpreter = this;
    const variableName = instruction.trim().split(' ')[1];
    function onread(valueRead) {
      interpreter.setVariable(variableName, valueRead);
      // нещо като runProgram
      interpreter.continue();
      interpreter = null;
    }

    readLine(onread);
  }

  setVariable(variableName, newValue) {
    console.log(variableName + ' = ' + newValue);
    this.symbolTable[variableName] = newValue;
  }

  // Get the instructions of the program.
  getInstructions() {
    if (!this.instructions) {
      this.instructions = this.rawSource.split('\n');
    }
    return this.instructions;
  }

  // Get the instructions of the program, but numbered.
  // The result is an array of objects like { line: 5, value: "начало" }
  getNumberedInstructions() {
    if (!this.numberedInstructions) {
      const instructions = this.getInstructions();
      this.numberedInstructions = new Array(instructions.length);
      for (let i = 0; i < instructions.length; i++) {
        this.numberedInstructions[i] = { line: i, value: instructions[i] };
      }
    }
    return this.numberedInstructions;
  }

  getTrimmedInstructions() {
    if (!this.trimmedInstructions) {
      this.trimmedInstructions = this.getNumberedInstructions().map(
        inst => ({ line: inst.line, value: inst.value.trim() })
      );
    }
    return this.trimmedInstructions;
  }

  // Returns the line at which the only "начало" in the program can be found.
  // If there are not exactly one "начало", an error is returned.
  findStartLine() {
    const starts = this.getTrimmedInstructions().filter(
      inst => this.isStart(inst.value)
    );

    if (starts.length === 1) {
      return {
        isError: false,
        value: starts[0].line
      }
    } else {
      return {
        isError: true,
        message: "Програмата трябва да има точно едно начало. " +
          "В момента, има " + starts.length + "."
      };
    }
  }

  // Returns the indentation difference between the start line and the following
  // line, if it's a positive integer.
  // Otherwise, returns an error.
  computeUnitOffset(startLine/*: number*/) {
    const baseIndent = this.computeIndent(this.instructions[startLine]);
    var currentLine = startLine + 1;
    // skip empty lines
    while (this.instructions[currentLine].trim() === "") ++currentLine;
    const nextIndent = this.computeIndent(this.instructions[currentLine]);

    if (baseIndent < nextIndent) {
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