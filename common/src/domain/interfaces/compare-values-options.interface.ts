import { SortOrder } from '../../core/types/redis-cache-keys.type';

export interface CompareValuesOptions<T> {
  a: T;
  b: T;
  key: keyof T;
  sortOrder: SortOrder;
};
