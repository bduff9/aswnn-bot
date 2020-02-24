import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';

import { handleCommand, sendDonutReminder } from './src/commands';
import { handleMessageEvent } from './src/events';
import { convertCommandStringToObject } from './src/utils';
import logger from './src/utils/logger';
import { getReminderChannel } from './src/utils/slack';
import { TSlackEvent } from './src/utils/types';

export const commandHandler: APIGatewayProxyHandler = async ({
	body,
	headers,
}): Promise<APIGatewayProxyResult> => {
	const data = convertCommandStringToObject(body);

	logger.info('ASWNN Bot command handler called', { body, data });

	return handleCommand(data, headers);
};

export const eventHandler: APIGatewayProxyHandler = async ({
	body,
	headers,
}): Promise<APIGatewayProxyResult> => {
	const data = JSON.parse(body) as TSlackEvent;

	logger.info('ASWNN Bot event handler called', { body, data });

	return handleMessageEvent(data, headers);
};

export const reminderHandler = async (): Promise<void> => {
	const channel = await getReminderChannel();

	if (channel) {
		await sendDonutReminder(channel);
	} else {
		logger.error('No Chicago channel found', { channel });
	}
};
