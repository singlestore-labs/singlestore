export type FlexKeyOf<T> = ({} & string) | Extract<keyof T, string>;

export type Optional<T extends Record<any, any>, K extends keyof T> = Omit<T, K> & { [C in keyof Pick<T, K>]?: T[C] };
