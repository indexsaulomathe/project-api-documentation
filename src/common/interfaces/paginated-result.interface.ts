export interface PaginatedResult<T> {
  meta: { total: number; page: number; lastPage: number; limit: number };
  data: T[];
}
