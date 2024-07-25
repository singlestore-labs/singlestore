export type KeyOf<T> = Extract<keyof T, string>;

export type FlexKeyOf<T> = ({} & string) | KeyOf<T>;

export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & { [C in keyof Pick<T, K>]?: T[C] };
