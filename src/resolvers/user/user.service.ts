import {
  CreateAccountInput,
  CreateAccountOutput,
  ToggleFollowUserInput,
  ToggleFollowUserOutput,
  LoginInput,
  LoginOutput,
  SeeProfileInput,
  SeeprofileOutput,
  UpdateProfileInput,
  UpdateProfileOutput,
  SeeFollowersInput,
  SeeFollowersOutput,
  SeeFollowingsInput,
  SeeFollowingsOutput,
  SearchUserInput,
  SearchUserOutput,
} from "../../dtos/user.dto";
import { prismaClient } from "../../prismaClient";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import { uploadFile } from "../../aws/s3";
import { User } from "../../generated/typegraphql-prisma";

export class UserService {
  async seeProfile(input: SeeProfileInput): Promise<SeeprofileOutput> {
    const { username } = input;
    try {
      const user = await prismaClient.user.findUnique({ where: { username } });

      if (user) {
        return {
          ok: true,
          user,
        };
      } else {
        throw new Error("Cannot create user.");
      }
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async createAccount(input: CreateAccountInput): Promise<CreateAccountOutput> {
    const {
      username,
      email,
      password: beforeHash,
      firstName,
      lastName,
    } = input;
    try {
      const existingUser = await prismaClient.user.findFirst({
        where: {
          OR: [
            {
              username,
            },
            {
              email,
            },
          ],
        },
      });
      if (existingUser) {
        throw new Error(
          "That email address or username is already exist. Try another"
        );
      }
      const afterHash = await bcrypt.hash(beforeHash, 10);
      const user = await prismaClient.user.create({
        data: {
          username,
          email,
          password: afterHash,
          firstName,
          lastName,
        },
      });

      if (user) {
        return {
          ok: true,
        };
      } else {
        throw new Error("Cannot create user");
      }
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async login({ username, password }: LoginInput): Promise<LoginOutput> {
    try {
      const user = await prismaClient.user.findUnique({ where: { username } });

      if (user) {
        if (await bcrypt.compare(password, user.password)) {
          const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY);
          return {
            ok: true,
            token,
          };
        } else {
          throw new Error("Password incorrect");
        }
      } else {
        throw new Error("User does not exist.");
      }
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async updateProfile({
    id,
    ...updateInput
  }: UpdateProfileInput): Promise<UpdateProfileOutput> {
    try {
      const user = await prismaClient.user.findUnique({ where: { id } });
      if (user) {
        const {
          password,
          avatar: avatarInput,
          ...elseAvatarAndPassword
        } = updateInput;
        let avatar;

        if (avatarInput) {
          // upload to s3 bucket.
          const uploadResult = await uploadFile(await avatarInput);
          if (uploadResult.ok) {
            avatar = uploadResult.url;
            console.log(uploadResult);
          } else {
            console.log(uploadResult.error);
            throw new Error("Failed to upload");
          }
        }

        let newPassword;
        // new password -> hash again password.
        if (password) {
          newPassword = await bcrypt.hash(password, 10);
        }
        const result = await prismaClient.user.update({
          where: { id },
          data: {
            // conditional spread operator.
            ...(newPassword && { password: newPassword }),
            ...(avatar && { avatar }),
            ...elseAvatarAndPassword,
          },
        });

        if (result.id) {
          return {
            ok: true,
          };
        } else {
          throw new Error("Update profile failed");
        }
      } else {
        throw new Error("Update profile failed. User does not exist.");
      }
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async toggleFollowUser(
    authUser: User,
    { username }: ToggleFollowUserInput
  ): Promise<ToggleFollowUserOutput> {
    try {
      let message;
      if (!authUser) {
        throw new Error(
          "Authentication failed, invalid user information was provided."
        );
      }
      // TODO: 이거 잘못된 코드라 수정해야함.
      const userDetail = await prismaClient.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          following: true,
        },
      });

      if (userDetail?.following?.some((f) => f.username === username)) {
        message = `Unfollowed ${username}.`;

        const result = await prismaClient.user.update({
          where: {
            id: userDetail.id,
          },
          data: {
            following: {
              disconnect: {
                username,
              },
            },
          },
        });

        if (result.id) {
          return {
            ok: true,
            message,
            isFollow: false,
          };
        } else {
          throw new Error("Error occured while removing follower.");
        }
      } else {
        message = `Followed ${username}`;

        const result = await prismaClient.user.update({
          where: {
            id: userDetail?.id,
          },
          data: {
            following: {
              connect: {
                username,
              },
            },
          },
        });

        if (result.id) {
          return {
            ok: true,
            message,
            isFollow: true,
          };
        } else {
          throw new Error("Error occured while adding follower.");
        }
      }
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async seeFollowers({
    username,
    page,
    pageSize,
  }: SeeFollowersInput): Promise<SeeFollowersOutput> {
    try {
      // 제대로 작동 여부 확인 못함.
      const temp = await prismaClient.user.count({
        where: {
          following: {
            some: {
              username,
            },
          },
        },
      });

      const totalCount = temp; //user?.followers.length!;
      const totalPage = Math.ceil(totalCount / pageSize);
      const lastPageCount = totalCount % pageSize;
      const currentCount = page < totalPage ? pageSize : lastPageCount;
      const currentPage = page < totalPage ? page : totalPage;
      const startIndex = (currentPage - 1) * pageSize;
      const followers = await prismaClient.user.findMany({
        where: {
          following: {
            some: {
              username,
            },
          },
        },
        skip: startIndex,
        take: pageSize,
      });
      //const followers = user?.followers.slice(startIndex, currentCount);

      return {
        ok: true,
        totalCount,
        totalPage,
        currentCount,
        currentPage,
        pageSize,
        followers,
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }
  async seeFollowings({
    username,
    page,
    pageSize,
  }: SeeFollowingsInput): Promise<SeeFollowingsOutput> {
    try {
      const temp = await prismaClient.user.count({
        where: {
          followers: {
            some: {
              username,
            },
          },
        },
      });

      const totalCount = temp; //user?.following.length!;
      const totalPage = Math.ceil(totalCount / pageSize);
      const lastPageCount = totalCount % pageSize;
      const currentCount = page < totalPage ? pageSize : lastPageCount;
      const currentPage = page < totalPage ? page : totalPage;
      const startIndex = (currentPage - 1) * pageSize;
      const followings = await prismaClient.user.findMany({
        where: {
          followers: {
            some: {
              username,
            },
          },
        },
        skip: startIndex,
        take: pageSize,
      }); //user?.following.slice(startIndex, currentCount);

      return {
        ok: true,
        totalCount,
        totalPage,
        currentCount,
        currentPage,
        pageSize,
        followings,
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }

  async totalFollowers(username): Promise<number> {
    try {
      const count = await prismaClient.user.count({
        where: {
          following: {
            some: {
              username,
            },
          },
        },
      });
      return count;
    } catch (e) {
      throw new Error(e.message);
    }
  }
  async totalFollowings(username): Promise<number> {
    try {
      const count = await prismaClient.user.count({
        where: {
          followers: {
            some: {
              username,
            },
          },
        },
      });
      return count;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async isMe(authUser: User, username): Promise<boolean> {
    try {
      return authUser.username === username;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async isFollowing(authUser: User, username): Promise<boolean> {
    try {
      /*const followingsWithName = await prismaClient.user
          .findUnique({
            where: {
              username: authUser.username,
            },
          })
          .following({
            where: {
              username,
            },
          });
  
        return followingsWithName.length !== 0;*/
      const exist = await prismaClient.user.count({
        where: {
          username,
          following: {
            some: {
              username,
            },
          },
        },
      });
      return Boolean(exist);
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async isFollower(authUser: User, username): Promise<boolean> {
    try {
      const followersWithName = await prismaClient.user
        .findUnique({
          where: {
            username: authUser.username,
          },
        })
        .followers({
          where: {
            username,
          },
        });

      return followersWithName.length !== 0;
    } catch (e) {
      throw new Error(e.message);
    }
  }

  async searchUser({
    keyword,
    page,
    pageSize,
  }: SearchUserInput): Promise<SearchUserOutput> {
    try {
      const totalCount = await prismaClient.user.count({
        where: {
          username: {
            contains: keyword,
            mode: "insensitive",
          },
        },
      });
      const totalPage = Math.ceil(totalCount / pageSize);
      const results = await prismaClient.user.findMany({
        where: {
          username: {
            contains: keyword,
            mode: "insensitive",
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const currentCount = results.length;
      const currentPage = page;

      return {
        ok: true,
        totalCount,
        totalPage,
        currentPage,
        currentCount,
        pageSize,
        results,
      };
    } catch (e) {
      return {
        ok: false,
        error: e.message,
      };
    }
  }
}
