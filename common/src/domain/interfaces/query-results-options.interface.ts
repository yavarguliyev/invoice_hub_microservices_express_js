import { ObjectLiteral, Repository } from 'typeorm';

import { GetQueryResultsArgs } from '../../core/inputs/get-query-results.args';

export interface QueryResultsOptions<T extends ObjectLiteral, DTO, RelatedDTO = unknown> {
  repository: Repository<T>;
  query: GetQueryResultsArgs;
  dtoClass: new () => DTO;
  relatedEntity?: {
    RelatedDtoClass: new () => RelatedDTO;
    relationField: keyof T;
  };
};
