import type { QueryBuilderArgs } from "./builder";
import type { QueryOptions } from "./options/builder";
import type { QuerySchema } from "./schema";

/**
 * Type utility to extract the `QueryOptions` from the arguments passed to the `QueryBuilder`.
 *
 * @typeParam T - The arguments passed to the `QueryBuilder`.
 *
 * This type checks if the first or second argument is of type `QueryOptions`.
 * If found, it returns the `QueryOptions`, otherwise it returns `never`.
 */
export type ExtractQueryOptions<T extends QueryBuilderArgs<any>> = T extends [infer A]
  ? A extends QueryOptions<any>
    ? A
    : never
  : T extends [any, infer B]
    ? B extends QueryOptions<any>
      ? B
      : never
    : never;

/**
 * Type utility to extract the columns specified in the `QueryOptions`.
 *
 * @typeParam T - The schema type being queried.
 * @typeParam U - The extracted `QueryOptions`.
 *
 * If the `columns` option is specified in `QueryOptions`, this type returns a `Pick` of the schema with only those columns.
 * If `columns` is not specified, it returns the entire schema.
 */
export type ExtractQueryColumns<T extends QuerySchema, U extends ExtractQueryOptions<any>> = U["columns"] extends never
  ? T
  : U["columns"] extends string[]
    ? Pick<T, U["columns"][number]>
    : T;
