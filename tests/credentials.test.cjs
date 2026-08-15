const { test } = require('node:test');
const assert = require('node:assert/strict');
const { ChatbotXApi } = require('../dist/credentials/ChatbotXApi.credentials.js');

test('ChatbotXApi authenticates with a Bearer header built from the access token', () => {
	const credential = new ChatbotXApi();

	assert.equal(credential.name, 'chatbotXApi');
	assert.equal(credential.authenticate.type, 'generic');
	assert.equal(
		credential.authenticate.properties.headers.Authorization,
		'=Bearer {{$credentials.accessToken}}',
	);
});

test('ChatbotXApi tests the credential against GET /v1/workspaces', () => {
	const credential = new ChatbotXApi();

	assert.equal(credential.test.request.method, 'GET');
	assert.equal(credential.test.request.url, '/v1/workspaces');
});

test('ChatbotXApi marks the access token as a password field', () => {
	const credential = new ChatbotXApi();
	const accessToken = credential.properties.find((p) => p.name === 'accessToken');

	assert.ok(accessToken, 'accessToken property should exist');
	assert.equal(accessToken.typeOptions.password, true);
});
