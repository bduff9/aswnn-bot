import { VERIFICATION_TOKEN } from './constants';
import { TSlackCommand, TSlackVerificationEvent, TStrObject } from './types';

export const convertCommandStringToObject = (
	command: string,
): TSlackCommand => {
	const urlParams = new URLSearchParams(command);
	const entries = urlParams.entries();
	const result: TStrObject = {};

	for (const entry of entries) {
		const [key, value] = entry;

		result[key] = value;
	}

	return result as TSlackCommand;
};

export const verifyCall = (data: TSlackVerificationEvent): string => {
	if (data.token === VERIFICATION_TOKEN) {
		return data.challenge;
	}

	throw 'Verification failed';
};
