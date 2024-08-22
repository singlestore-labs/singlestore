import type { QuerySchema } from "./schema";

import { type QueryFilters, QueryFiltersBuilder } from "./filters/builder";
import { queryOptionKeys, type QueryOptions, QueryOptionsBuilder } from "./options/builder";

/**
 * Type representing the possible argument combinations that can be passed to the `QueryBuilder` constructor.
 *
 * @typeParam T - The schema type being queried.
 *
 * This type allows for the following combinations:
 * - Only filters
 * - Only options
 * - Both filters and options
 */
export type QueryBuilderArgs<T extends QuerySchema> =
  | [filters?: QueryFilters<T>]
  | [options?: QueryOptions<T>]
  | [filters?: QueryFilters<T>, options?: QueryOptions<T>];

/**
 * Class responsible for building SQL query strings from filters and options.
 *
 * @typeParam T - The schema type being queried.
 *
 * @property {string} columns - The SQL columns clause generated from the query options.
 * @property {Record<"where" | Exclude<keyof QueryOptions<T>, "columns">, string>} clauses - An object containing the SQL clauses generated from the filters and options.
 * @property {string} clause - The complete SQL query string composed of all the clauses.
 * @property {T[keyof T][]} values - The array of values corresponding to the placeholders in the SQL query.
 */
export class QueryBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<"where" | Exclude<keyof QueryOptions<T>, "columns">, string> = {
    where: "",
    groupBy: "",
    orderBy: "",
    limit: "",
    offset: "",
  };
  clause: string;
  values: T[keyof T][] = [];

  /**
   * Constructs a new `QueryBuilder` instance.
   *
   * @param {...QueryBuilderArgs<T>} args - The filters and/or options used to build the SQL query.
   *
   * This constructor initializes the query builder by processing the provided filters and options,
   * and generates the corresponding SQL query string and values.
   */
  constructor(...args: QueryBuilderArgs<T>) {
    let filtersBuilder: QueryFiltersBuilder<T> = new QueryFiltersBuilder();
    let optionsBuilder: QueryOptionsBuilder<T> = new QueryOptionsBuilder();

    if (args.length === 1) {
      if (args[0] && queryOptionKeys.some((key) => key in args[0]!)) {
        optionsBuilder = new QueryOptionsBuilder(args[0] as QueryOptions<T>);
      } else {
        filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      }
    } else {
      filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      optionsBuilder = new QueryOptionsBuilder(args[1] as QueryOptions<T>);
    }

    this.columns = optionsBuilder.columns;
    this.clauses = { where: filtersBuilder.clause, ...optionsBuilder.clauses };
    this.clause = Object.values(this.clauses).join(" ");
    this.values = filtersBuilder.values;
  }
}
