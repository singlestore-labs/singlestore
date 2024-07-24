import { QueryFilters, QueryFiltersBuilder } from "./filters/builder";
import { QueryOptions, QueryOptionsBuilder } from "./options/builder";
import { QuerySchema } from "./types";

export class QueryBuilder<T extends QuerySchema> {
  columns: string = "*";
  clauses: Record<"where" | "orderBy" | "limit", string> = { where: "", orderBy: "", limit: "" };
  clause: string = "";
  values: T[keyof T][] = [];

  constructor(
    ...args: [filters: QueryFilters<T>] | [options: QueryOptions<T>] | [filters: QueryFilters<T>, options: QueryOptions<T>]
  ) {
    let filtersBuilder: QueryFiltersBuilder<T> = new QueryFiltersBuilder();
    let optionsBuilder: QueryOptionsBuilder<T> = new QueryOptionsBuilder();

    if (args.length === 1) {
      if ("orderBy" in args[0] || "limit" in args[0]) {
        optionsBuilder = new QueryOptionsBuilder(args[0] as QueryOptions<T>);
      } else {
        filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      }
    } else {
      filtersBuilder = new QueryFiltersBuilder(args[0] as QueryFilters<T>);
      optionsBuilder = new QueryOptionsBuilder(args[1] as QueryOptions<T>);
    }

    this.columns = optionsBuilder.columns;
    this.clause = [filtersBuilder.clause, ...Object.values(optionsBuilder.clauses)].join(" ");
    this.values = filtersBuilder.values;
  }
}
