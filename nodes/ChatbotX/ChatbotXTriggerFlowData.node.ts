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

type WebhookStaticData = {
	webhookId?: string;
};

export class ChatbotXTriggerFlowData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ChatbotX Trigger - Watch Flow Data',
		name: 'chatbotXTriggerFlowData',
		icon: { light: 'file:icons/chatbotx.png', dark: 'file:icons/chatbotx.dark.png' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["eventName"]}}',
		description: 'Starts a workflow when a ChatbotX flow step sends data to this trigger',
		defaults: { name: 'ChatbotX Trigger - Watch Flow Data' },
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
				displayName: 'Event Name',
				name: 'eventName',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'order_confirmed',
				description:
					'Custom event name configured on the "Make" step of a ChatbotX flow. When that step runs for a matching event, its data is sent here.',
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
				const eventName = this.getNodeParameter('eventName') as string;

				const response = (await chatbotXApiRequest.call(this, 'POST', '/v1/external-webhooks', {
					url: webhookUrl,
					event: eventName,
					provider: 'n8n',
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
					await chatbotXApiRequest.call(
						this,
						'DELETE',
						`/v1/external-webhooks/${staticData.webhookId}`,
					);
				} catch (error) {
					// Webhook may already be gone (deleted manually, workspace cleanup, etc.) —
					// don't block deactivation on it, but don't hide it either.
					this.logger.warn(
						`ChatbotX Trigger - Watch Flow Data: failed to unregister webhook ${staticData.webhookId}: ${
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
		// Payload shape: { event, contact, custom_fields, tags, contact_sequences }
		// — see apps/worker/src/integration/handlers/make-handler.ts in the
		// ChatbotX server (the "Make" flow step's handler, shared by any
		// registered listener regardless of provider).
		const payload = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(payload)],
		};
	}
}
