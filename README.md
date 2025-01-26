# Algo-DiD-Nest-js

Algo-DiD-Nest-js is a NestJS application for managing Decentralized Identifiers (DiDs) on the Algorand blockchain. This project provides RESTful endpoints for creating, updating, resolving, and deleting DiDs, along with a Swagger page for documentation and testing.

## What are Decentralized Identifiers (DiDs)?

Decentralized Identifiers (DiDs) are a modern, self-sovereign way to establish digital identities. Unlike traditional identifiers that rely on centralized authorities (e.g., email addresses, usernames), DiDs:

- Are owned and controlled by the individual or entity they represent.
- Use cryptography to ensure verifiability and security.
- Do not depend on centralized registries or intermediaries, leveraging blockchain or decentralized networks instead.

Each DiD has an associated DID Document containing metadata (e.g., public keys, service endpoints) necessary for interactions.

## Features

- Create a new DiD and its associated DID Document.
- Update an existing DID Document.
- Delete a DID Document.
- Resolve a DiD into its DID Document.
- Integrates with the Algorand blockchain for decentralization and scalability.

## Prerequisites

- Node.js version 18+.
- An Algorand master account mnemonic for issuing DiDs.

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/paulOgwulumba/algo-did-nestjs.git
cd algo-did-nestjs
```

### Install Dependencies

```bash
yarn install
```

### Set Up Environment Variables

Create a `.env` file in the root directory based on the `env.example` file:

```env
MASTER_MNEMONIC=<your-master-account-mnemonic>
ALGOD_SERVER=<algod-server-url>
ALGOD_SERVER=<algod-token>
ALGOD_PORT=<algod-port>
NETWORK=<mainnet or testnet depending on your algod details>
```

### Run the Application

```bash
yarn start:dev
```

The application will run on `http://localhost:4000`, with a Swagger UI available at `http://localhost:4000/swagger` for exploring and testing the endpoints.

## Endpoints Overview

Access the Swagger documentation at `http://localhost:4000/swagger` for details on:

- POST `/algo-did/create-did/{address}`: Create a new DiD and DID Document.
- PATCH `/algo-did/update-did/{did}`: Update an existing DID Document.
- DELETE `/algo-did/delete-did/{did}`: Delete a DID Document.
- GET `/algo-did/resolve-did/{did}`: Resolve a DiD to retrieve its associated DID Document.

## Folder Structure

Here’s an overview of the folder organization:

```plaintext
algo-did-nestjs/
├── libs/
│ ├── artifacts/ # Smart contract source code, TypeScript client, and artifacts
│ ├── constants/ # Constants used across the app
│ ├── dto/ # Data Transfer Objects for request validation
│ ├── enums/ # Enums used in the app
│ ├── interfaces/ # Interfaces for typing
│ ├── utils/ # Utility functions
│ └── modules/ # Core business logic modules
├── src/
│ ├── app.module.ts # Main application module
│ ├── app.controller.ts # Controller for handling HTTP requests
│ ├── app.service.ts # Service containing core business logic
│ └── main.ts # Application entry point
```

## Code Walkthrough

- `src/main.ts`: Bootstraps the NestJS application and sets up middleware.
- `app.controller.ts`: Defines the endpoints exposed to the user.
- `app.service.ts`: Contains the core logic for interacting with the Algorand blockchain.
- `libs/artifacts`: Includes the smart contract source code and its TypeScript client for managing DiDs on the blockchain.
- `libs/modules`: Houses key business logic, such as DiD creation, updates, and resolution.

## Contribution

Contributions are welcome! Please fork the repository and submit a pull request for any improvements or features.
