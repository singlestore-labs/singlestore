import { QueryBuilderArgs } from "./builder";
import { QueryOptions } from "./options/builder";
import { QuerySchema } from "./schema";

export type ExtractQueryOptions<T extends QueryBuilderArgs<any>> = T extends [infer A]
  ? A extends QueryOptions<any>
    ? A
    : never
  : T extends [infer A, infer B]
    ? B extends QueryOptions<any>
      ? B
      : never
    : never;

export type ExtractQueryColumns<T extends QuerySchema, U extends ExtractQueryOptions<any>> = U["columns"] extends never
  ? T
  : U["columns"] extends string[]
    ? Pick<T, U["columns"][number]>
    : T;
