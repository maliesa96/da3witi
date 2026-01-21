/**
 * Removes leading indentation from multiline strings while preserving
 * the relative indentation of the content.
 */
export function dedent(strings: TemplateStringsArray, ...values: unknown[]) {
  const fullString = strings.reduce((acc, str, i) => {
    return acc + str + (values[i] ?? '');
  }, '');

  const lines = fullString.split('\n');
  
  // Find the minimum indentation (ignoring empty lines)
  const minIndent = lines
    .filter(line => line.trim().length > 0)
    .reduce((min, line) => {
      const indent = line.match(/^\s*/)?.[0].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);

  // Remove the minimum indentation from each line and trim start/end of the whole block
  return lines
    .map(line => line.slice(minIndent === Infinity ? 0 : minIndent))
    .join('\n')
    .trim();
}
