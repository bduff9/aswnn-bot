import { APIGatewayProxyResult } from 'aws-lambda';
import statusCode from 'http-status';

import { verifyCall } from './utils';
import { BOT_USER_ID, DONUT_POLL, VERIFICATION_TOKEN } from './utils/constants';
import { addUserToDonutList } from './utils/dynamodb';
import logger, { printError } from './utils/logger';
import {
	getBotsUserID,
	parseSlackMessage,
	sendSlackMessage,
} from './utils/slack';
import { getDonutAddedMessage, getChannelJoinMessage } from './utils/text';
import {
	TCounts,
	TSlackBotMessage,
	TSlackEvent,
	TSlackUserMessage,
	TStrObject,
} from './utils/types';

const handleSubtype = async (
	event: TSlackBotMessage,
	authedUsers: string[],
): Promise<void> => {
	let isDonutPoll: boolean;
	let userID: string;
	let newNumber: TCounts;
	let message: string;

	switch (event.subtype) {
		case 'bot_message':
			if (
				event.username !== 'Polly' ||
				!event.text
					.trim()
					.toLowerCase()
					.includes('poll')
			) {
				return;
			}

			isDonutPoll = event.blocks?.some(({ text, type }): boolean => {
				if (type !== 'section') return false;

				if (typeof text === 'string') return false;

				return text.text.match(DONUT_POLL) !== null;
			});

			if (!isDonutPoll) {
				return;
			}

			logger.info('Polly message received', { authedUsers, event });

			userID = authedUsers[0];
			newNumber = await addUserToDonutList(userID);
			message = getDonutAddedMessage(userID, newNumber);

			await sendSlackMessage(event.channel, message);

			return;
		case 'channel_join':
			message = getChannelJoinMessage(event.user, event.channel);

			await sendSlackMessage(event.channel, message);

			return;
		case 'message_changed':
			return;
		default:
			logger.info('New subtype found', { subtype: event.subtype });

			return;
	}
};

export const handleMessageEvent = async (
	message: TSlackEvent,
	headers: TStrObject,
): Promise<APIGatewayProxyResult> => {
	const response: APIGatewayProxyResult = {
		body: null,
		headers: {
			'X-Slack-No-Retry': 1,
		},
		statusCode: statusCode.OK,
	};

	if ('X-Slack-Retry-Num' in headers) {
		logger.warn('X-Slack-Retry-Num found in headers, ignoring...', {
			retryHeader: headers['X-Slack-Retry-Num'],
		});

		return response;
	}

	const { token } = message;
	let event: TSlackBotMessage | TSlackUserMessage;

	if (BOT_USER_ID === null) await getBotsUserID();

	try {
		switch (message.type) {
			case 'url_verification':
				response.body = verifyCall(message);
				break;
			case 'event_callback':
				event = message.event;

				if (token !== VERIFICATION_TOKEN) {
					logger.error('Invalid token received', { theMessage: message });
					response.body = null;
					response.statusCode = statusCode.UNAUTHORIZED;

					return response;
				}

				if ('bot_id' in event && event.bot_id === BOT_USER_ID) {
					logger.warn('bot_id found in message, ignoring...', { event });

					return response;
				}

				if ('subtype' in event) {
					await handleSubtype(event, message.authed_users);

					return response;
				}

				await parseSlackMessage(event);

				break;
			default:
				logger.info('New message type', { theMessage: message });
				response.statusCode = statusCode.BAD_REQUEST;
				response.body = 'Empty request';
				break;
		}
	} catch (error) {
		logger.error('Error when parsing message event', {
			error: printError(error),
			theMessage: message,
		});
		response.statusCode = statusCode.INTERNAL_SERVER_ERROR;
		response.body = JSON.stringify(error);
	}

	return response;
};
