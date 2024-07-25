import { QueryBuilderArgs } from "./builder";
import { QueryOptions } from "./options/builder";

export type ExtractQueryBuilderOptionsArg<T extends QueryBuilderArgs<any>> = T extends [infer A]
  ? A extends QueryOptions<any>
    ? A
    : never
  : T extends [infer A, infer B]
    ? B extends QueryOptions<any>
      ? B
      : never
    : never;
