import type { QueryBuilderArgs } from "./builder";
import type { QueryOptions } from "./options/builder";
import type { QuerySchema } from "./schema";

export type ExtractQueryOptions<T extends QueryBuilderArgs<any>> = T extends [infer A]
  ? A extends QueryOptions<any>
    ? A
    : never
  : T extends [any, infer B]
    ? B extends QueryOptions<any>
      ? B
      : never
    : never;

export type ExtractQueryColumns<T extends QuerySchema, U extends ExtractQueryOptions<any>> = U["columns"] extends never
  ? T
  : U["columns"] extends string[]
    ? Pick<T, U["columns"][number]>
    : T;
