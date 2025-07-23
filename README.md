[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Bugs](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=bugs)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Code Smells](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=code_smells)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Duplicated Lines (%)](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=duplicated_lines_density)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=DEFRA_fcp-mpdp-backend&metric=coverage)](https://sonarcloud.io/summary/new_code?id=DEFRA_fcp-mpdp-backend)

# fcp-mpdp-backend

Backend API for the Making Payment Data Public (MPDP) service.

MPDP is part of the Farming and Countryside Programme (FCP).

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
- [API endpoints](#api-endpoints)
- [Development helpers](#development-helpers)
  - [Proxy](#proxy)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Docker Compose](#docker-compose)
  - [Dependabot](#dependabot)
  - [SonarQube Cloud](#sonarqube-cloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm)

To use the correct version of Node.js for this application, via nvm:

```bash
cd fcp-mpdp-backend
nvm use
```

## Local development

### Setup

Install application dependencies:

```bash
npm install
```

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

### Production

To mimic the application running in `production` mode locally run:

```bash
npm start
```

### npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
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


## Development helpers

### Proxy

We are using forward-proxy which is set up by default. To make use of this: `import { fetch } from 'undici'` then
because of the `setGlobalDispatcher(new ProxyAgent(proxyUrl))` calls will use the ProxyAgent Dispatcher

If you are not using Wreck, Axios or Undici or a similar http that uses `Request`. Then you may have to provide the
proxy dispatcher:

To add the dispatcher to your own client:

```javascript
import { ProxyAgent } from 'undici'

return await fetch(url, {
  dispatcher: new ProxyAgent({
    uri: proxyUrl,
    keepAliveTimeout: 10,
    keepAliveMaxTimeout: 10
  })
})
```

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag fcp-mpdp-backend:development .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 fcp-mpdp-backend:development
```

### Production image

Build:

```bash
docker build --no-cache --tag fcp-mpdp-backend .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 fcp-mpdp-backend
```

### Docker Compose

A local environment with:

- This service.
- Postgres database.

To build the Docker container:

```bash
npm run docker:build # docker compose build
```

To run the Docker container:

```bash
npm run docker:dev # docker compose up
```

The Docker container can be stopped using any valid `docker compose down` argument.

### Dependabot

We have added an example dependabot configuration file to the repository. You can enable it by renaming
the [.github/example.dependabot.yml](.github/example.dependabot.yml) to `.github/dependabot.yml`

### SonarQube Cloud

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
