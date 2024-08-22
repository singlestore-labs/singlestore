/**
 * Type representing a generic schema for database queries.
 *
 * This type is a record where each key is a string representing a column name,
 * and the value can be of any type, representing the data type of that column.
 */
export type QuerySchema = Record<string, any>;
