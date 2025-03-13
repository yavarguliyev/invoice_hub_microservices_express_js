export type IEntityWithId<T extends object = {}> = T & { id: number | string };
