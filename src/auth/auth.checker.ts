// https://typegraphql.com/docs/authorization.html#how-to-use 참고

import { AuthChecker } from "type-graphql";
import { MyContextType } from "./auth.decorator";

export const customAuthChecker: AuthChecker<MyContextType> = (
  { root, args, context, info },
  roles
) => {
  return Boolean(context.user);
};
