# Notion API Reference For Agents

This is the canonical Notion API guide for agents working in or around this project.

It is not a copy of the full official documentation. It is a practical agent-oriented reference for:

- authenticating correctly
- choosing the right endpoint family
- reading and writing pages safely
- querying data sources without guessing schema
- handling limits, permissions, and retries

Use this file when an agent needs to automate Notion through HTTP, design an integration, or prepare payloads for a script.

If an agent is running inside Codex with a working Notion connector, prefer the Notion MCP tools for direct workspace actions. Use the raw HTTP API when building external scripts, services, automations, or reusable API payloads.

## 1. Base URL And Required Headers

- Base URL: `https://api.notion.com`
- Main REST path prefix: `/v1`
- Required auth header: `Authorization: Bearer <token>`
- Required version header: `Notion-Version: <date-version>`
- JSON requests should also send: `Content-Type: application/json`

Example:

```bash
curl 'https://api.notion.com/v1/users' \
  -H 'Authorization: Bearer '"$NOTION_ACCESS_TOKEN"'' \
  -H 'Notion-Version: 2026-03-11'
```

Important note on version dates:

- The core Introduction, Authentication, Versioning, and many endpoint pages currently show `2026-03-11`.
- Some data-source reference pages still show `2025-09-03`.
- For new work in this project, use `2026-03-11` unless a specific endpoint page or SDK compatibility constraint requires otherwise.
- When an endpoint-specific doc disagrees, follow that endpoint page and record the chosen version explicitly in code.

## 2. Authentication Model

Notion uses bearer tokens.

- Internal integrations: create the integration in Notion, then use its token directly.
- Public integrations: use OAuth and store the resulting access token per connected workspace/user.

Agents should assume:

- every request needs a bearer token
- permissions come from both the token and the page/database sharing state
- API actions appear in Notion as bot-authored actions

Minimal JavaScript client setup:

```js
const { Client } = require("@notionhq/client");

const notion = new Client({
  auth: process.env.NOTION_ACCESS_TOKEN
});
```

## 3. Access And Capability Rules

Two different checks control whether a request succeeds:

1. The integration must have the right capability.
2. The target page, database, or data source must be shared with the integration.

Key capability groups:

- `Read content`
- `Insert content`
- `Update content`
- `Read comments`
- `Insert comments`
- `User information`

Practical rules for agents:

- A `404 object_not_found` often means "not shared with the integration", not only "bad ID".
- A `403 restricted_resource` often means the integration exists but lacks the required capability.
- Capabilities do not override workspace permissions. If a user loses access, the integration can lose effective access too.

## 4. Core API Conventions

These conventions matter in nearly every request and response:

- Top-level objects include an `"object"` field.
- IDs are UUIDs. Dashes can usually be omitted in requests.
- Property names use `snake_case`.
- Dates and datetimes use ISO 8601.
- Empty strings are not supported for fields that expect nullable strings. Use `null` instead of `""`.
- The API is cursor-paginated for list endpoints.

Paginated responses include:

- `object: "list"`
- `results`
- `has_more`
- `next_cursor`

Default pagination behavior:

- list endpoints may return partial results
- `page_size` maximum is `100`
- follow `next_cursor` until `has_more` becomes `false`

## 5. Object Model Agents Should Know

The main Notion object families are:

| Object | What it represents | Common agent use |
|---|---|---|
| `page` | A page in the workspace | create docs, update properties, append content |
| `block` | A content node inside a page or other block | append paragraphs, headings, lists, callouts |
| `database` | Higher-level container for one or more data sources | structural container, legacy compatibility |
| `data_source` | Queryable schema-backed collection of entries | task tables, issue trackers, CRM-style records |
| `user` | Person or bot | resolve authors, owners, bot workspace limits |
| `comment` | Comment on a page, block, or thread | review workflows, agent notes |
| `file_upload` | Upload lifecycle object | attach files to pages and properties |

Important migration rule:

- Prefer `data_sources` endpoints for collection querying and schema-aware CRUD.
- `databases` endpoints still exist, but some database-specific flows are explicitly deprecated in favor of `data_source` equivalents.

## 6. Parenting Rules

Parent relationships are central to safe writes.

- Pages can be created under pages, blocks, data sources, or the workspace.
- Blocks can belong to pages, blocks, or data sources.
- Data sources belong to databases.
- Prior to API version `2025-09-03`, page parents were databases rather than data sources.

Agent rule:

- Never guess the parent type from the human UI alone.
- Retrieve the parent object first if the hierarchy is unclear.

## 7. Endpoint Map

This is the practical endpoint surface agents will usually need.

| Area | Main endpoints | Primary use |
|---|---|---|
| Authentication | token create/introspect/refresh/revoke | public OAuth integrations |
| Pages | create, retrieve, update, move, retrieve property item | document and record CRUD |
| Blocks | append children, retrieve, list children, update, delete | content tree editing |
| Data sources | create, retrieve, update, query, list templates | schema-aware collection work |
| Databases | create, retrieve, update | structural compatibility and older flows |
| Search | search by title | discovery when only a title is known |
| Comments | create, retrieve, list | review and discussion workflows |
| Users | list all users, retrieve user, retrieve bot user | identity and workspace-limit lookups |
| File uploads | create, send, complete, retrieve, list | binary attachment flow |
| Webhooks | subscriptions and event delivery | change-driven sync instead of polling |

## 8. Common Agent Workflows

### 8.1 Discover a page, database, or data source

Use search when you only know the title or partial title.

Endpoint:

- `POST /v1/search`

Use cases:

- find a page by title
- find a data source before querying it
- build a lookup layer for automation scripts

Agent rule:

- Search is a discovery step, not a guaranteed unique lookup.
- After search, retrieve the selected object directly before writing to it.

### 8.2 Retrieve the schema before writing to a data source

Endpoints:

- `GET /v1/data_sources/{data_source_id}`
- optionally `POST /v1/data_sources/{data_source_id}/query`

Why this matters:

- property names must match the parent data source schema
- status, select, relation, formula, and rollup properties can have non-obvious shapes
- schema drift is common in human-maintained Notion workspaces

Agent rule:

- Never write to a data source by assuming a property exists.
- Retrieve the data source first and map the current property names and IDs.

### 8.3 Query a data source

Endpoint:

- `POST /v1/data_sources/{data_source_id}/query`

Use this for:

- task lists
- filtered records
- sorted queues
- status-based dashboards

Example:

```bash
curl -X POST 'https://api.notion.com/v1/data_sources/<DATA_SOURCE_ID>/query' \
  -H 'Authorization: Bearer '"$NOTION_ACCESS_TOKEN"'' \
  -H 'Notion-Version: 2026-03-11' \
  -H 'Content-Type: application/json' \
  --data '{
    "filter": {
      "property": "Status",
      "status": {
        "equals": "Done"
      }
    },
    "sorts": [
      {
        "timestamp": "last_edited_time",
        "direction": "descending"
      }
    ],
    "page_size": 25
  }'
```

Performance guidance from Notion:

- use `filter_properties` when you only need part of the schema
- narrow filters to reduce result size
- expect pagination
- use webhooks instead of polling when possible

Important limitations:

- formula and rollup results can be incomplete in complex relation-heavy setups
- Notion recommends retrieving individual page property items for the most accurate formula or rollup details

### 8.4 Create a page

Endpoint:

- `POST /v1/pages`

A page can be created:

- under a page
- under a data source
- at the workspace level for some public-integration bot flows

Practical rules:

- If the parent is a page, only the `title` property is valid in `properties`.
- If the parent is a data source, `properties` keys must match the data source schema.
- `children` can be provided at creation time.
- Template-based page creation is supported for data-source-backed pages.

Example:

```bash
curl -X POST 'https://api.notion.com/v1/pages' \
  -H 'Authorization: Bearer '"$NOTION_ACCESS_TOKEN"'' \
  -H 'Notion-Version: 2026-03-11' \
  -H 'Content-Type: application/json' \
  --data '{
    "parent": {
      "data_source_id": "<DATA_SOURCE_ID>"
    },
    "properties": {
      "Name": {
        "title": [
          {
            "text": {
              "content": "New task from agent"
            }
          }
        ]
      }
    }
  }'
```

Unsupported write targets in page properties:

- `rollup`
- `created_by`
- `created_time`
- `last_edited_by`
- `last_edited_time`

### 8.5 Update a page

Endpoint:

- `PATCH /v1/pages/{page_id}`

Use this to:

- update page properties
- archive or trash a page
- change icon or cover

Agent rule:

- For data-source-backed pages, update only schema-valid properties.
- Preserve unrelated properties unless you intend to replace them.

### 8.6 Append content blocks

Endpoint:

- `PATCH /v1/blocks/{block_id}/children`

Use this to:

- append paragraphs, headings, bullet items, to-dos, callouts, toggles, tables, and media blocks
- build a page after creation
- add structured content to an existing page or section

Agent rule:

- Append is safer than wholesale replacement.
- Retrieve existing block children first if order and context matter.
- Respect the request size limits for block arrays.

### 8.7 Read block trees

Endpoint:

- `GET /v1/blocks/{block_id}/children`

Use this before editing when:

- the page already contains human-authored content
- you need to anchor an insertion below a specific heading
- preserving existing structure matters more than speed

### 8.8 Work with comments

Endpoints:

- `POST /v1/comments`
- `GET /v1/comments`
- retrieve comment endpoint as needed

A comment can target:

- a page
- a block
- an existing discussion thread

Important limitation:

- The public API cannot create a brand-new inline discussion thread.
- It can add comments to a page, block, or existing discussion.

### 8.9 Read users and bot metadata

Endpoints:

- `GET /v1/users`
- `GET /v1/users/{user_id}`
- `GET /v1/users/me`

Use these for:

- resolving people fields
- checking bot identity
- retrieving workspace limits such as max file upload size for the bot

### 8.10 Upload files

Main flow:

1. `POST /v1/file_uploads` to create the upload
2. send bytes using the file upload send step
3. complete the upload
4. attach the resulting `file_upload` object to a supported page property, block, icon, or cover

File guidance:

- direct upload supports files up to `20 MiB` per simple upload request
- larger files require multi-part upload mode
- free workspaces allow up to `5 MiB` per file
- paid workspaces allow up to `5 GiB` per file

Supported attachment contexts include:

- media blocks such as `image`, `file`, `pdf`, `audio`, `video`
- `files` page properties
- page `icon`
- page `cover`

### 8.11 Use webhooks for sync

Webhook events do not contain the full latest entity content.

Treat a webhook as:

- a signal that something changed
- a trigger to fetch the latest entity state through the API

Current webhook coverage includes:

- page events
- data source events
- comment events
- file upload events

Important delivery rules:

- events may arrive out of order
- some high-frequency events are aggregated
- Notion retries failed deliveries up to 8 times with exponential backoff
- most events should arrive within minutes, often under one minute

Agent rule:

- Never trust the webhook payload as the final truth.
- Re-fetch the page, block, data source, or comment after receiving the event.

## 9. Request Limits And Payload Limits

Notion currently rate-limits integrations at an average of about `3 requests per second`, with some burst tolerance.

When rate-limited:

- status code is `429`
- error code is `rate_limited`
- honor the `Retry-After` header in seconds

Important payload limits called out in the docs:

- maximum `1000` block elements per payload
- maximum `500 KB` total payload size
- rich text content length limit: `2000` characters
- URL length limit: `2000` characters
- rich text arrays and block arrays often cap at `100` items
- relation and people arrays are capped at `100`

Agent rule:

- batch aggressively, but not blindly
- queue writes when migrating large content sets
- split large page writes into smaller append operations

## 10. Error Handling That Agents Should Implement

Common error classes:

| HTTP | Code | Meaning | Agent response |
|---|---|---|---|
| `400` | `validation_error` | request shape or value problem | inspect payload and schema |
| `400` | `missing_version` | missing `Notion-Version` | add required header |
| `401` | `unauthorized` | token invalid | refresh or replace token |
| `403` | `restricted_resource` | capability or permission issue | verify capabilities and share state |
| `404` | `object_not_found` | bad ID or resource not shared | verify object ID and integration access |
| `409` | `conflict_error` | write collision or transient provider issue | retry with backoff after re-read |
| `429` | `rate_limited` | too many requests | wait `Retry-After`, then continue |
| `500` / `502` / `503` / `504` | server-side failure | transient Notion issue | retry with bounded backoff |

Practical retry rules:

- retry `409`, `429`, `500`, `502`, `503`, and `504`
- do not blindly retry `400`, `401`, `403`, or `404`
- re-read mutable objects before retrying writes after a conflict

## 11. Agent Operating Rules

When an agent needs to "do something in Notion", follow this order:

1. Discover the target object.
2. Verify the integration has access.
3. Retrieve the current schema or current content.
4. Build the smallest valid write payload.
5. Execute the write.
6. Re-read the result if correctness matters.

Additional rules:

- Prefer property IDs or retrieved schema metadata over hardcoded property-name guesses.
- Prefer `data_sources` over deprecated `databases` query flows for new automations.
- Use append operations for content whenever possible instead of replacing whole pages.
- If a page mixes human-written and bot-written content, retrieve children first and insert surgically.
- For rollups, formulas, and large relations, retrieve property items individually when precision matters.
- For change-driven sync, use webhooks plus follow-up reads instead of aggressive polling.
- Record the exact `Notion-Version` used by your script so later debugging is possible.

## 12. Recommended Minimal Playbooks

### Read a task table safely

1. Search for the target data source by title if needed.
2. Retrieve the data source schema.
3. Query the data source with explicit filters and `page_size`.
4. Paginate until complete.

### Add a task row safely

1. Retrieve the data source schema.
2. Confirm the title property name and any required status/select fields.
3. Create the page under `parent.data_source_id`.
4. Re-read the page if downstream systems depend on generated fields.

### Add content to an existing page safely

1. Retrieve the page.
2. Retrieve its block children.
3. Decide the anchor point.
4. Append the smallest possible block set.

### React to a webhook safely

1. Validate and log the webhook event.
2. Use the event only to identify the changed entity.
3. Retrieve the latest entity state from the API.
4. Run sync logic against the retrieved state, not the webhook snapshot.

## 13. Official References

- Introduction: `https://developers.notion.com/reference/intro`
- Authentication: `https://developers.notion.com/reference/authentication`
- Integration capabilities: `https://developers.notion.com/reference/capabilities`
- Request limits: `https://developers.notion.com/reference/request-limits`
- Status codes: `https://developers.notion.com/reference/status-codes`
- Versioning: `https://developers.notion.com/reference/versioning`
- Create page: `https://developers.notion.com/reference/post-page`
- Query a data source: `https://developers.notion.com/reference/query-a-data-source`
- Parent object: `https://developers.notion.com/reference/parent-object`
- Webhook delivery: `https://developers.notion.com/reference/webhooks-events-delivery`
- Working with files and media: `https://developers.notion.com/docs/working-with-files-and-media`
