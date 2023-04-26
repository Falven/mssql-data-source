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

To use the library, import the MSSQLDataSource class and create an instance of it with your database configuration.

```ts
import { MSSQLDataSource } from 'mssql-data-source';

const config = {
  server: 'your_server',
  database: 'your_database',
  user: 'your_user',
  password: 'your_password',
};

const dataSource = new MSSQLDataSource(config);
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
