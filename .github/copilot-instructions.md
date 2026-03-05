# FCP MPDP Backend - AI Coding Agent Instructions

## Overview

REST API backend for Making Payment Data Public (MPDP) service. Provides payment data search, filtering, and CSV export capabilities with PostgreSQL storage and Liquibase migrations.

## Architecture

### Service Role
- API service consumed by [fcp-mpdp-frontend](../fcp-mpdp-frontend) and [fcp-mpdp-admin](../fcp-mpdp-admin)
- Data layer: PostgreSQL 16 with Liquibase for schema management
- Exposes OpenAPI/Swagger documentation at `/swagger`
- Health check at `/health`

### Core Technology Stack
- **Runtime:** Node.js 22+ with ES modules (`"type": "module"`)
- **Framework:** Hapi.js 21 for REST API
- **Database:** PostgreSQL 16 with Knex query builder
- **Migrations:** Liquibase XML changelogs
- **Testing:** Vitest with PostgreSQL test container
- **Linting:** Neostandard (modern ESLint config)
- **Config:** Convict for environment-based configuration
- **CSV Export:** @json2csv/node for large dataset streaming

## Code Quality Standards

### Linting Requirements
**All code MUST pass neostandard linting before commit.**

Run linting:
```bash
npm run lint              # Check for errors
npm run lint:fix          # Auto-fix issues
```

**Common neostandard rules to follow:**
- ❌ No unused variables or imports
- ❌ No unnecessary whitespace or blank lines
- ✅ Use `const` for variables that don't change
- ✅ Consistent 2-space indentation
- ✅ Single quotes for strings (except when escaping)
- ✅ No semicolons (JavaScript ASI)
- ✅ Trailing commas in multiline objects/arrays

**When generating code:**
1. Follow existing code style in the file
2. Run linter after making changes
3. Fix all linting errors before completion
4. Never commit code with linting errors

## Standards & Guidelines

This service follows:
- **[DEFRA Software Development Standards](https://defra.github.io/software-development-standards/)** - Team coding standards and practices
- **[GOV.UK Service Standard](https://www.gov.uk/service-manual/service-standard)** - Best practices for building government services

## Project Structure

```
src/
  server.js              # Hapi server setup, plugin registration
  config.js              # Convict configuration schemas  
  plugins/router.js      # Route registration
  plugins/swagger.js     # OpenAPI documentation
  routes/                # API endpoints (each exports route array)
  data/                  # Database queries and data access layer
  common/helpers/        # Utilities (logging, postgres, tracing)
changelog/
  db.changelog.xml       # Master Liquibase changelog
  db.changelog-1.0.xml   # Initial schema
  db.changelog-1.1.xml   # Schema updates
```

## Development Patterns

### Route Definition
Routes export arrays with Joi validation and Swagger tags:

```javascript
export const routeName = [
  {
    method: 'POST',
    path: '/v1/resource',
    options: {
      description: 'Brief description',
      notes: 'Detailed notes for Swagger docs',
      tags: ['api', 'resource'],
      validate: {
        payload: Joi.object({ /* schema */ })
      },
      handler: async (request, h) => {
        const data = await getDataFromDB(request.payload)
        return h.response(data)
      }
    }
  }
]
```

### Database Access
- Connection managed by `src/common/helpers/postgres.js`
- Query functions in `src/data/` directory
- Use parameterized queries to prevent SQL injection
- Transaction support available via Knex

Example pattern from [src/data/search.js](../src/data/search.js):
```javascript
export async function getPaymentData (params) {
  const db = await postgres.pool.connect()
  try {
    const result = await db.query('SELECT ...', [params])
    return result.rows
  } finally {
    db.release()
  }
}
```

### Configuration
Access via [src/config.js](../src/config.js):
```javascript
const dbHost = config.get('postgres.host')
const cdpEnv = config.get('cdpEnvironment')
```

## API Endpoints

Current endpoints (see [src/routes](../src/routes)):

| Endpoint                    | Method | Purpose                          |
|-----------------------------|--------|----------------------------------|
| `/health`                   | GET    | Health check                     |
| `/v1/payments`              | POST   | Search payments (paginated)      |
| `/v1/payments/file`         | POST   | Export search results as CSV     |
| `/v1/payments/file`         | GET    | Stream all payments as CSV       |
| `/v1/payments/search`       | GET    | Autocomplete suggestions         |
| `/v1/payments/summary`      | GET    | Payment summary by scheme/year   |
| `/v1/payments/summary/file` | GET    | Export summary as CSV            |

Admin endpoints (authenticated):
- Various endpoints in [src/routes/payments-admin.js](../src/routes/payments-admin.js)
- Used by fcp-mpdp-admin service

## Development Workflow

### Local Development (Standalone)
```bash
npm install
npm run docker:build
npm run docker:dev           # Runs on port 3001 with Postgres + Liquibase
```

Services started via docker-compose:
- `fcp-mpdp-backend` - API server
- `postgres` - PostgreSQL 16
- `liquibase` - Runs migrations on startup

### Full System Development
Use [fcp-mpdp-core](../fcp-mpdp-core) orchestration:
```bash
cd ../fcp-mpdp-core
./build
./start -s                   # Start and seed database with test data
```

### Testing
```bash
npm run docker:test          # Runs tests with Postgres container
npm run docker:test:watch    # TDD mode
```
- Integration tests require PostgreSQL (via Docker compose)
- Tests run with `TZ=UTC` for consistency
- Coverage reports to `coverage/` directory

### Database Seeding
Local development data generation via [fcp-mpdp-core](../fcp-mpdp-core):
```bash
cd ../fcp-mpdp-core
./start -s                   # Seeds database with faker.js data
```
- Located in [../fcp-mpdp-core/data/seed.js](../fcp-mpdp-core/data/seed.js)
- Includes test data for journey test suite

### Debugging
```bash
npm run dev:debug            # Debugger on 0.0.0.0:9229
```

## Database Management

### Schema Migrations
Liquibase XML changelogs in `changelog/` directory:
1. Create new `db.changelog-X.X.xml` file
2. Add `<include>` to [changelog/db.changelog.xml](../changelog/db.changelog.xml)
3. Use standard Liquibase changesets (createTable, addColumn, etc.)
4. Migrations run automatically on container startup

### Database Connection
- **Write:** `POSTGRES_HOST` environment variable
- **Read:** `POSTGRES_HOST_READ` (same as write in local dev)
- **Credentials:** RDS token or username/password (controlled by `POSTGRES_GET_TOKEN_FROM_RDS`)
- Connection pooling via Knex

### Query Performance
- Use indexes appropriately (defined in Liquibase changelogs)
- Large result sets should stream via CSV endpoints
- Consider pagination for list endpoints

## Testing Guidelines

### Unit Tests
- Test route handlers, data functions, utilities in isolation
- Mock database connections
- Located in [test/unit](../test/unit)

### Integration Tests
- Test with real PostgreSQL container
- Use `server.inject()` for HTTP testing
- Clean/seed database between tests
- Located in [test/integration](../test/integration)

Example integration test pattern:
```javascript
describe('POST /v1/payments', () => {
  test('returns filtered payment data', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/v1/payments',
      payload: { searchString: 'test', limit: 10, offset: 0 }
    })
    expect(response.statusCode).toBe(200)
  })
})
```

## CI/CD

### GitHub Actions
- [.github/workflows/publish.yml](../.github/workflows/publish.yml) triggers on main branch
- Runs linting, tests with PostgreSQL, SonarQube scan
- Builds and publishes Docker image to ECR
- Deploys via CDP (Defra Cloud Platform)

### Environment Variables
Key CDP environment configs in [src/config.js](../src/config.js):
- `ENVIRONMENT`: CDP environment (local, dev, test, prod, etc.)
- Database connection details
- Logging configuration
- Proxy settings

## Common Tasks

### Adding a New API Endpoint
1. Create route file in `src/routes/` exporting route object array
2. Add Joi validation schemas
3. Add Swagger tags: `tags: ['api', 'resource-name']`
4. Implement handler calling data layer
5. Create data access function in `src/data/`
6. Register in [src/plugins/router.js](../src/plugins/router.js)
7. Add unit and integration tests
8. Test via Swagger UI at `http://localhost:3001/swagger`

### Adding Database Changes
1. Create new changelog file: `changelog/db.changelog-X.X.xml`
2. Define changesets with Liquibase XML syntax
3. Include in [changelog/db.changelog.xml](../changelog/db.changelog.xml)
4. Test locally: `./stop && ./build && ./start` (from fcp-mpdp-core)
5. Verify in PostgreSQL container: `docker exec -it postgres psql -U postgres -d fcp_mpdp_backend`

### Search and Filtering
- Fuse.js for fuzzy text search (see [src/data/search.js](../src/data/search.js))
- Complex filtering in [src/data/filters.js](../src/data/filters.js)
- CSV streaming for large exports (see [src/data/payments.js](../src/data/payments.js))
