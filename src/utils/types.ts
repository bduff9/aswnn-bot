export type TDonutHistory = {
	dateOfInfraction: Date;
	dateRepaid: Date | null;
	id: string;
	userID: string;
};

export type TDonutUser = {
	earliest: Date;
	history?: Date[];
	userID: string;
};

export type TCounts = [number, number];

export type TNextDonutUser = TDonutUser & {
	counts: TCounts;
};

export type TSlackCommand = {
	channel_id: string;
	channel_name: string;
	command: '/i11bot';
	response_url: string;
	team_domain: string;
	team_id: string;
	text: string;
	token: string;
	trigger_id: string;
	user_id: string;
	user_name: string;
};

export type TObject = {
	[key: string]: boolean | null | number | string;
};

type TTextBlock = {
	block_id?: string;
	elements?: TTextBlock[];
	text?: string | { type: string; text: string; verbatim: boolean };
	type: string;
};

export type TSlackUserMessage = {
	blocks?: TTextBlock[];
	channel: string;
	channel_type: 'channel';
	client_msg_id: string;
	event_ts: string;
	team: string;
	text: string;
	ts: string;
	type: 'message';
	user: string;
};

export type TSlackBotMessage = {
	blocks?: TTextBlock[];
	bot_id: string;
	channel: string;
	channel_type: 'channel';
	event_ts: string;
	subtype: 'bot_message' | 'channel_join' | 'message_changed';
	text: string;
	ts: string;
	type: 'message';
	user?: string;
	username?: string;
};

export type TSlackMessageEvent = {
	api_app_id: string;
	authed_users: string[];
	event: TSlackBotMessage | TSlackUserMessage;
	event_id: string;
	event_time: number;
	team_id: string;
	token: string;
	type: 'event_callback';
};

export type TSlackEvent = TSlackMessageEvent | TSlackVerificationEvent;

export type TStrObject = {
	[key: string]: string;
};

export type TSlackVerificationEvent = {
	challenge: string;
	token: string;
	type: 'url_verification';
};

export type TUser = {
	score: number;
	userID: string;
};
