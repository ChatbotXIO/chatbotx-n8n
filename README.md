# n8n-nodes-chatbotx

An n8n community node package for the [ChatbotX](https://chatbotx.io/) Public API and webhooks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Credentials](#credentials)
[Nodes](#nodes)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

### n8n Cloud / Settings > Community Nodes

Install `n8n-nodes-chatbotx` from **Settings > Community Nodes** in n8n.

### Self-hosted (Docker)

Build the package (`npm run build`), then copy the resulting `.tgz` into your n8n container's custom nodes directory:

```bash
ID=$(docker compose ps -q n8n)
docker cp n8n-nodes-chatbotx-<version>.tgz "$ID:/tmp/node.tgz"
docker compose exec -u node n8n sh -lc 'mkdir -p /home/node/.n8n/nodes && cd /home/node/.n8n/nodes && npm install --omit=dev /tmp/node.tgz'
docker compose restart n8n
```

Refresh n8n (`Ctrl + F5`) and search for `ChatbotX`.

## Credentials

1. In ChatbotX, open **Settings > Integrations > ChatbotX API Access Token**.
2. Create a **ChatbotX API** credential in n8n.
3. Keep `https://app.chatbotx.io/api` for ChatbotX Cloud. For self-hosted ChatbotX, use `https://your-domain/api`.
4. Paste the workspace API token and test the credential.

## Nodes

### ChatbotX (action node)

Two resources:

- **Contact:** List, Get, Create, Update or Create, Delete, Find by Custom Field, Set Custom Fields, Delete Custom Field, Add Tags, Remove Tags, Send Message, Send Flow.
- **Custom:** API Call — an arbitrary authorized call to any ChatbotX Public API endpoint (method + path + JSON body), for endpoints not covered by the actions above.

Contact identifiers accept ChatbotX's documented formats: `id:11590944070189056`, `email:user@example.com`, `phone:+84908123456` (a bare ID, email, or E.164 phone number is also accepted).

### ChatbotX Trigger - Watch Events

Starts a workflow whenever a subscribed **system event** occurs in the workspace (new contact, tag applied, custom field changed, conversation assigned, etc.), independent of any flow. The trigger automatically registers and unregisters its webhook URL with ChatbotX when the workflow is activated/deactivated.

Some events accept an optional **Source ID** filter (e.g. a specific tag or sequence). Leave it empty to match the event for any source.

### ChatbotX Trigger - Watch Flow Data

Starts a workflow when a ChatbotX bot flow reaches a **"Make" step** configured with a matching **Event Name**. Like the events trigger, it registers/unregisters itself automatically.

## Compatibility

Tested against n8n's programmatic node API (`n8nNodesApiVersion: 1`) and `n8n-workflow` 2.x. Supports ChatbotX Cloud and self-hosted installations.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [ChatbotX API reference](https://chatbotx.io/docs/api-reference/api-overview)

## License

MIT
