export const {
	BOT_TOKEN,
	DONUT_TABLE,
	POINT_TABLE,
	VERIFICATION_TOKEN,
} = process.env;

export let BOT_USER_ID: null | string = null;

export const setBotUserID = (userID: string): void => {
	BOT_USER_ID = userID;
};

export const COMMAND_REGEXES = {
	BROUGHT_DONUTS_REGEX: /<@([^<@>|]+).*>\s+brought\sdonuts/i,
	LIST_TOP: /^top(?:\s(\d+))?/im,
};

export const DONUT_POLL = /do(?:ugh)?nut/i;

export const LOCALE_STRING_FMT = 'en-US';

export const LOCALE_STRING_OPTS = { timeZone: 'America/Chicago' };

export const MAX_LEADERS = 5;

export const MESSAGE_REGEXES = {
	ALL_USERS: /<@([^<@>|]+).*?>/gi,
	MULTI_PLUS: /<@([^<@>|]+).*>\s*(\d+)\+/i,
	MULTI_SUBTRACT: /<@([^<@>|]+).*>\s*(\d+)-/i,
	ONE_USER: /<@([^<@>|]+).*>/i,
	SINGLE_PLUS: /<@([^<@>|]+).*>\s*\+{2}/i,
	SINGLE_SUBTRACT: /<@([^<@>|]+).*>\s*-{2}/i,
};

export const THE_HELP_TEXT = `
The official ASWNN Bot

Invite the bot to specific channels with \`/invite @i11_bot\`

*Commands*
\`/i11bot me\` - See your points
\`/i11bot top\` - See top ${MAX_LEADERS} points
\`/i11bot top N\` - See top N points
\`/i11bot list donuts\` - See all of donut list
\`/i11bot next for donuts\` - Notify the next on the list to bring donuts
\`/i11bot @username brought donuts\` - Remove earliest infraction from \`@username\`
\`/i11bot help\` - See this help screen

*Assigning Points*
\`@username ++\` — Award 1 point to \`@username\`
\`@username --\` — Take away 1 point from \`@username\`
\`@username N+\` — Award N points to \`@username\`
\`@username N-\` — Take away N points from \`@username\`

*Adding to Donut List*
Send out a poll using the word "donut", such as:
\`/poll "Should I bring donuts?" "Yes" "Heck yes"\`
`;
