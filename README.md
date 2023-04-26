# MSSQL Data Source

A comprehensive, powerful Microsoft SQL Server Data Source that integrates easily with Apollo Server. Simplifies efficiently connecting to and querying Microsoft SQL Server databases. Uses node-mssql under the hood. This library provides an easy-to-use API for executing stored procedures and building business layer functionality.

## Features

- Separate configuration for Query and Mutation operations. Can connect to separate databases, use different credentials, log to separate sources, etc.
- Separate Connection Pools for Query and Mutation operations maintain active Database connections to ensure optimal performance.
- Built-in Stored procedure introspection. Parameter optionality, types, and default values are automatically determined from the database. Schemas are cached for efficient requests.
- Extendable, straightforward architecture, Type-safe Typescript API and plenty of documentation.

## Installation

```bash
pnpm install mssql-data-source
```

## Usage

To use the library, simply import the MSSQLDataSource class and either initalize it with your configuration information and use it directly in your resolvers, or subclass/compose it to add any additional required functionality.

Here's an example that covers using the Stored procedure Querying functionality of the library in an Apollo GraphQL Server.

1. First, we'll need to set up our GraphQL schema to support the stored procedure we want to execute.

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
type MyStoredProcedureResult {
  """
  The result sets from the stored procedure. In this example, we only care about the first result set (array).
  However, The framework will automatically map the result sets to the resultSets property.
  You can define the types for each result set in this property to get typed results for each.
  """
  resultSets: [[Person!]!]!
  """
  The PageCount Output parameter from our Stored Procedure.
  The framework will automatically map the output parameters and their values as properties of your Result type.
  """
  pageCount: Int
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

2. Next, we'll need to set up our data source and resolvers. (I recommend using [graphql-codegen](https://github.com/dotansimha/graphql-code-generator) to automatically generate types for our GraphQL Resolvers and Types from our schema)

```ts
import {
  Person,
  MyStoredProcedureInput,
  MyStoredProcedureResult,
  executeMyStoredProcedure,
  Resolvers,
} from 'my/generated/types';

import {
  MSSQLDataSource,
  DevConsoleLogger,
  type IResolverProcedureResult,
} from 'mssql-data-source';

const connectionString = '...';

const resolvers: Resolvers = {
  Query: {
    executeMyStoredProcedure: async (
      _,
      args: MyGraphQLInputArguments,
      context: MyContext,
    ): Promise<IResolverProcedureResult<Person>> => {
      const input = args.input;
      if (input === undefined) {
        return { resultSets: [[]] };
      }
      return await context
        .dataSources()
        .adminDatabase.executeStoredProcedureQuery(
          '[dbo].[My_Stored_Procedure]',
          input as StoredProcedureInput,
        );
    },
  },
};
```

## Executing Stored Procedures

You can execute stored procedures using the executeStoredProcedure method.

```ts
const storedProcedureName = 'YourStoredProcedure';
const parameters = {
  param1: 'value1',
  param2: 'value2',
};

const result = await dataSource.executeStoredProcedure(storedProcedureName, parameters);
```

## Logging

You can customize logging by implementing your own logger that adheres to the ILogger interface and passing it to the MSSQLDataSource constructor.

```ts
import { ILogger, MSSQLDataSource } from 'mssql-data-source';

class MyCustomLogger implements ILogger {
  log(message: string): void {
    // Your custom logging implementation
  }
  error(message: string): void {
    // Your custom error logging implementation
  }
}

const dataSource = new MSSQLDataSource(config, new MyCustomLogger());
```

## Documentation

For more detailed documentation, please refer to the source code.

## License

MIT
