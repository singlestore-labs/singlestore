# SingleStoreClient eStore Example

## Purpose

This example demonstrates how to set up and interact with a SingleStore database using TypeScript. It includes creating a basic eStore database with tables for users and products, performing standard CRUD operations, and running various database methods to manage and query data.

## Getting Started

### 1. Install Dependencies

First, install all the necessary packages by running:

```bash
npm i
```

### 2. Build Packages

After installing dependencies, build the packages with:

```bash
npm run build
```

## Running the eStore Example

### 1. Navigate to the eStore Directory

Move to the eStore example directory:

```bash
cd ./examples/estore
```

### 2. Create a `.env` File

Copy the `.env.sample` file to `.env` and customize it according to your environment settings, such as database host, user, and password.

### 3. Start the Example

Start the eStore example with the following command:

```bash
npm run start
```

### 4. Monitor the Output

Check the console output to see the database setup, data insertion, and query results in real-time.

### 5. View Changes on the Portal

Access the portal to verify the impact of the operations performed by the script.

## Code Overview

### Main Function

The main function in `index.ts` is responsible for:

- Initializing a SingleStore client and connecting to a workspace.
- Setting up a database schema for users and products.
- Inserting a sample dataset into the database.
- Executing various SQL operations such as selecting, inserting, updating, and deleting records.
- Performing additional database management tasks like creating, renaming, and dropping tables.

### Database Operations

The script includes examples of:

- Creating a database and tables with predefined schemas.
- Inserting data into tables.
- Selecting specific records based on conditions.
- Updating and deleting records.
- Running custom SQL queries.

## Conclusion

This example serves as a practical guide for developers looking to interact with SingleStore using TypeScript. It provides a solid foundation for building applications that require database operations in a TypeScript environment.
