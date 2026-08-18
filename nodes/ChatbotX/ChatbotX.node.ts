import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { chatbotXApiRequest } from './api';

const contactOperationOptions = [
	{ name: 'Add Tags', value: 'addTags', action: 'Add tags to a contact' },
	{ name: 'Create', value: 'create', action: 'Create a contact' },
	{ name: 'Delete', value: 'delete', action: 'Delete a contact' },
	{
		name: 'Delete Custom Field',
		value: 'deleteCustomField',
		action: 'Delete a contact custom field',
	},
	{
		name: 'Find by Custom Field',
		value: 'findByCustomField',
		action: 'Find contacts by custom field',
	},
	{ name: 'Get', value: 'get', action: 'Get a contact' },
	{ name: 'List', value: 'list', action: 'List contacts' },
	{ name: 'Remove Tags', value: 'removeTags', action: 'Remove tags from a contact' },
	{ name: 'Send Flow', value: 'sendFlow', action: 'Send a flow to a contact' },
	{ name: 'Send Message', value: 'sendMessage', action: 'Send a message to a contact' },
	{
		name: 'Set Custom Fields',
		value: 'setCustomFields',
		action: 'Set custom fields on a contact',
	},
	{
		name: 'Create or Update',
		value: 'upsert',
		action: 'Update or create a contact by identifier',
	},
];

const identifierField = {
	displayName: 'Identifier',
	name: 'identifier',
	type: 'string' as const,
	default: '',
	required: true,
	// The "id:" / "email:" / "phone:" prefixes below are literal ChatbotX API
	// syntax, not the English word "ID" — keep them lower-case.
	// eslint-disable-next-line n8n-nodes-base/node-param-placeholder-miscased-id
	placeholder: 'id:11590944070189056 | email:user@example.com | phone:+84908123456',
	// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-id
	description:
		'Contact identifier: bare contact ID, email, or phone number, or explicitly prefixed with id:, email:, or phone:',
};

export class ChatbotX implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ChatbotX',
		name: 'chatbotX',
		icon: { light: 'file:icons/chatbotx.png', dark: 'file:icons/chatbotx.dark.png' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Manage contacts and call the ChatbotX Public API',
		defaults: {
			name: 'ChatbotX',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'chatbotXApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact', value: 'contact' },
					{ name: 'Custom', value: 'custom' },
				],
				default: 'contact',
			},

			// Contact operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['contact'] } },
				options: contactOperationOptions,
				default: 'get',
			},

			// Custom operations
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['custom'] } },
				options: [{ name: 'API Call', value: 'apiCall', action: 'Make an authorized API call' }],
				default: 'apiCall',
			},

			// --- Identifier for single-contact operations ---
			{
				...identifierField,
				displayOptions: {
					show: {
						resource: ['contact'],
						operation: [
							'get',
							'delete',
							'upsert',
							'setCustomFields',
							'deleteCustomField',
							'addTags',
							'removeTags',
							'sendMessage',
							'sendFlow',
						],
					},
				},
			},

			// --- List ---
			{
				displayName: 'Keyword',
				name: 'keyword',
				type: 'string',
				default: '',
				description: 'Filter contacts by name, email, or phone',
				displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: { minValue: 1, maxValue: 100 },
				description: 'Max number of results to return',
				displayOptions: { show: { resource: ['contact'], operation: ['list'] } },
			},

			// --- Create ---
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				placeholder: 'name@email.com',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Phone Number',
				name: 'phoneNumber',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'First Name',
				name: 'firstName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Last Name',
				name: 'lastName',
				type: 'string',
				default: '',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Gender',
				name: 'gender',
				type: 'options',
				options: [
					{ name: 'Male', value: 'male' },
					{ name: 'Female', value: 'female' },
					{ name: 'Unknown', value: 'unknown' },
				],
				default: 'unknown',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Channel',
				name: 'channel',
				type: 'options',
				options: [
					{ name: 'Instagram', value: 'instagram' },
					{ name: 'Messenger', value: 'messenger' },
					{ name: 'Omnichannel', value: 'omnichannel' },
					{ name: 'SMTP', value: 'smtp' },
					{ name: 'Telegram', value: 'telegram' },
					{ name: 'TikTok', value: 'tiktok' },
					{ name: 'Webchat', value: 'webchat' },
					{ name: 'WhatsApp', value: 'whatsapp' },
					{ name: 'Zalo', value: 'zalo' },
				],
				default: 'omnichannel',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},
			{
				displayName: 'Inbox Name or ID',
				name: 'inboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getInboxes' },
				default: '',
				description:
					'Inbox to create the contact in. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['contact'], operation: ['create'] } },
			},

			// --- Update or create ---
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: { show: { resource: ['contact'], operation: ['upsert'] } },
				options: [
					{ displayName: 'Avatar URL', name: 'avatar', type: 'string', default: '' },
					{
						displayName: 'Email',
						name: 'email',
						type: 'string',
						placeholder: 'name@email.com',
						default: '',
					},
					{ displayName: 'First Name', name: 'firstName', type: 'string', default: '' },
					{
						displayName: 'Gender',
						name: 'gender',
						type: 'options',
						options: [
							{ name: 'Male', value: 'male' },
							{ name: 'Female', value: 'female' },
							{ name: 'Unknown', value: 'unknown' },
						],
						default: 'unknown',
					},
					{ displayName: 'Last Name', name: 'lastName', type: 'string', default: '' },
					{ displayName: 'Phone Number', name: 'phoneNumber', type: 'string', default: '' },
				],
			},

			// --- Find by custom field ---
			{
				displayName: 'Custom Field ID',
				name: 'customFieldId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['findByCustomField'] } },
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['findByCustomField'] } },
			},

			// --- Set custom fields ---
			{
				displayName: 'Custom Fields',
				name: 'fields',
				type: 'fixedCollection',
				typeOptions: { multipleValues: true },
				placeholder: 'Add Custom Field',
				default: {},
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['setCustomFields'] } },
				options: [
					{
						displayName: 'Field',
						name: 'field',
						values: [
							{
								displayName: 'Custom Field ID',
								name: 'customFieldId',
								type: 'string',
								default: '',
							},
							{ displayName: 'Value', name: 'value', type: 'string', default: '' },
						],
					},
				],
			},

			// --- Delete custom field ---
			{
				displayName: 'Custom Field ID or Name',
				name: 'idOrName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['deleteCustomField'] } },
			},

			// --- Add/remove tags ---
			{
				displayName: 'Tag Names or IDs',
				name: 'tagIds',
				type: 'multiOptions',
				typeOptions: { loadOptionsMethod: 'getTags' },
				default: [],
				required: true,
				description:
					'Tags to add or remove. Choose from the list, or specify IDs using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
				displayOptions: { show: { resource: ['contact'], operation: ['addTags', 'removeTags'] } },
			},

			// --- Send message ---
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				default: '',
				required: true,
				typeOptions: { rows: 3 },
				description: 'Message text (max 1,000 characters)',
				displayOptions: { show: { resource: ['contact'], operation: ['sendMessage'] } },
			},

			// --- Send flow ---
			{
				displayName: 'Flow ID',
				name: 'flowId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: { show: { resource: ['contact'], operation: ['sendFlow'] } },
			},

			// --- Send message / send flow: optional inbox override ---
			{
				displayName: 'Inbox Name or ID',
				name: 'inboxId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getInboxes' },
				default: '',
				placeholder: "Leave empty to use the contact's most recent channel",
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				displayOptions: { show: { resource: ['contact'], operation: ['sendMessage', 'sendFlow'] } },
			},

			// --- Custom API call ---
			{
				displayName: 'Method',
				name: 'method',
				type: 'options',
				options: [
					{ name: 'DELETE', value: 'DELETE' },
					{ name: 'GET', value: 'GET' },
					{ name: 'PATCH', value: 'PATCH' },
					{ name: 'POST', value: 'POST' },
					{ name: 'PUT', value: 'PUT' },
				],
				default: 'GET',
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/v1/',
				required: true,
				placeholder: '/v1/contacts',
				description: 'Path relative to the API base URL',
				displayOptions: { show: { resource: ['custom'], operation: ['apiCall'] } },
			},
			{
				displayName: 'Body (JSON)',
				name: 'body',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: { resource: ['custom'], operation: ['apiCall'], method: ['POST', 'PUT', 'PATCH'] },
				},
			},
		],
	};

	methods = {
		loadOptions: {
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await chatbotXApiRequest.call(this, 'GET', '/v1/tags')) as IDataObject;
				const tags = (response.data ?? []) as IDataObject[];
				return tags.map((tag) => ({
					name: tag.name as string,
					value: tag.id as string,
				}));
			},

			async getInboxes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const response = (await chatbotXApiRequest.call(this, 'GET', '/v1/inboxes')) as IDataObject;
				const inboxes = (response.data ?? []) as IDataObject[];
				return inboxes.map((inbox) => ({
					name: (inbox.name as string) ?? (inbox.id as string),
					value: inbox.id as string,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject | IDataObject[] = {};

				if (resource === 'contact') {
					responseData = await executeContactOperation.call(this, operation, i);
				} else if (resource === 'custom') {
					responseData = await executeCustomApiCall.call(this, i);
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, {
						itemIndex: i,
					});
				}

				if (Array.isArray(responseData)) {
					for (const entry of responseData) {
						returnData.push({ json: entry, pairedItem: { item: i } });
					}
				} else {
					returnData.push({ json: responseData, pairedItem: { item: i } });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

function normalizeIdentifier(identifier: string): string {
	const trimmed = identifier.trim();

	if (/^(?:id|email|phone):/i.test(trimmed)) {
		return trimmed;
	}
	if (trimmed.includes('@')) {
		return `email:${trimmed}`;
	}
	if (trimmed.includes('+')) {
		return `phone:${trimmed}`;
	}

	if (/^\d+$/.test(trimmed)) {
		return trimmed.length > 15 ? `id:${trimmed}` : `phone:${trimmed}`;
	}

	return trimmed;
}

async function executeContactOperation(
	this: IExecuteFunctions,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'list': {
			const keyword = this.getNodeParameter('keyword', i, '') as string;
			const limit = this.getNodeParameter('limit', i, 50) as number;
			const qs: IDataObject = { perPage: limit };
			if (keyword) {
				qs.keyword = keyword;
			}
			const response = (await chatbotXApiRequest.call(
				this,
				'GET',
				'/v1/contacts',
				{},
				qs,
			)) as IDataObject;
			return (response.data ?? []) as IDataObject[];
		}

		case 'get': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			return (await chatbotXApiRequest.call(
				this,
				'GET',
				`/v1/contacts/${encodeURIComponent(identifier)}`,
			)) as IDataObject;
		}

		case 'create': {
			const body: IDataObject = {
				email: this.getNodeParameter('email', i, '') as string,
				gender: this.getNodeParameter('gender', i) as string,
				channel: this.getNodeParameter('channel', i) as string,
				inboxId: this.getNodeParameter('inboxId', i) as string,
			};
			const phoneNumber = this.getNodeParameter('phoneNumber', i, '') as string;
			const firstName = this.getNodeParameter('firstName', i, '') as string;
			const lastName = this.getNodeParameter('lastName', i, '') as string;
			if (phoneNumber) body.phoneNumber = phoneNumber;
			if (firstName) body.firstName = firstName;
			if (lastName) body.lastName = lastName;
			return (await chatbotXApiRequest.call(this, 'POST', '/v1/contacts', body)) as IDataObject;
		}

		case 'upsert': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
			return (await chatbotXApiRequest.call(
				this,
				'POST',
				`/v1/contacts/${encodeURIComponent(identifier)}/upsert`,
				additionalFields,
			)) as IDataObject;
		}

		case 'delete': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			await chatbotXApiRequest.call(
				this,
				'DELETE',
				`/v1/contacts/${encodeURIComponent(identifier)}`,
			);
			return { success: true };
		}

		case 'findByCustomField': {
			const customFieldId = this.getNodeParameter('customFieldId', i) as string;
			const value = this.getNodeParameter('value', i) as string;
			const response = (await chatbotXApiRequest.call(
				this,
				'GET',
				'/v1/contacts/find-by-custom-field',
				{},
				{ customFieldId, value },
			)) as IDataObject;
			return (response.data ?? []) as IDataObject[];
		}

		case 'setCustomFields': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const fieldsCollection = this.getNodeParameter('fields', i, {}) as IDataObject;
			const fields = ((fieldsCollection.field ?? []) as IDataObject[]).map((field) => ({
				customFieldId: field.customFieldId,
				value: field.value,
			}));
			await chatbotXApiRequest.call(
				this,
				'PUT',
				`/v1/contacts/${encodeURIComponent(identifier)}/custom-fields`,
				{ fields },
			);
			return { success: true };
		}

		case 'deleteCustomField': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const idOrName = this.getNodeParameter('idOrName', i) as string;
			await chatbotXApiRequest.call(
				this,
				'DELETE',
				`/v1/contacts/${encodeURIComponent(identifier)}/custom-fields/${encodeURIComponent(idOrName)}`,
			);
			return { success: true };
		}

		case 'addTags':
		case 'removeTags': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const tagIds = this.getNodeParameter('tagIds', i, []) as string[];
			const method: IHttpRequestMethods = operation === 'addTags' ? 'POST' : 'DELETE';
			await chatbotXApiRequest.call(
				this,
				method,
				`/v1/contacts/${encodeURIComponent(identifier)}/tags`,
				{ tagIds },
			);
			return { success: true };
		}

		case 'sendMessage': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const text = this.getNodeParameter('text', i) as string;
			const inboxId = this.getNodeParameter('inboxId', i, '') as string;
			const body: IDataObject = { text };
			if (inboxId) body.inboxId = inboxId;
			await chatbotXApiRequest.call(
				this,
				'POST',
				`/v1/contacts/${encodeURIComponent(identifier)}/messages`,
				body,
			);
			return { success: true };
		}

		case 'sendFlow': {
			const identifier = normalizeIdentifier(this.getNodeParameter('identifier', i) as string);
			const flowId = this.getNodeParameter('flowId', i) as string;
			const inboxId = this.getNodeParameter('inboxId', i, '') as string;
			const body: IDataObject = { flowId };
			if (inboxId) body.inboxId = inboxId;
			await chatbotXApiRequest.call(
				this,
				'POST',
				`/v1/contacts/${encodeURIComponent(identifier)}/flows`,
				body,
			);
			return { success: true };
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, {
				itemIndex: i,
			});
	}
}

async function executeCustomApiCall(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const method = this.getNodeParameter('method', i) as IHttpRequestMethods;
	const path = this.getNodeParameter('path', i) as string;
	const bodyJson = this.getNodeParameter('body', i, '{}') as string;
	const body = bodyJson ? (JSON.parse(bodyJson) as IDataObject) : {};

	return (await chatbotXApiRequest.call(this, method, path, body)) as IDataObject;
}
