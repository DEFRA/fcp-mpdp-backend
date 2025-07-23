[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)

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

### Docker

This application is intended to be run in a Docker container to ensure consistency across environments.

Docker can be installed from [Docker's official website](https://docs.docker.com/get-docker/).

> The test suite includes integration tests which are dependent on a Postgres container so cannot be run without Docker.

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run docker:dev
```

### Testing

To test the application run:

```bash
npm run docker:test
```

Tests can also be run in watch mode to support Test Driven Development (TDD):

```bash
npm run docker:test:watch
```

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
