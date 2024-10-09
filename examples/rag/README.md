# SingleStoreClient RAG Example

## Purpose

This example demonstrates how to set up and interact with a SingleStore database using a Retrieve-and-Generate (RAG) system in TypeScript. It showcases how to integrate database tools, handle user interactions through a chat interface, and execute various database operations with user inputs.

## Getting Started

### 1. Install Dependencies

Run the following command to install all necessary packages:

```bash
npm i
```

### 2. Build Packages

After installing dependencies, build the packages by executing:

```bash
npm run build
```

## Running the RAG Example

### 1. Prerequisite

Ensure you have run the eStore example at least once to set up the required database.

### 2. Navigate to the RAG Directory

Change your current directory to the RAG example by running:

```bash
cd ./examples/rag
```

### 3. Set Up Environment Variables

Copy the `.env` file from the eStore example (`./examples/estore`) to the RAG directory (`./examples/rag`).

### 4. Start the Example

Launch the RAG example with the following command:

```bash
npm run start
```

### 5. Interact with the Chat

Use the terminal to interact with the system through a chat interface. You can ask questions or request information, and the system will process your inputs and return responses.

### 6. Exit the Chat

To end the session, type `bye` in the terminal.

## Code Overview

### Main Function

The main function in `index.ts` handles:

- Initializing the SingleStore client and connecting to a database workspace.
- Accessing the eStore database.
- Setting up a RAG system for interactive chat.
- Integrating various tools for database queries and text-to-SQL generation.
- Handling user input through a command-line interface and processing responses in real-time.

### Database and Chat Integration

The example integrates the database with a chat system, allowing users to:

- Query the database with natural language inputs.
- Generate SQL queries from text inputs.
- Retrieve information from the database and display it in a chat format.

## Conclusion

This example serves as a guide for developers looking to integrate SingleStore with a chat-based interface in TypeScript. It provides practical examples of database operations and real-time user interaction within a terminal environment.
