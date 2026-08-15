import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ChatbotXApi implements ICredentialType {
	name = 'chatbotXApi';
	displayName = 'ChatbotX API';
	icon = { light: 'file:../nodes/ChatbotX/icons/chatbotx.png', dark: 'file:../nodes/ChatbotX/icons/chatbotx.dark.png' } as const;
	documentationUrl = 'https://chatbotx.io/docs/api-reference/api-overview';

	properties: INodeProperties[] = [
		{
			displayName: 'API URL',
			name: 'apiUrl',
			type: 'string',
			default: 'https://app.chatbotx.io/api',
			required: true,
			description:
				'The base URL for the ChatbotX API. Use the default for ChatbotX Cloud, or https://your-domain/api for self-hosted.',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Workspace API token from Settings > Integrations > ChatbotX API Access Token',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.apiUrl.replace(/\\/$/, "")}}',
			url: '/v1/workspaces',
			method: 'GET',
		},
	};
}
