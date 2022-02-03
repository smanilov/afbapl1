// Whether the given text can be completely parsed as an integer.
export function isInt(text) {
  const intValue = parseInt(text, 10);
  return !isNaN(intValue) && ('' + intValue) === text.trim();
}

// Whether the given text can be completely parsed as a float.
export function isFloat(text) {
  const floatValue = parseFloat(text, 10);
  var matcher = floatValue;
  if (Math.floor(floatValue) == floatValue) {
    matcher = '^' + matcher + '(\.0+)?$';
  } else {
    matcher = '^' + matcher + '$';
  }
  const matches = text.trim().match(new RegExp(matcher));
  return !isNaN(floatValue) && matches != null && matches.length > 0;
}

export function isStringLiteral(text) {
  return text.startsWith('"') && text.endsWith('"');
}