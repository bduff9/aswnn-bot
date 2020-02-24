import { LOCALE_STRING_FMT, LOCALE_STRING_OPTS } from './constants';
import { TCounts, TDonutUser, TNextDonutUser, TUser } from './types';

const NO_DONUTS_MSG =
	'Hooray!  No one owes any donuts currently!  Keep up the good work';

export const formatDonutList = (donutList: TDonutUser[]): string => {
	if (donutList.length === 0) return NO_DONUTS_MSG;

	let message = `*Donut List as of ${new Date().toLocaleString(
		LOCALE_STRING_FMT,
		LOCALE_STRING_OPTS,
	)}*`;
	let counter = 0;

	donutList.forEach(({ earliest, userID }) => {
		message += `\n${++counter}. <@${userID}> - added ${earliest.toLocaleString(
			LOCALE_STRING_FMT,
			LOCALE_STRING_OPTS,
		)}`;
	});

	message += `\n${':donutbounce:'.repeat(counter)}`;

	return message;
};

export const formatMyScore = (userID: string, score: number): string => {
	if (score === 0) return 'No point activity yet';

	return `<@${userID}> is at ${score} points`;
};

export const getDonutAddedMessage = (
	userID: string,
	newCount: TCounts,
): string => {
	const [owe, total] = newCount;
	const verb =
		total === 1
			? 'You were added to the'
			: `You now owe ${owe} donut days out of ${total} total infractions in the`;

	return `Tough break, <@${userID}>. ${verb} donut history`;
};

export const formatNextForDonuts = (user: TNextDonutUser): string => {
	if (user === null) return NO_DONUTS_MSG;

	const {
		counts: [owe, total],
		earliest: dateAdded,
		userID,
	} = user;

	return `Heads up, <@${userID}>, you are the next to owe donuts.

This is from ${dateAdded.toLocaleString(
		LOCALE_STRING_FMT,
		LOCALE_STRING_OPTS,
	)}.  You currently owe ${owe} / ${total} donut days total.`;
};

export const formatTopUsers = (users: TUser[]): string => {
	if (users.length === 0) return 'No point activity yet';

	return users.reduce((message, { userID, score }) => {
		return `${message}\n<@${userID}>: ${score} points`;
	}, `Current Top ${users.length} Leaderboard:`);
};

export const formatUserBroughtDonutsIn = (
	userID: string,
	newCounts: TCounts,
): string => {
	const [owe, total] = newCounts;
	const message =
		owe === 0
			? 'You are all caught up...\n\nfor now'
			: `You still owe ${owe} / ${total} donut days`;

	return `Thanks for bringing donuts in, <@${userID}>!  ${message}`;
};

export const getChannelJoinMessage = (
	userID: string,
	channelID: string,
): string => `Hello <@${userID}>, welcome to <#${channelID}>! :relaxed:`;
