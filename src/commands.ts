import { APIGatewayProxyResult } from 'aws-lambda';
import statusCode from 'http-status';

import {
	COMMAND_REGEXES,
	MAX_LEADERS,
	THE_HELP_TEXT,
	VERIFICATION_TOKEN,
} from './utils/constants';
import logger, { printError } from './utils/logger';
import { parseSlackCommand, sendSlackMessage } from './utils/slack';
import { TSlackCommand, TStrObject } from './utils/types';
import {
	getMyPoints,
	getDonutList,
	getNextForDonuts,
	userBroughtDonutsIn,
	getTopNUsers,
} from './utils/dynamodb';
import {
	formatDonutList,
	formatMyScore,
	formatNextForDonuts,
	formatTopUsers,
	formatUserBroughtDonutsIn,
} from './utils/text';

export const sendDonutReminder = async (channel: string): Promise<void> => {
	const nextUser = await getNextForDonuts();
	const message = formatNextForDonuts(nextUser);

	await sendSlackMessage(channel, message, {
		// eslint-disable-next-line @typescript-eslint/camelcase
		icon_emoji: ':doughnut:',
	});
};

const sendOutDonutList = async (channel: string): Promise<void> => {
	const donutList = await getDonutList();
	const message = formatDonutList(donutList);

	await sendSlackMessage(channel, message, {
		// eslint-disable-next-line @typescript-eslint/camelcase
		icon_emoji: ':doughnut:',
	});
};

const sendDonutsReceived = async (
	command: string,
	data: TSlackCommand,
): Promise<null | string> => {
	const { channel_id: channelID, user_id: currentUser } = data;
	const donutUser = command.match(COMMAND_REGEXES.BROUGHT_DONUTS_REGEX)[1];

	if (donutUser === currentUser) {
		return `Great work, <@${currentUser}>!  Please have someone else confirm and run this command to lower your donut listing`;
	}

	const newCounts = await userBroughtDonutsIn(donutUser);
	const message = formatUserBroughtDonutsIn(donutUser, newCounts);

	await sendSlackMessage(channelID, message, {
		// eslint-disable-next-line @typescript-eslint/camelcase
		icon_emoji: ':doughnut:',
	});

	return null;
};

const sendTopNUsers = async (
	command: string,
	channel: string,
): Promise<null | string> => {
	const topNStr = command.match(COMMAND_REGEXES.LIST_TOP)[1];
	const topN = topNStr ? parseInt(topNStr, 10) : MAX_LEADERS;

	if (topN < 1) {
		const message = `Invalid number passed (${topN}), please try again`;

		await sendSlackMessage(channel, message);

		return;
	}

	const users = await getTopNUsers(topN);
	const message = formatTopUsers(users);

	if (users.length === 0) {
		return message;
	}

	await sendSlackMessage(channel, message);

	return null;
};

export const handleCommand = async (
	message: TSlackCommand,
	headers: TStrObject,
): Promise<APIGatewayProxyResult> => {
	const { channel_id: channelID, text, token } = message;
	const command = parseSlackCommand(text);
	const response: APIGatewayProxyResult = {
		body: null,
		headers: {
			'X-Slack-No-Retry': 1,
		},
		statusCode: statusCode.OK,
	};

	if (token !== VERIFICATION_TOKEN) {
		logger.error('Invalid token received', { theMessage: message });
		response.statusCode = statusCode.UNAUTHORIZED;

		return response;
	}

	if ('X-Slack-Retry-Num' in headers) {
		logger.warn('X-Slack-Retry-Num found in headers, ignoring...', {
			theMessage: message,
			retryHeader: headers['X-Slack-Retry-Num'],
		});

		return response;
	}

	const { user_id: userID } = message;
	let score: number;
	let result: null | string;

	try {
		switch (command) {
			case 'help':
				response.body = THE_HELP_TEXT;

				break;
			case 'me':
				score = await getMyPoints(userID);

				response.body = formatMyScore(userID, score);

				break;
			case 'list donuts':
				await sendOutDonutList(channelID);

				break;
			case 'next for donuts':
				await sendDonutReminder(channelID);

				break;
			case (command.match(COMMAND_REGEXES.BROUGHT_DONUTS_REGEX) || {}).input:
				result = await sendDonutsReceived(text, message);

				if (result) response.body = result;

				break;
			case (command.match(COMMAND_REGEXES.LIST_TOP) || {}).input:
				result = await sendTopNUsers(command, channelID);

				if (result) response.body = result;

				break;
			default:
				response.body = `
Invalid command: ${command}
${THE_HELP_TEXT}
`;

				break;
		}
	} catch (error) {
		logger.error('Error when parsing command', {
			error: printError(error),
			theMessage: message,
		});
		response.statusCode = statusCode.INTERNAL_SERVER_ERROR;
		response.body = 'Error during command, please try again';
	}

	return response;
};
