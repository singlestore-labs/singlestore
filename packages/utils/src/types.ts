export type Defined<T> = Exclude<T, undefined>;

export type Override<T extends object, K extends object> = Omit<T, keyof K> & K;

export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & {
  [C in keyof Pick<T, K>]?: T[C];
};

export type PartialDeep<T> = T extends object ? { [P in keyof T]?: PartialDeep<T[P]> } : T;
