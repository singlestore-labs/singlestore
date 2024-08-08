import { type QueryFilters, QueryFiltersBuilder } from "./filters/builder";
import { queryOptionKeys, type QueryOptions, QueryOptionsBuilder } from "./options/builder";
import type { QuerySchema } from "./schema";

export type QueryBuilderArgs<T extends QuerySchema> =
  | [filters?: QueryFilters<T>]
  | [options?: QueryOptions<T>]
  | [filters?: QueryFilters<T>, options?: QueryOptions<T>];

export class QueryBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<"where" | Exclude<keyof QueryOptions, "columns">, string> = {
    where: "",
    groupBy: "",
    orderBy: "",
    limit: "",
    offset: "",
  };
  clause: string;
  values: T[keyof T][] = [];

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
