import { Field, InputType, Int, ObjectType } from "type-graphql";

const PAGE_SIZE = 10;

@ObjectType()
export class CommonOutput {
  @Field((type) => Boolean)
  ok: boolean;

  @Field((type) => String, { nullable: true })
  error?: string;
}

@InputType()
export class CommonPaginatedInput {
  @Field((type) => Int, { defaultValue: 1 })
  page: number = 1;

  @Field((type) => Int, { defaultValue: PAGE_SIZE })
  pageSize: number = PAGE_SIZE;
}

@ObjectType()
export class CommonPaginatedOutput extends CommonOutput {
  @Field((type) => Int, { nullable: true })
  currentPage?: number;
  @Field((type) => Int, { nullable: true })
  currentCount?: number;

  @Field((type) => Int, { nullable: true })
  totalPage?: number;
  @Field((type) => Int, { nullable: true })
  totalCount?: number;

  @Field((type) => Int, { nullable: true })
  pageSize?: number;
}
