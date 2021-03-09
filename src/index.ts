import "reflect-metadata";
import http from "http";
import * as dotenv from "dotenv";
import * as jwt from "jsonwebtoken";
import logger from "morgan";
import { GraphQLSchema } from "graphql";
import express from "express";
import { buildTypeDefsAndResolvers, buildSchema } from "type-graphql";
import { pubSub } from "./pubSub";
import { customAuthChecker } from "./auth/auth.checker";
import { resolvers, User } from "./generated/typegraphql-prisma";
import { makeExecutableSchema, stitchSchemas } from "graphql-tools";
import { ApolloServer } from "apollo-server-express";
import { prismaClient } from "./prismaClient";
import { Context } from "node:vm";

dotenv.config({ path: __dirname + "/../.env" });

const PORT = +process.env.PORT! || 3000;
let schema: GraphQLSchema;
const app = express();
const httpServer = http.createServer(app);

const main = async () => {
  const { typeDefs, resolvers: appResolvers } = await buildTypeDefsAndResolvers(
    {
      resolvers: [__dirname + "/**/*.resolvers.{ts,js}"],
      pubSub,
      authChecker: customAuthChecker,
    }
  );

  const schema = makeExecutableSchema({ typeDefs, resolvers: appResolvers });

  const server = new ApolloServer({
    schema,
    playground: true,
    // authentication part.
    context: async ({ req, connection }): Promise<Context> => {
      const token = req ? req.headers["x-jwt"] : connection?.context["x-jwt"];
      let user: User | null = null;

      if (token) {
        try {
          const decoded = jwt.verify(token.toString(), process.env.SECRET_KEY);
          if (typeof decoded === "object" && decoded.hasOwnProperty("id")) {
            //@ts-ignore
            user = await prismaClient.user.findUnique({
              // @ts-ignore
              where: { id: decoded["id"] },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                email: true,
              },
            });
          }
        } catch {
          user = null;
        }
      }
      const context = {
        user,
        prisma: prismaClient,
      };

      return context;
    },
  });
  app.use(logger("tiny"));
  app.use("/static", express.static("uploads"));
  server.applyMiddleware({ app });
  server.installSubscriptionHandlers(httpServer);

  httpServer.listen({ port: PORT }, () => {
    console.log(`🤗 Express server start with PORT ${PORT}`);
  });
};

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
