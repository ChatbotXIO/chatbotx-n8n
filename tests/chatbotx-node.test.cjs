const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatbotX } = require('../dist/nodes/ChatbotX/ChatbotX.node.js');

test('ChatbotX node exposes Contact and Custom resources', () => {
	const node = new ChatbotX();
	const resource = node.description.properties.find(
		(p) => p.name === 'resource' && !p.displayOptions,
	);

	assert.deepEqual(
		resource.options.map((o) => o.value),
		['contact', 'custom'],
	);
});

test('ChatbotX node exposes the 12 documented contact operations', () => {
	const node = new ChatbotX();
	const contactOperation = node.description.properties.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('contact'),
	);

	const values = contactOperation.options.map((o) => o.value).sort();
	const expected = [
		'addTags',
		'create',
		'delete',
		'deleteCustomField',
		'findByCustomField',
		'get',
		'list',
		'removeTags',
		'sendFlow',
		'sendMessage',
		'setCustomFields',
		'upsert',
	].sort();

	assert.deepEqual(values, expected);
});

test('ChatbotX node exposes a generic "API Call" operation under Custom', () => {
	const node = new ChatbotX();
	const customOperation = node.description.properties.find(
		(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes('custom'),
	);

	assert.deepEqual(
		customOperation.options.map((o) => o.value),
		['apiCall'],
	);
});

test('ChatbotX node requires the chatbotXApi credential', () => {
	const node = new ChatbotX();

	assert.deepEqual(node.description.credentials, [{ name: 'chatbotXApi', required: true }]);
});
