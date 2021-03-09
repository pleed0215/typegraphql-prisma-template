# type-graphql & prisma set up template

## 1. 셋업

### 0) npm & git init

### 1) package install

- apollo server & graphql
- typescript instsall & setup
- tsconfig.json 만들고 && 설정
- prisma install / @prisma/client 설치
  > npx prisma init
  > 로 prisma 초기화
  - 초기화 후 대략적인 설정 때려 넣음.
- typegraphql 및 typegraphql-prisma 관련 패키지 설치

  > class-validator, graphql-fields, graphql-iso-date, graphql-scalars, graphql-tools, typegraphql-prisma, type-graphql 등..

- 그 외에 node 관련된 패키지 설치
  > morgan, dotenv, crossenv, rimraf
- aws, s3 관련된 패키지 install
  > aws-sdk,
- graphql upload 관련하여 fs-capacitor 관련 버그로 인한 npm-force-resolutions 관련 패키지 설치 및 package.json 설정.

- typescript typegraphql prisma 관련된 설정은..
  - [TypeGraphQL](https://typegraphql.com/docs/prisma.html)
  - [TypeGraphQL-Prisma](https://www.npmjs.com/package/typegraphql-prisma)
  - [GraphQL-ISO-Date](https://www.npmjs.com/package/graphql-iso-date)
  - [graphql-typescript.config](https://github.com/MichalLytek/type-graphql/blob/master/tsconfig.json)

위 링크 참고 하면서 함

- @types/node, @types/express도 따로 설정함.

### 2) package.json 설정

```json
    "preinstall": "npx npm-force-resolutions",
    "postinstall": "npx prisma generate",
    "predev": "tsc",
    "dev": "cross-env NODE_ENV=debug tsc-watch --onSuccess 'node dist/index.js'",
    "migrate": "prisma migrate dev --preview-feature",
    "studio": "prisma studio",
    "pregenerate": "rimraf src/generated",
    "generate": "prisma generate"
```

- install 관련: npm-force-resolutions 및 type-graphql generate 재설정.
- predev/dev: tsc 설정 & 컴파일
- migrate: db schema 변경.
- studio: prisma studio로 런.
- generate: 자동으로 생성되는 typescript 관련 파일들 만들기.

### 3) apollo 및 express, http 설정.

- src/index.ts

```ts
// .env 파일 읽기
dotenv.config({ path: __dirname + "/../.env" });

// express instance 만들기.
const app = express();

// subscription 관련 설정 때문에 사용.
const httpServer = http.createServer(app);
```

- src/index.ts / main

```ts
const { typeDefs, resolvers: appResolvers } = await buildTypeDefsAndResolvers({
  resolvers: [__dirname + "/**/*.resolvers.{ts,js}"],
  pubSub,
  authChecker: customAuthChecker,
});
```

    - resolvers.ts/js로 끝나는 파일들에서 typeDefs와 resolvers를 읽어오도록 설정해줌.
    - pubSub
        src/pubSub.ts에서 pubSub instance를 만들어서 exporting해준 것을 여기서 설정해줌.
    - authChecker
        - nestjs의 auth guard와 비슷한 역할을 함.
        src/auth/auth.checker.ts

```ts
export const customAuthChecker: AuthChecker<MyContextType> = (
  { root, args, context, info },
  roles
) => {
  return Boolean(context.user);
};
```

        - 소스 자체가 아주 간단함. context.user 여부에 따라서 authorization이 결정이 됨.
        - resolvers에서 @Authorization() decorator를 사용하면 작동함.
        - [AuthChecker](https://typegraphql.com/docs/authorization.html)
            공식 사이트의 예제를 보면 role based authorization도 가능하다.

        말이 나온김에 src/auth/auth.decorator.ts도 보면...

```ts
export interface MyContextType {
  user?: User;
}

// @ts-ignore
export const AuthUser = () => {
  return createParamDecorator<MyContextType>(({ context }) => context.user);
};
```

        이렇게 decorator를 custom해서 만들어 볼 수도 있다.
        위 데코레이터도 간단한 소스 코드. context에서 user를 뽑아서 리턴해주는 것.

다시 main 함수에서..

```ts
const schema = makeExecutableSchema({ typeDefs, resolvers: appResolvers });
const server = new ApolloServer({
    schema,
    playground: true,
    // authentication part.
    context: async ({ req, connection }): Promise<Context> => {
        ...
        중
        략
        const context = {
        user,
        prisma: prismaClient,
      };

      return context;
    },
  });
```

context에서 authentication / prismaClient 전달.
prisma client가 전달이 되어야 일부 resolver가 잘 작동. typegraphql-prisma 와 관련된 작동이라고 추정이 되는데... prisma client를 전달해주지 않으면 가끔 throw error되거나 / 원하는대로 resolver가 잘 작동을 안함.

```ts
// morgan -> logging 관련된 middleware
app.use(logger("tiny"));

// static 설정. instagram clone backed에서는 굳이 사용 안해도 됨.
app.use("/static", express.static("uploads"));

// apollo server와 express 연결.
server.applyMiddleware({ app });
// subscription 때문에 필요한 설정.
server.installSubscriptionHandlers(httpServer);

// 서버 런.
httpServer.listen({ port: PORT }, () => {
  console.log(`🤗 Express server start with PORT ${PORT}`);
});

...

main()
  .catch((e) => {
    throw e;
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
```

### resolver 사용방법은 nestjs에서 사용한 방법과 유사..
