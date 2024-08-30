export function parseLengthErrorMessage(
  message: Error["message"],
): [length: number | undefined, maxLength: number | undefined] {
  const [maxLength, length] = [...message.matchAll(/length\s+(\d+)/g)].map((match) => Number(match[1]));
  return [length, maxLength];
}
