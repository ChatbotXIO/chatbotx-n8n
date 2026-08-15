const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
	ChatbotXTriggerFlowData,
} = require('../dist/nodes/ChatbotX/ChatbotXTriggerFlowData.node.js');

function createMockHookContext({ parameters = {}, webhookUrl, requestCalls }) {
	const staticData = {};

	return {
		getNodeParameter: (name, fallback) => (name in parameters ? parameters[name] : fallback),
		getNodeWebhookUrl: () => webhookUrl,
		getCredentials: async () => ({ apiUrl: 'https://app.chatbotx.io/api' }),
		getWorkflowStaticData: () => staticData,
		helpers: {
			httpRequestWithAuthentication: async function (_credentialType, options) {
				requestCalls.push(options);
				if (options.method === 'POST') {
					return { id: 'external-webhook-456' };
				}
				return {};
			},
		},
	};
}

test('create() registers the flow-data webhook with provider "n8n" and stores the returned id', async () => {
	const node = new ChatbotXTriggerFlowData();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: { eventName: 'order_confirmed' },
		webhookUrl: 'https://n8n.example.com/webhook/xyz',
		requestCalls,
	});

	const result = await node.webhookMethods.default.create.call(context);

	assert.equal(result, true);
	assert.equal(requestCalls.length, 1);
	assert.equal(requestCalls[0].method, 'POST');
	assert.equal(requestCalls[0].url, 'https://app.chatbotx.io/api/v1/external-webhooks');
	assert.deepEqual(requestCalls[0].body, {
		url: 'https://n8n.example.com/webhook/xyz',
		event: 'order_confirmed',
		provider: 'n8n',
	});

	assert.equal(context.getWorkflowStaticData().webhookId, 'external-webhook-456');
});

test('delete() unregisters the stored external webhook id', async () => {
	const node = new ChatbotXTriggerFlowData();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: {},
		webhookUrl: 'https://n8n.example.com/webhook/xyz',
		requestCalls,
	});
	context.getWorkflowStaticData().webhookId = 'external-webhook-456';

	const result = await node.webhookMethods.default.delete.call(context);

	assert.equal(result, true);
	assert.equal(requestCalls[0].method, 'DELETE');
	assert.equal(
		requestCalls[0].url,
		'https://app.chatbotx.io/api/v1/external-webhooks/external-webhook-456',
	);
	assert.equal(context.getWorkflowStaticData().webhookId, undefined);
});
