import {
  Arg,
  Authorized,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  ResolverInterface,
  Root,
} from "type-graphql";
import { User } from "../../generated/typegraphql-prisma";
import { prismaClient } from "../../prismaClient";
import {
  CreateAccountInput,
  CreateAccountOutput,
  LoginInput,
  LoginOutput,
  SearchUserInput,
  SearchUserOutput,
  SeeFollowersInput,
  SeeFollowersOutput,
  SeeFollowingsInput,
  SeeFollowingsOutput,
  SeeProfileInput,
  SeeprofileOutput,
  ToggleFollowUserInput,
  ToggleFollowUserOutput,
  UpdateProfileInput,
  UpdateProfileOutput,
} from "../../dtos/user.dto";

import { UserService } from "./user.service";
import { AuthUser } from "../../auth/auth.decorator";

@Resolver((of) => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {
    this.userService = new UserService();
  }
  @Query((returns) => SeeprofileOutput)
  seeProfile(@Arg("input") input: SeeProfileInput): Promise<SeeprofileOutput> {
    return this.userService.seeProfile(input);
  }

  @Mutation((returns) => CreateAccountOutput)
  createAccount(
    @Arg("input") input: CreateAccountInput
  ): Promise<CreateAccountOutput> {
    return this.userService.createAccount(input);
  }

  @Mutation((returns) => LoginOutput)
  login(@Arg("input") input: LoginInput): Promise<LoginOutput> {
    return this.userService.login(input);
  }

  @Mutation((returns) => UpdateProfileOutput)
  @Authorized()
  updateProfile(
    @AuthUser() currentUser,
    @Arg("input") input: UpdateProfileInput
  ): Promise<UpdateProfileOutput> {
    return this.userService.updateProfile(input);
  }

  @Mutation((returns) => ToggleFollowUserOutput)
  @Authorized()
  toggleFollow(
    @AuthUser() authUser,
    @Arg("input") input: ToggleFollowUserInput
  ) {
    return this.userService.toggleFollowUser(authUser, input);
  }

  @Query((returns) => SeeFollowersOutput)
  @Authorized()
  seeFollowers(
    @Arg("input") input: SeeFollowersInput
  ): Promise<SeeFollowersOutput> {
    return this.userService.seeFollowers(input);
  }

  @Query((returns) => SeeFollowingsOutput)
  @Authorized()
  seeFollowings(
    @Arg("input") input: SeeFollowingsInput
  ): Promise<SeeFollowingsOutput> {
    return this.userService.seeFollowings(input);
  }

  @FieldResolver((types) => Int)
  @Authorized()
  totalFollowers(@Root() user: User): Promise<number> {
    return this.userService.totalFollowers(user.username);
  }

  @FieldResolver((types) => Int)
  @Authorized()
  totalFollowings(@Root() user: User): Promise<number> {
    return this.userService.totalFollowings(user.username);
  }

  @FieldResolver((type) => Boolean)
  @Authorized()
  isMe(@AuthUser() authUser: User, @Root() user: User): Promise<boolean> {
    return this.userService.isMe(authUser, user.username);
  }
  @FieldResolver((type) => Boolean)
  @Authorized()
  isFollowing(
    @AuthUser() authUser: User,
    @Root() user: User
  ): Promise<boolean> {
    return this.userService.isFollowing(authUser, user.username);
  }
  @FieldResolver((type) => Boolean)
  @Authorized()
  isFollower(@AuthUser() authUser: User, @Root() user: User): Promise<boolean> {
    return this.userService.isFollower(authUser, user.username);
  }

  @Query((type) => SearchUserOutput)
  @Authorized()
  searchUser(@Arg("input") input: SearchUserInput): Promise<SearchUserOutput> {
    return this.userService.searchUser(input);
  }
}
