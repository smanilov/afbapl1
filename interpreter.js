import * as io from './io_area.js';

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
  }

  // Analyses and executes the raw source.
  interpret() {
    const startLineOrError = this.findStartLine();
    if (startLineOrError.isError) {
      return startLineOrError;
    }
    this.startLine = startLineOrError.value;

    const unitOffsetOrError = this.computeUnitOffset(this.startLine);
    if (unitOffsetOrError.isError) {
      return unitOffsetOrError;
    }

    for (let i = this.startLine + 1; ; i++) {
      if (i == this.instructions.length) {
        i = 0;
      }
      const inst = this.instructions[i];
      if (this.isEnd(inst)) {
        break;
      }
      if (this.isOutput(inst)) {
        const maybeError = this.performOutput(inst);
        if (maybeError.isError) {
          return maybeError;
        }
      } else if (this.isStart(inst)) {
        return {
          isError: true,
          message: "Изпълнението на програмата стигна повторно до 'начало', " +
            "без преди това да срещне 'край'."
        };
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
    io.writeLine(valueToOutput);

    return {
      isError: false,
    };
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