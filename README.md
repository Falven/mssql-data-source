# MSSQL Data Source

A comprehensive, powerful Microsoft SQL Server Data Source that integrates easily with Apollo Server. Simplifies efficiently connecting to and querying Microsoft SQL Server databases. Uses node-mssql under the hood. This library provides an easy-to-use API for executing stored procedures and building business layer functionality.

## Backstory

I was searching for a suitable data source for an enterprise project that required using Microsoft SQL Server/Database on Azure. Our customer's solution heavily depends on stored procedures for auditing and other side effects. We don't want to re-engineer them, but we're looking for a convenient way to query and integrate them with GraphQL.

I came across [SQLDataSource](https://github.com/cvburgess/SQLDataSource) in the Apollo documentation, but it uses Knex under the hood, which doesn't contribute much to stored procedure execution and [adds an extra unnecessary abstraction layer on top of SQL](https://gajus.medium.com/stop-using-knex-js-and-earn-30-bf410349856c). I also found the [Slonik client](https://github.com/gajus/slonik), but it's only compatible with PostgreSQL databases.

As a result, I decided to create an MSSQL Data Source that simplifies querying and mutating stored procedure data while allowing you to focus on your GraphQL and SQL schemas. I also wanted to make it extendible and ensure it supports all the optimizations (caching, reusing connections, etc.) necessary in an enterprise environment, so I've implemented those features as well.

## Features

- Efficient implementation of [node-mssql](https://www.npmjs.com/package/mssql). Reuses DB connections (ConnectionPools), sanitizes SQL queries (tagged template literals), supports promises, transactions, prepared statements, and others...
- Implements Command Query Responsibility Segregation (CQRS) through separate connection pools for Query and Mutation operations.
- Separate configuration for Query and Mutation operations all you to connect to separate databases for queries and mutations, use different credentials, log to separate sources, etc.
- Stored Procedure schema introspection abstracts away the logic required to execute Stored Procedures. Parameter optionality, types, and default values are automatically determined from the database. Schemas are cached for efficient requests.
- Extendable, straightforward architecture and integration with Apollo. Easy to add business-layer functionality to query Microsoft SQL Server Databases without the need for an unnecessary abstraction like [Knex.js](https://knexjs.org/).
- Supports dynamic SQL. Gives you the flexibility to define your GraphQL and Database Schemas as you'd like. We'll take care of the rest.

## Installation

```bash
pnpm install mssql-data-source
```

## Usage

To use the library, simply import the MSSQLDataSource class and either initalize it with your configuration information and use it directly in your resolvers, or subclass/compose it to add any additional required functionality.

Here's an example that covers using the Stored procedure Querying functionality of the library in an Apollo GraphQL Server.

1. First, let's create our SQL Table:

   ```sql
   CREATE TABLE People
   (
       Id INT PRIMARY KEY IDENTITY(1, 1),
       FirstName NVARCHAR(50) NOT NULL,
       MiddleName NVARCHAR(50) NULL,
       LastName NVARCHAR(50) NOT NULL
   );

   INSERT INTO People (FirstName, MiddleName, LastName)
   VALUES ('John', 'A', 'Doe'),
         ('Jane', 'B', 'Doe'),
         ('Michael', 'C', 'Smith'),
         ('Emily', 'D', 'Johnson'),
         ('Daniel', 'E', 'Brown'),
         ('Emma', 'F', 'Jones'),
         ('Christopher', 'G', 'Davis'),
         ('Olivia', 'H', 'Miller'),
         ('Andrew', 'I', 'Wilson'),
         ('Isabella', 'J', 'Moore'),
   ```

2. Let's create our stored Procedure:

   ```sql
   CREATE PROCEDURE MyStoredProcedure
       @Page INT, -- The page number to retrieve
       @PageSize INT, -- The number of records per page
       @RecordCount INT OUTPUT -- The total number of records in the People table
   AS
   BEGIN
       -- Set the transaction isolation level to read uncommitted to avoid locks
       SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

       -- Calculate the starting row number for the given page
       DECLARE @RowStart INT = (@Page - 1) * @PageSize + 1;
       DECLARE @RowEnd INT = @Page * @PageSize;

       -- Retrieve the paged results and the total count of records
       SELECT Id,
             FirstName,
             MiddleName,
             LastName
       FROM (
           SELECT Id,
                 FirstName,
                 MiddleName,
                 LastName,
                 ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
           FROM People
       ) AS ResultsWithRowNum
       WHERE RowNum BETWEEN @RowStart AND @RowEnd;

       -- Get the total count of records in the People table
       SELECT @RecordCount = COUNT(*)
       FROM People;
   END;
   ```

3. Next, we'll need to set up our GraphQL schema to match the stored procedure we created. Note: MSSQL Data Source does not care about the casing of your schema properties. Only that match the parameters. So you can use camelCase, PascalCase, or snake_case... It doesn't matter. Optional parameters are also supported, you can omit these from your query.

   ```gql
   import { gql } from 'graphql-tag';

   export const typeDefs = gql`#graphql
   """
   Define our Person type.
   """
   type Person {
     firstName: String!
     middleName: String
     lastName: String!
   }

   """
   Define our stored procedure input arguments type.
   The framework will convert these properties to parameters sent to your stored procedure (MyStoredProcedure).
   The framework supports optional stored procedure parameters. Optional parameters may be omitted from the schema.
   """
   input MyStoredProcedureInput {
     page: Int
     pageSize: Int
     pageCount: Int # Our output parameter.
   }

   """
   Define our Stored Procedure Result type.
   Represents the results from executing the MyStoredProcedure stored procedure.
   """
   type MyStoredProcedureResult {
     """
     The result sets from the stored procedure. In this example, we only care about the first result set (array).
     However, The framework will automatically map the result sets to the resultSets property.
     You can define the types for each result set in this property to get typed results for each.
     """
     resultSets: [[Person!]!]!
     """
     The RecordCount Output parameter from our Stored Procedure.
     The framework will automatically map the output parameters and their values as properties of your Result type.
     """
     recordCount: Int
     # ... any other output parameters/scalars you want to return from your stored procedure.
   }

   type Query {
     """
     Define our Stored Procedure Query
     """
     executeMyStoredProcedure(input: MyStoredProcedureInput): MyStoredProcedureResult!
   }

   schema {
     query: Query
   }
   `;
   ```

4. Next, we'll need to set up our data source and resolvers. (I recommend using [graphql-codegen](https://github.com/dotansimha/graphql-code-generator) to automatically generate types for our GraphQL Resolvers and Types from our schema)

   ```ts
   /**
    * graphql-codegen generates this argument type using the typescript-resolvers plugin.
    */
   export type QueryExecuteMyStoredProcedureArgs = {
     input?: InputMaybe<MyStoredProcedureInput>;
   };

   import {
     Person, // Our Person type from our schema (generated).
     MyStoredProcedureInput, // Our input type from our schema (generated).
     MyStoredProcedureResult, // Our result type from our schema (generated).
     QueryExecuteMyStoredProcedureArgs, // Our arguments type (generated).
     Resolvers, // Our Resolvers type (generated).
   } from 'my/generated/types';

   import {
     MSSQLDataSource, // The main data source class.
     DevConsoleLogger, // A built-in logger that logs to the console on Dev environments.
     type IResolverProcedureResult, // The type for the result of a stored procedure.
   } from 'mssql-data-source';

   const resolvers: Resolvers = {
     Query: {
       executeMyStoredProcedure: async (
         _,
         args: QueryExecuteMyStoredProcedureArgs,
         context: MyContext,
       ): Promise<IResolverProcedureResult<Person>> => {
         const input = args.input;
         if (input === undefined) {
           return { resultSets: [[]] };
         }
         return await context
           .dataSources()
           .myDatabase.executeStoredProcedureQuery(
             '[dbo].[My_Stored_Procedure]',
             input as MyStoredProcedureInput,
           );
       },
     },
   };

   interface MyContext extends BaseContext {
     dataSources: () => {
       myDatabase: MSSQLDataSource;
     };
   }

   const server = new ApolloServer<MyContext>({
     typeDefs,
     resolvers,
   });

   const connectionString = '...';

   const { url } = await startStandaloneServer(server, {
     listen: { port: 5001 },
     context: async ({ req }) => ({
       dataSources: () => {
         if (!connectionString) {
           throw new Error('DATABASE_CONNECTION_STRING environment variable is not set.');
         }

         const logger = new DevConsoleLogger();
         return {
           adminDatabase: new MSSQLDataSource(
             // Our Query configuration.
             {
               config: connectionString,
               logger: logger,
             },
             // Our mutation configuration.
             {
               config: connectionString,
               logger: logger,
             },
           ),
         };
       },
     }),
   });
   ```

   That's it!

## Executing Our Stored Procedure

Let's create a query and execute it:

```gql
query ExecuteMyStoredProcedure($input: StoredProcedureInput) {
  executeMyStoredProcedure(input: $input) {
    resultSets {
      firstName
      middleName
      lastName
    }
    pageCount
  }
}
```

![Example Postman invocation.](/assets/images/Postman.png)

## Logging

You can customize logging by implementing your own logger that adheres to the ILogger interface and passing it to the MSSQLDataSource configuration. It also comes with a default `DevConsoleLogger` that logs informational messages to the console in `NODE_ENV !== 'production'` environments.

![Example logs.](/assets/images/Logs.png)

## Performance

The MSSQLDataSource class maintains separate connection pools for Query and Mutation operations. This ensures that your Query operations don't get blocked by long-running Mutation operations. It also ensures that your Mutation operations don't get blocked by long-running Query operations. This is especially important when using stored procedures that may take a long time to execute.

Because the MSSQLDataSource class needs schema and object definition information to determine stored procedure parameter optionality and modes (input vs output), it must query the database for this information. This is done once per stored procedure and cached for subsequent requests. By default, schemas are cached for 1 hour. This means that the first request to a stored procedure will be slower than subsequent requests. This is a one-time cost and is well worth the benefits.

### Apollo Server caching

To maximize the performance of your service, I would recommended you implement Apollo Server Caching. This can be easily implemented by including a plugin and adding some `@cacheControl` directives to your schema.

```graphql
import { gql } from 'graphql-tag';

export const typeDefs = gql`#graphql
"""
Define our Person type.
"""
type Person {
  firstName: String!
  middleName: String
  lastName: String!
}

"""
Define our stored procedure input arguments type.
The framework will convert these properties to parameters sent to your stored procedure (MyStoredProcedure).
The framework supports optional stored procedure parameters. Optional parameters may be omitted from the schema.
"""
input MyStoredProcedureInput {
  page: Int
  pageSize: Int
  pageCount: Int # Our output parameter.
}

"""
Define our Stored Procedure Result type.
Represents the results from executing the MyStoredProcedure stored procedure.
"""
type MyStoredProcedureResult @cacheControl(maxAge: 240) {
  """
  The result sets from the stored procedure. In this example, we only care about the first result set (array).
  However, The framework will automatically map the result sets to the resultSets property.
  You can define the types for each result set in this property to get typed results for each.
  """
  resultSets: [[Person!]!]! @cacheControl(maxAge: 240)
  """
  The RecordCount Output parameter from our Stored Procedure.
  The framework will automatically map the output parameters and their values as properties of your Result type.
  """
  recordCount: Int @cacheControl(maxAge: 240)
  # ... any other output parameters/scalars you want to return from your stored procedure.
}

type Query {
  """
  Define our Stored Procedure Query
  """
  executeMyStoredProcedure(input: MyStoredProcedureInput): MyStoredProcedureResult!
}

schema {
  query: Query
}
`;
```

```ts
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl';

const server = new ApolloServer<MyContext>({
  typeDefs,
  resolvers,
  plugins: [ApolloServerPluginCacheControl()],
});
```

[See the latest Apollo Docs for more detailed information on implementing operation result caching.](https://www.apollographql.com/docs/apollo-server/performance/caching/).

When used in conjunction with Apollo Server caching, you have a lightning fast solution with all of the power of GraphQL operations and the safety of Stored Procedures. Apollo Caches your query and subquery results, while MSSQLDataSource caches your stored procedure metadata and Database connections.

## Future Plans

- Add better support for more complex stored procedure result set types.
- Use a T-SQL Parser instead of a regular expression to parse the Stored Procedure definition.
- Add schema caching configuration options.
- Add support for Table-Valued Parameters.
- Add support for User-Defined Table Types.

## Documentation

For more detailed documentation, please refer to the source code.

## License

MIT
