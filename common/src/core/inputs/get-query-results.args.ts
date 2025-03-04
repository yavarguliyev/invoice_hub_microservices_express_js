import { IsPositive, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class GetQueryResultsArgs {
    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    page: number = 1;

    @IsOptional()
    @IsPositive()
    @Type(() => Number)
    limit: number = 10;

    @IsOptional()
    @IsObject()
    @Type(() => Object)
    filters: Record<string, any> = {};

    @IsOptional()
    @IsObject()
    @Type(() => Object)
    order: Record<string, 'ASC' | 'DESC'> = {};
}
