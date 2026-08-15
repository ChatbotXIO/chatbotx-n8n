const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatbotXTriggerEvents } = require('../dist/nodes/ChatbotX/ChatbotXTriggerEvents.node.js');

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
					return { id: 'webhook-123' };
				}
				return {};
			},
		},
	};
}

test('create() registers a webhook for the selected event and stores the returned id', async () => {
	const node = new ChatbotXTriggerEvents();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: { event: 'newContact', sourceId: '' },
		webhookUrl: 'https://n8n.example.com/webhook/abc',
		requestCalls,
	});

	const result = await node.webhookMethods.default.create.call(context);

	assert.equal(result, true);
	assert.equal(requestCalls.length, 1);
	assert.equal(requestCalls[0].method, 'POST');
	assert.equal(requestCalls[0].url, 'https://app.chatbotx.io/api/v1/webhooks');
	assert.equal(requestCalls[0].body.url, 'https://n8n.example.com/webhook/abc');
	assert.deepEqual(requestCalls[0].body.conditions, [{ type: 'newContact' }]);

	const staticData = context.getWorkflowStaticData();
	assert.equal(staticData.webhookId, 'webhook-123');
});

test('create() includes sourceId for events that support it', async () => {
	const node = new ChatbotXTriggerEvents();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: { event: 'tagApplied', sourceId: 'tag-42' },
		webhookUrl: 'https://n8n.example.com/webhook/abc',
		requestCalls,
	});

	await node.webhookMethods.default.create.call(context);

	assert.deepEqual(requestCalls[0].body.conditions, [{ type: 'tagApplied', sourceId: 'tag-42' }]);
});

test('delete() unregisters the stored webhook id', async () => {
	const node = new ChatbotXTriggerEvents();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: {},
		webhookUrl: 'https://n8n.example.com/webhook/abc',
		requestCalls,
	});
	context.getWorkflowStaticData().webhookId = 'webhook-123';

	const result = await node.webhookMethods.default.delete.call(context);

	assert.equal(result, true);
	assert.equal(requestCalls.length, 1);
	assert.equal(requestCalls[0].method, 'DELETE');
	assert.equal(requestCalls[0].url, 'https://app.chatbotx.io/api/v1/webhooks/webhook-123');
	assert.equal(context.getWorkflowStaticData().webhookId, undefined);
});

test('delete() is a no-op when nothing was ever registered', async () => {
	const node = new ChatbotXTriggerEvents();
	const requestCalls = [];
	const context = createMockHookContext({
		parameters: {},
		webhookUrl: 'https://n8n.example.com/webhook/abc',
		requestCalls,
	});

	const result = await node.webhookMethods.default.delete.call(context);

	assert.equal(result, true);
	assert.equal(requestCalls.length, 0);
});

test('checkExists() reflects whether a webhook id is stored', async () => {
	const node = new ChatbotXTriggerEvents();
	const context = createMockHookContext({
		parameters: {},
		webhookUrl: 'https://n8n.example.com/webhook/abc',
		requestCalls: [],
	});

	assert.equal(await node.webhookMethods.default.checkExists.call(context), false);
	context.getWorkflowStaticData().webhookId = 'webhook-123';
	assert.equal(await node.webhookMethods.default.checkExists.call(context), true);
});
