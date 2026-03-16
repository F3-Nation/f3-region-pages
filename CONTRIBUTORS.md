# Contributing to F3 Region Pages

Thank you for your interest in contributing to the F3 Region Pages project! This guide will help you get started with the development environment setup and basic workflow.

## Prerequisites

- [Node.js](https://nodejs.org/) version 20.18.2 (as specified in `.nvmrc`)
- [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager)
- [pnpm](https://pnpm.io/) (Fast, disk space efficient package manager)
- [Docker](https://www.docker.com/) (for local database setup)

## Development Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/F3-Nation/f3-region-pages.git
   cd f3-region-pages
   ```

2. **Set up Node.js environment**

   ```bash
   nvm install     # Installs the version specified in .nvmrc (20.18.2)
   nvm use         # Switches to the project's Node.js version
   ```

3. **Install development dependencies**

   ```bash
   pnpm install
   ```

4. **Set up local database**

   ```bash
   pnpm db:setup:local    # Starts Supabase, sets up environment, and seeds database
   ```

5. **Start the development server**

   ```bash
   pnpm dev     # Starts Next.js development server
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm test` - Run tests
- `pnpm lint` - Run linting
- `pnpm db:reset` - Reset the database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:seed` - Seed the database with initial data
- `pnpm docker:kill` - Stop Docker containers
- `pnpm supabase:start` - Start Supabase locally

## Workflow

1. Create a new branch for your feature or bugfix
2. Make your changes
3. Write tests for your changes
4. Run tests and make sure they pass
5. Submit a pull request

## Code Style and Guidelines

This project follows the Next.js conventions and uses TypeScript. Please ensure your code is properly typed and follows the existing patterns in the codebase.

## Need Help?

If you have any questions or need help, please open an issue on the GitHub repository.
