# PostNL Interview Case

This is a technical case study built as part of the PostNL DevEx engineering interview process.

Serverless backend that tracks roll containers across the PostNL logistics network in real time, giving planning operators a live view of stock levels, depot capacity, and forecasts.

## Background

PostNL processes millions of parcels daily. Before they reach their destiny, parcels are sorted into **roll containers**. 

Each depot has a limited capacity. If too many full containers arrive at once, the depot can't process them fast enough. If too few arrive, vans leave half-empty and deliveries are delayed.

The **Ketenplanning platform** combines real-time container tracking, depot capacity data, and forecasting so that logistics operators can anticipate problems before they happen.

## The case

Design and build a backend platform that:

1. Ingests daily and weekly depot capacity from Excel files in OneDrive
2. Processes real-time container location and status events from IoT sensors and sorting scanners
3. Stores and serves forecast data published by the Forecast Domain
4. Exposes everything via a unified GraphQL API for planning operators and the Forecast Domain

## Assumptions

**Roll Containers**
- Each roll container has one destination at a time. It doesn't split across depots
- A container not seen for 24 hours is no longer considered active stock. It has either arrived, been unloaded, or gone offline
- Scanning happens before a container leaves the sorting center, so destination is known before the container is in transit
- Container status follows a simple lifecycle: unknown on first sight, then either in transit (full) or empty based on the scan
 
**Depots**
- The list of depots is stable enough that daily Excel files are the source of truth, no real-time depot additions expected
- Each depot has a single daily capacity figure and a separate weekly planning figure
- Capacity Excels are uploaded on time
 
**Forecast Domain**
- The Forecast Domain is an internal PostNL service with its own AWS account
- It queries stock levels on its own schedule and publishes forecasts back when ready
- Forecasts cover the full day in 15-minute intervals per depot
 
**Data and history**
- Capacity history is worth keeping
- Container state history is not needed, only the current position and status matters
- Forecast history is worth keeping
 
**Scale**
- Approximately 40 depots in the Netherlands
- Up to 250,000 active roll containers at peak
- The system is business-critical and expected to be available 24/7

## Solution overview

Event-driven, fully serverless on AWS. A single DynamoDB table stores all data. AppSync serves a GraphQL API with two authentication modes: Cognito for frontend operators and IAM for the Forecast Domain.

**Tech stack:** TypeScript, AWS Lambda, DynamoDB, AppSync, Kinesis, EventBridge, SAM, GitHub Actions

## Key design decisions

**Single DynamoDB table**: all data in one table with different access patterns per item type. Capacity uses date-based SK for history. Containers use a fixed SK (`#STATE`) since only the current state matters. Forecasts use the interval timestamp as SK.

**Kinesis On-Demand**: no shard management, auto-scales with traffic. With 250,000 containers emitting events continuously, provisioned shards would require constant tuning.

**AppSync direct resolvers**: most queries go directly from AppSync to DynamoDB without a Lambda in the middle. Simpler, cheaper, and faster. The only exception is `getStockLevel`, which needs to aggregate container counts per depot.

**No DEPOT_IDS config**: the list of active depots is derived at runtime from DynamoDB. If PostNL adds a new depot to the Excel, it appears in the API automatically without any code change.

**IAM for the Forecast Domain**: the Forecast Domain is an internal service, so IAM is the cleanest authentication method. No API keys to rotate, no extra infrastructure.

## Getting started

```bash
git clone https://github.com/tubio/postnl
cd postnl
npm install

npm test
npm run build
```

## Deploying

### Prerequisites

**SSM parameters**: create these once in your AWS account:

```bash
aws ssm put-parameter --name /postnl/dks/tenant-id      --value "..." --type SecureString
aws ssm put-parameter --name /postnl/dks/client-id      --value "..." --type SecureString
aws ssm put-parameter --name /postnl/dks/client-secret  --value "..." --type SecureString
aws ssm put-parameter --name /postnl/dks/drive-id       --value "..." --type SecureString
aws ssm put-parameter --name /postnl/dks/daily-file-id  --value "..." --type SecureString
aws ssm put-parameter --name /postnl/dks/weekly-file-id --value "..." --type SecureString
```

**S3 bucket**: one per environment:

```bash
aws s3 mb s3://postnl-dks-case-<env-name>-artifacts --region eu-west-1
```

### First deploy

```bash
npm run deploy:guided
```

SAM will ask for the env name (`postnl-dks-case-dev` or `postnl-dks-case-prod`) and save your answers.

### After that

```bash
npm run deploy
```

## DynamoDB schema

Single table. Three item types:

| Item | PK | SK | Notes |
|---|---|---|---|
| Depot capacity | `DEPOT#haarlem` | `2026-03-09#daily` | One per depot per day |
| Container state | `RC#1234` | `#STATE` | Overwritten on each event, 24h TTL |
| Forecast interval | `FORECAST#haarlem` | `2026-03-09T10:00:00Z` | One per depot per 15min interval |

Two GSIs:
- `destination-index`: query containers by destination depot
- `date-index`: query capacity and forecast by date

## GraphQL API

```graphql
getCapacity(depotId, date)
getAllCapacities(date)

getStockLevel(depotId)
getAllStockLevels

getForecast(depotId, date)
getAllForecastsForDate(date)

mutation publishForecast(input)
```