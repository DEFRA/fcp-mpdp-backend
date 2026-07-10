![Build](https://github.com/defra/fcp-mpdp-backend/actions/workflows/publish.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Dependabot](https://badgen.net/github/dependabot/DEFRA/fcp-mpdp-backend)](https://github.com/DEFRA/fcp-mpdp-backend/security/dependabot)

# fcp-mpdp-backend

Backend API for the Making Payment Data Public (MPDP) service.

MPDP is part of the Farming and Countryside Programme (FCP).

- [Requirements](#requirements)
  - [Docker](#docker)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
- [API endpoints](#api-endpoints)
- [Dependabot](#dependabot)
- [SonarQube Cloud](#sonarqube-cloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Node.js 24 or later is required. Use [nvm](https://github.com/nvm-sh/nvm) to manage versions:

```bash
nvm use
```

> The correct version is pinned in [.nvmrc](./.nvmrc).

### Docker

Docker is required to run the Postgres + Liquibase dependency containers and to build the production image.

Docker can be installed from [Docker's official website](https://docs.docker.com/get-docker/).

## Local development

### Setup

Install application dependencies:

```bash
nvm use
npm install
```

Copy the example environment file and fill in any values for your machine:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Node environment |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_HOST_READ` | `localhost` | PostgreSQL read replica host |
| `POSTGRES_USER` | `postgres` | PostgreSQL user |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_GET_TOKEN_FROM_RDS` | `false` | Use IAM auth for RDS |
| `AWS_EMF_ENVIRONMENT` | `Local` | Prevents metrics from connecting to CloudWatch EMF agent locally |

### Development

Start the Postgres + Liquibase dependency containers:

```bash
npm run services:up
```

Run locally with hot reload:

```bash
npm run dev
```

Or do both in one command:

```bash
npm run local
```

To run the full system together inside Docker (e.g. for journey tests), use:

```bash
npm run docker:build  # build the image
npm run docker:dev    # run inside Docker on the fcp-mpdp network
```

### Testing

Tests use [Testcontainers](https://testcontainers.com/) to spin up a real Postgres instance automatically — no manual setup required. Docker must be running.

Run all tests (unit + integration) with coverage:

```bash
npm test
```

Run only unit tests (fast, no containers):

```bash
npm run test:unit
```

Run only integration tests (starts Postgres + runs Liquibase migrations automatically):

```bash
npm run test:integration
```

Run in watch mode for TDD:

```bash
npm run test:watch
```

### Debugging

VS Code launch configurations are in [.vscode/launch.json](./.vscode/launch.json).

- **Dev: run server** — launches the server locally with the inspector attached. Requires `services:up` first.
- **Debug current test** — opens the inspector on the currently active test file. Open a test file and hit F5.

### npm scripts

All available npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

## API endpoints

| Endpoint                                               | Method | Description                                      |
| :----------------------------------------------------- | :----- | :----------------------------------------------- |
| `GET: /health`                                         | GET    | Health check endpoint                            |
| `POST: /v1/payments`                                   | POST   | Search for payment data with filters             |
| `POST: /v1/payments/file`                              | POST   | Download payment search results as CSV          |
| `GET: /v1/payments/file`                               | GET    | Download all payments as CSV stream              |
| `GET: /v1/payments/search`                             | GET    | Get search suggestions for payee names          |
| `GET: /v1/payments/summary`                            | GET    | Get payment summary by scheme and year          |
| `GET: /v1/payments/summary/file`                       | GET    | Download payment summary as CSV                  |
| `GET: /v1/payments/{payeeName}/{partPostcode}`         | GET    | Get specific payee payment details              |
| `GET: /v1/payments/{payeeName}/{partPostcode}/file`    | GET    | Download specific payee payment details as CSV  |

All these endpoints are documented using [hapi-swagger](https://www.npmjs.com/package/hapi-swagger).

Documentation for the API can be found at [http://localhost:3001/documentation](http://localhost:3001/documentation) when running the application in development mode.

## Service-to-service authentication

This service optionally enforces JWT-based authentication on all routes except `/health`. This is disabled by default and intended to be enabled in deployed environments.

When enabled, callers must obtain a short-lived JWT via the AWS STS `GetWebIdentityToken` API and attach it to every request as a `Bearer` token. The backend validates the token's signature (via the JWKS endpoint), issuer, and audience. It additionally restricts access to a named list of services by extracting the calling service's name from the `sub` claim, which follows the pattern `arn:aws:iam::ACCOUNT:role/SERVICE-NAME`.

### Environment variables

| Variable | Required when enabled | Description |
|---|---|---|
| `SERVICE_AUTH_ENABLED` | ✅ | Set to `true` to enable. Default: `false` |
| `CDP_JWT_JWKS_URI` | ✅ | URL of the JWKS endpoint for verifying token signatures |
| `CDP_JWT_ISSUER` | ✅ | Expected JWT issuer - matches `CDP_JWT_ISSUER` set on the environment |
| `SERVICE_AUTH_AUDIENCE` | optional | Expected JWT audience. Default: `fcp-mpdp-backend` |
| `SERVICE_AUTH_ALLOWED_SERVICES` | optional | Comma-separated list of permitted caller service names, e.g. `fcp-mpdp-frontend,fcp-mpdp-admin`. Leave empty to allow any valid JWT. |

### How service identity is verified

The JWT `sub` claim contains the calling service's IAM role ARN in the form `arn:aws:iam::ACCOUNT:role/SERVICE-NAME`. The service name is extracted from the end of the ARN and checked against `SERVICE_AUTH_ALLOWED_SERVICES`. Because only code running inside an ECS task with that IAM role can obtain a token signed with that `sub`, this provides application-level enforcement on top of AWS IAM controls.

## Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

## SonarQube Cloud

Instructions for setting up SonarQube Cloud can be found in [sonar-project.properties](./sonar-project.properties)

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
