export function getKeyByValue<T extends Record<string, unknown>>(object: T, value: T[keyof T]): keyof T | undefined {
  for (const key in object) {
    if (object[key] === value) {
      return key as keyof T;
    }
  }

  return undefined;
}
