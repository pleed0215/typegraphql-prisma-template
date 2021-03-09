import { User } from "@prisma/client";
import { createParamDecorator } from "type-graphql";

export interface MyContextType {
  user?: User;
}

// @ts-ignore
export const AuthUser = () => {
  return createParamDecorator<MyContextType>(({ context }) => context.user);
};
