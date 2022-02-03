import { clear, readLineAndThen, writeLine } from './io_area.js';
import { isInt, isFloat, isStringLiteral } from './type_checking.js';

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

// Returns the contents of a string literal, stripping the double quotes.
function parseString(stringLiteral) {
  if (!isStringLiteral(stringLiteral)) {
    throw "Internal error: stringLiteral expected to be a string literal";
  }

  return stringLiteral.substring(1, stringLiteral.length - 1);
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
    this.labelTable = {};
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
    this.baseIndent = unitOffsetOrError.baseIndent;
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
        continue;
      }
      if (this.isDeclaration(inst)) {
        const maybeError = this.performDeclaration(inst);
        if (maybeError && maybeError.isError) {
          const error = maybeError;
          return error;
        }
        continue;
      }
      if (this.isLabelDeclaration(inst)) {
        this.performLabelDeclaration(inst);
        continue;
      }
      if (this.isGotoLabel(inst)) {
        const maybeError = this.performGotoLabel(inst);
        if (maybeError && maybeError.isError) {
          const error = maybeError;
          return error;
        }
        continue;
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

  isDeclaration(instruction) {
    return instruction.trim().startsWith('нека');
  }

  isLabelDeclaration(instruction) {
    return this.computeIndent(instruction) == this.baseIndent;
  }

  isGotoLabel(instruction) {
    return instruction.trim().startsWith('иди на');
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

    const argumentStart = indent + kwLength + 1;
    const argument = instruction.substring(argumentStart);

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
          argumentStart - 1,
          argumentStart
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
          argumentStart,
          argumentStart + argument.length
        )
        return {
          isError: true,
          message: "Инструкцията за изход трябва да е последвана от име на " +
            "известна вече променлива, или текст в двойни кавички (\")."
        };
      }
      this.source.markVariable(
        this.currentLine,
        argumentStart,
        argumentStart + argument.length
      )
      valueToOutput = this.getVariable(argument);
    }

    writeLine(valueToOutput);
  }

  prepareForInput(instruction) {
    this.source.markInput(this.currentLine);

    const indent = this.computeIndent(instruction);
    const kwLength = "вход".length;
    const argumentStart = indent + kwLength + 1;
    const argument = instruction.substring(argumentStart);

    this.source.markVariable(
      this.currentLine,
      argumentStart,
      argumentStart + argument.length
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
    const argumentStart = indent + kwLength + 1;
    const argument = instruction.substring(argumentStart).trim();

    var operand1 = null, operand2 = null;
    for (const [key,] of Object.entries(this.symbolTable)) {
      if (argument.startsWith(key)) {
        operand1 = key;
        this.source.markVariable(
          this.currentLine,
          argumentStart,
          argumentStart + key.length
        );
      }
      if (argument.endsWith(key)) {
        operand2 = key;
        this.source.markVariable(
          this.currentLine,
          argumentStart + argument.length - key.length,
          argumentStart + argument.length
        );
      }
    }

    if (operand1 == null && operand2 == null) {
      this.source.markError(
        this.currentLine,
        argumentStart,
        argumentStart + argument.length
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
        operand2 = {
          text: argument.substring(end).trim(),
          start: argumentStart + end + 1,
          end: argumentStart + argument.length
        }
      } else {

      }

      start += argumentStart;
      end += argumentStart;
      this.source.markArithmetic(this.currentLine, start, end);
    } else {
      // operand1 == null && operand2 != null
      operator = argument.substring(0, argument.length - operand2.length);
      operator = operator.trim();
      operator = operator.split(' ');
      operator = lastOf(operator);

      var start = argument.lastIndexOf(operator, argument.length - operand2.length);
      operand1 = {
        text: argument.substring(0, start).trim(),
        start: argumentStart,
        end: argumentStart + start - 1
      };

      start += argumentStart;
      const end = start + operator.length;
      this.source.markArithmetic(this.currentLine, start, end);
    }

    const holdsOrError = this.performArithmetic(operator, operand1, operand2);
    if (holdsOrError.isError) {
      const error = holdsOrError;
      return error;
    }

    return {
      isError: false,
      indent: indent,
      holds: holdsOrError,
      isNegated: false,
    };
  }

  performArithmetic(operator, operand1, operand2) {
    if (operator == "е") {
      if (operand1 in this.symbolTable) {
        return this.performComparison(operand1, operand2);
      } else {
        return this.performComparison(operand2, operand1);
      }
    }
  }

  performComparison(operand1, operand2) {
    if (operand2 in this.symbolTable) {
      return this.symbolTable[operand1] === this.symbolTable[operand2];
    }

    var comparisonResult =
      this.tryPerformIntegerToLiteralComparison(operand1, operand2);
    if (!comparisonResult.typeMismatch) {
      return comparisonResult;
    }

    comparisonResult =
      this.tryPerformFloatToLiteralComparison(operand1, operand2);
    if (!comparisonResult.typeMismatch) {
      return comparisonResult;
    }

    return this.performStringToLiteralComparison(operand1, operand2);
  }

  // Checks if the type of the operand is integer and then performs a
  // comparison to a literal.
  // 
  // If the type check fails the return value will contain .typeMismatch = true.
  tryPerformIntegerToLiteralComparison(operand, literal) {
    if (this.typeOf[operand] != 'целочислен') {
      return { typeMismatch: true };
    }

    if (!isInt(literal.text)) {
      this.source.markError(this.currentLine, literal.start, literal.end);
      return {
        isError: true,
        message: "Типа на " + operand + " е целочислен, а " + literal.text +
          " не е цяло число."
      };
    }
    this.source.markIntLiteral(this.currentLine, literal.start, literal.end);
    return this.symbolTable[operand] == parseInt(literal.text);
  }

  // Checks if the type of the operand is float and then performs a
  // comparison to a literal.
  // 
  // If the type check fails the return value will contain .typeMismatch = true.
  tryPerformFloatToLiteralComparison(operand, literal) {
    if (this.typeOf[operand] != 'дробно число') {
      return { typeMismatch: true };
    }

    if (!isFloat(literal.text)) {
      this.source.markError(this.currentLine, literal.start, literal.end);
      return {
        isError: true,
        message: "Типа на " + operand + " е дробно число, а " + literal.text +
          " не е число."
      };
    }
    this.source.markFloatLiteral(this.currentLine, literal.start, literal.end);
    return this.symbolTable[operand] == parseFloat(literal.text);
  }

  performStringToLiteralComparison(operand, literal) {
    if (!isStringLiteral(literal.text)) {
      this.source.markError(this.currentLine, literal.start, literal.end);
      return {
        isError: true,
        message: "Типа на " + operand + " е текст, а " + literal.text +
          " не е текст заграден в двойни кавички."
      };
    }

    this.source.markStringLiteral(this.currentLine, literal.start, literal.end);
    return this.symbolTable[operand] == parseString(literal.text);
  }

  performDeclaration(instruction) {
    this.source.markDeclaration(this.currentLine);
    const trimmedInstruction = instruction.trim();

    var valueToAssign = null;
    var typeToAssign = null;
    var operand = null;
    for (const [key, value] of Object.entries(this.symbolTable)) {
      if (trimmedInstruction.endsWith(key)) {
        operand = key;
        valueToAssign = value;
        typeToAssign = this.typeOf[key];
        this.source.markVariable(
          this.currentLine,
          instruction.length - key.length,
          instruction.length
        );
        break;
      }
    }

    if (valueToAssign == null) {
      const stringEnds = Array.from(instruction.matchAll("\""));
      const operandIsStringLiteral =
        stringEnds.length >= 2 &&
        instruction.substring(lastOf(stringEnds).index + 1).trim() === '';

      if (operandIsStringLiteral) {
        operand = instruction.substring(
          stringEnds[stringEnds.length - 2].index,
          stringEnds[stringEnds.length - 1].index + 1
        );
        valueToAssign = operand.substring(1, operand.length - 1);
        typeToAssign = 'текст';
        this.source.markStringLiteral(
          this.currentLine,
          stringEnds[stringEnds.length - 2].index,
          stringEnds[stringEnds.length - 1].index + 1
        );
      }
    }

    if (valueToAssign == null) {
      operand = lastOf(trimmedInstruction.split(' '));
      if (isInt(operand)) {
        valueToAssign = parseInt(operand);
        typeToAssign = 'целочислен';
        const start = instruction.lastIndexOf(operand);
        this.source.markIntLiteral(this.currentLine, start, start + operand.length);
      } else if (isFloat(operand)) {
        valueToAssign = parseFloat(operand);
        typeToAssign = 'дробно число';
        const start = instruction.lastIndexOf(operand);
        this.source.markFloatLiteral(this.currentLine, start, start + operand.length);
      }
    }

    const keyword = "нека";
    if (valueToAssign == null) {
      const errorStart = instruction.indexOf(keyword) + keyword.length + 1;
      const errorEnd = instruction.length;
      this.source.markError(this.currentLine, errorStart, errorEnd);
      return {
        isError: true,
        message: "Декларацията на променлива трябва да завършва с име на " +
          "вече известна променлива, число, или текст в двойни кавички."
      };
    }

    const instructionWithoutOperand = instruction.substring(0, instruction.lastIndexOf(operand));
    const operator = lastOf(instructionWithoutOperand.trim().split(' '));

    if (operator != 'е' && operator != '=') {
      const errorStart = instructionWithoutOperand.lastIndexOf(operator);
      const errorEnd = errorStart + operator.length;
      this.source.markError(this.currentLine, errorStart, errorEnd);

      return {
        isError: true,
        message: "Операторът в декларацията трябва да е 'е' или '=', а не [" +
          operator + "]."
      };
    }

    const operatorStart = instructionWithoutOperand.lastIndexOf(operator);
    this.source.markArithmetic(this.currentLine, operatorStart, operatorStart + operator.length);

    const variableStart = instruction.indexOf(keyword) + keyword.length + 1;

    const variableName = instruction.substring(variableStart, operatorStart - 1).trim();
    this.source.markVariable(this.currentLine, variableStart, operatorStart - 1);

    this.symbolTable[variableName] = valueToAssign;
    this.typeOf[variableName] = typeToAssign;
  }

  performLabelDeclaration(instruction) {
    const labelName = instruction.trim();
    this.labelTable[labelName] = this.currentLine;
    this.source.markLabel(this.currentLine, labelName);
  }

  performGotoLabel(instruction) {
    this.source.markGoto(this.currentLine);

    const indent = this.computeIndent(instruction);
    const kwLength = "иди на".length;
    const argumentStart = indent + kwLength + 1;
    const argument = instruction.substring(argumentStart);

    if (!argument in this.labelTable) {
      return {
        isError: true,
        message: "Неизвестен още етикет [" + argument + "]."
      };
    }

    this.source.markLabel(
      this.currentLine,
      argument
    );

    this.currentLine = this.labelTable[argument];
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
    if (isInt(newValue)) {
      this.symbolTable[variableName] = parseInt(newValue, 10);
      this.typeOf[variableName] = 'целочислен';
    } else if (isFloat(newValue)) {
      this.symbolTable[variableName] = parseFloat(newValue, 10);
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
        baseIndent: baseIndent,
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