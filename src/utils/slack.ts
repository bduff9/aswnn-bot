import Slack from 'slack';

import { BOT_TOKEN, MESSAGE_REGEXES, setBotUserID } from './constants';
import { modifyUserPoints } from './dynamodb';
import logger from './logger';
import { TSlackUserMessage, TStrObject } from './types';

export const getBotsUserID = async (): Promise<void> =>
	await Slack.auth.test({ token: BOT_TOKEN }).then((user): void => {
		logger.info('User result', { user });

		setBotUserID(user.user_id);
	});

export const getReminderChannel = async (): Promise<string> => {
	const params: Conversations.List.Params = {
		// eslint-disable-next-line @typescript-eslint/camelcase
		exclude_archived: true,
		token: BOT_TOKEN,
		types: 'private_channel',
	};
	const { channels } = await Slack.conversations.list(params);

	const channel = channels.find(
		({ name }: { name: string }): boolean => name === 'chicago',
	);

	return channel?.id;
};

export const getUserFromMention = (mention: string): string => {
	const result = mention.match(MESSAGE_REGEXES.ONE_USER);

	if (result === null) throw `Invalid mention found: ${mention}`;

	return result[1];
};

export const parseSlackCommand = (text: string): string => {
	const command = text.trim().toLowerCase();

	logger.info('Slack command received', { command, text });

	return command;
};

export const sendSlackMessage = async (
	channel: string,
	text: string,
	extraArgs?: TStrObject,
): Promise<Chat.PostMessage.Response> => {
	const params: Chat.PostMessage.Params = {
		...extraArgs,
		channel,
		text,
		token: BOT_TOKEN,
	};

	return Slack.chat.postMessage(params);
};

export const parseSlackMessage = async (
	event: TSlackUserMessage,
): Promise<void> => {
	const { text } = event;
	const currentUser = event.user;
	let users: string[];
	let pointStr: string;
	let points: number;

	switch (event.text) {
		case (text.match(MESSAGE_REGEXES.MULTI_PLUS) || {}).input:
			users = [...text.match(MESSAGE_REGEXES.ALL_USERS)];
			pointStr = text.match(MESSAGE_REGEXES.MULTI_PLUS)[2];
			points = parseInt(pointStr, 10);

			await modifyUserPoints({
				channel: event.channel,
				currentUser,
				points,
				users,
			});

			break;
		case (text.match(MESSAGE_REGEXES.MULTI_SUBTRACT) || {}).input:
			users = [...text.match(MESSAGE_REGEXES.ALL_USERS)];
			pointStr = text.match(MESSAGE_REGEXES.MULTI_SUBTRACT)[2];
			points = -1 * parseInt(pointStr, 10);

			await modifyUserPoints({
				channel: event.channel,
				currentUser,
				points,
				users,
			});

			break;
		case (text.match(MESSAGE_REGEXES.SINGLE_PLUS) || {}).input:
			users = [...text.match(MESSAGE_REGEXES.ALL_USERS)];
			points = 1;

			await modifyUserPoints({
				channel: event.channel,
				currentUser,
				points,
				users,
			});

			break;
		case (text.match(MESSAGE_REGEXES.SINGLE_SUBTRACT) || {}).input:
			users = [...text.match(MESSAGE_REGEXES.ALL_USERS)];
			points = -1;

			await modifyUserPoints({
				channel: event.channel,
				currentUser,
				points,
				users,
			});

			break;
		default:
			// All other texts we can safely ignore
			break;
	}
};
