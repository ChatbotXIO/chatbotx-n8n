import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { chatbotXApiRequest } from './api';

const EVENTS_WITH_SOURCE_ID = new Set([
	'tagApplied',
	'tagRemoved',
	'subscribedToSequence',
	'unsubscribedFromSequence',
]);

type WebhookStaticData = {
	webhookId?: string;
};

export class ChatbotXTriggerEvents implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ChatbotX Trigger - Watch Events',
		name: 'chatbotXTriggerEvents',
		icon: { light: 'file:icons/chatbotx.png', dark: 'file:icons/chatbotx.dark.png' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts a workflow when a subscribed event occurs in ChatbotX',
		defaults: { name: 'ChatbotX Trigger - Watch Events' },
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'chatbotXApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Archived', value: 'archived' },
					{ name: 'Contact Info Updated', value: 'contactInfoUpdated' },
					{ name: 'Contact Referred a New Contact', value: 'contactReferredANewContact' },
					{
						name: 'Contact Referred an Existing Contact',
						value: 'contactReferredExistingContact',
					},
					{
						name: 'Contact Unsubscribed From Broadcast',
						value: 'contactUnsubscribedFormBroadcast',
					},
					{ name: 'Conversation Assigned', value: 'conversationAssigned' },
					{ name: 'Conversation Transferred to Bot', value: 'conversationTransferredToBot' },
					{ name: 'Conversation Transferred to Human', value: 'conversationTransferredToHuman' },
					{ name: 'Conversation Unassigned', value: 'conversationUnassigned' },
					{ name: 'Custom Field Value Changed', value: 'customFieldValueChanged' },
					{ name: 'Follow Up', value: 'followUp' },
					{ name: 'New Contact', value: 'newContact' },
					{ name: 'Subscribed to Sequence', value: 'subscribedToSequence' },
					{ name: 'Tag Applied', value: 'tagApplied' },
					{ name: 'Tag Removed', value: 'tagRemoved' },
					{ name: 'Unsubscribed From Sequence', value: 'unsubscribedFromSequence' },
				],
				default: 'newContact',
			},
			{
				displayName: 'Source ID',
				name: 'sourceId',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						event: Array.from(EVENTS_WITH_SOURCE_ID),
					},
				},
				description:
					'Optional filter for the event. See the description of the selected event above.',
			},
		],
		usableAsTool: true,
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				return Boolean(staticData.webhookId);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const event = this.getNodeParameter('event') as string;
				const sourceId = this.getNodeParameter('sourceId', '') as string;

				const condition: IDataObject = { type: event };
				if (EVENTS_WITH_SOURCE_ID.has(event) && sourceId) {
					condition.sourceId = sourceId;
				}

				const response = (await chatbotXApiRequest.call(this, 'POST', '/v1/webhooks', {
					name: `n8n: ${event}`,
					url: webhookUrl,
					conditions: [condition],
				})) as IDataObject;

				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				staticData.webhookId = response.id as string;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as WebhookStaticData;
				if (!staticData.webhookId) {
					return true;
				}

				try {
					await chatbotXApiRequest.call(this, 'DELETE', `/v1/webhooks/${staticData.webhookId}`);
				} catch (error) {
					// Webhook may already be gone (deleted manually, workspace cleanup, etc.) —
					// don't block deactivation on it, but don't hide it either.
					this.logger.warn(
						`ChatbotX Trigger - Watch Events: failed to unregister webhook ${staticData.webhookId}: ${
							(error as Error).message
						}`,
					);
				}

				delete staticData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// The payload already carries `event` (e.g. "new_contact", "tag_applied"),
		// `contact_id`, `timestamp`, and event-specific fields (e.g. `tag`,
		// `custom_field`) — see apps/worker/src/webhook/services/webhook-payload.builder.ts
		// in the ChatbotX server. Pass it through as-is.
		const payload = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(payload)],
		};
	}
}
