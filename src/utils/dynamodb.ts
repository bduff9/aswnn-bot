import AWS from 'aws-sdk';
import uuidv4 from 'uuid/v4';

import { DONUT_TABLE, POINT_TABLE } from './constants';
import logger from './logger';
import { getUserFromMention, sendSlackMessage } from './slack';
import {
	TCounts,
	TDonutHistory,
	TDonutUser,
	TNextDonutUser,
	TUser,
} from './types';

const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const DONUT_COLS = {
	DateOfInfraction: 'dateOfInfraction',
	DateRepaid: 'dateRepaid',
	ID: 'id',
	UserID: 'userID',
};

const POINT_COLS = {
	Points: 'points',
	UserID: 'userID',
};

const getDonutHistoryForUser = async (
	userID: string,
): Promise<TDonutHistory[]> => {
	const queryParams: AWS.DynamoDB.QueryInput = {
		ExpressionAttributeValues: {
			':userID': { S: userID },
		},
		IndexName: 'userID',
		KeyConditionExpression: `${DONUT_COLS.UserID} = :userID`,
		TableName: DONUT_TABLE,
	};
	const { Items, Count, ScannedCount } = await dynamoDB
		.query(queryParams)
		.promise();

	logger.info('Found user donut history', {
		queryResults: { Count, ScannedCount },
		userID,
	});

	return Items.map(
		(item): TDonutHistory => {
			const id = item[DONUT_COLS.ID].S;
			const dateOfInfractionStr = item[DONUT_COLS.DateOfInfraction].S;
			const dateOfInfraction = new Date(dateOfInfractionStr);
			const dateRepaidStr = item[DONUT_COLS.DateRepaid]?.S;
			const dateRepaid = dateRepaidStr ? new Date(dateRepaidStr) : null;

			return {
				id,
				userID,
				dateOfInfraction,
				dateRepaid,
			};
		},
	);
};

const getDonutCountForUser = async (userID: string): Promise<TCounts> => {
	const userHistory = await getDonutHistoryForUser(userID);
	let userCount: TCounts = [0, 0];

	if (userHistory.length > 0) {
		userCount = userHistory.reduce(
			(currentCount, item): TCounts => {
				const { dateRepaid } = item;

				if (!dateRepaid) currentCount[0]++;

				currentCount[1]++;

				return currentCount;
			},
			[0, 0],
		);
	}

	logger.info('Found counts for user donut history', {
		userCount,
		userID,
	});

	return userCount;
};

export const addUserToDonutList = async (userID: string): Promise<TCounts> => {
	const now = new Date().toISOString();
	const addParams: AWS.DynamoDB.PutItemInput = {
		Item: {
			[DONUT_COLS.DateOfInfraction]: { S: now },
			[DONUT_COLS.ID]: { S: uuidv4() },
			[DONUT_COLS.UserID]: { S: userID },
		},
		TableName: DONUT_TABLE,
	};

	await dynamoDB.putItem(addParams).promise();

	logger.info('User added to donut history', {
		addParams,
		userID,
	});

	return await getDonutCountForUser(userID);
};

type TModifyUserPointsParams = {
	channel: string;
	currentUser: string;
	points: number;
	users: string[];
};

export const getDonutList = async (): Promise<TDonutUser[]> => {
	const params: AWS.DynamoDB.ScanInput = {
		FilterExpression: `attribute_not_exists(${DONUT_COLS.DateRepaid})`,
		TableName: DONUT_TABLE,
	};
	const { Count, Items, ScannedCount } = await dynamoDB.scan(params).promise();
	const users = Items.map(
		(item): TDonutUser => {
			const earliestStr = item[DONUT_COLS.DateOfInfraction].S;
			const earliest = new Date(earliestStr);
			const userID = item[DONUT_COLS.UserID].S;

			return { earliest, userID };
		},
	);

	users.sort(
		(user1, user2): number =>
			user1.earliest.getTime() - user2.earliest.getTime(),
	);

	logger.info('Retrieved donut list from DynamoDB', {
		scanResults: { Count, ScannedCount },
		users,
	});

	return users;
};

export const getMyPoints = async (userID: string): Promise<number> => {
	const params: AWS.DynamoDB.GetItemInput = {
		Key: {
			[POINT_COLS.UserID]: { S: userID },
		},
		TableName: POINT_TABLE,
	};
	const results = await dynamoDB.getItem(params).promise();
	const user = results.Item;
	let points = 0;

	if (user) {
		points = parseInt(user.points.N, 10);
	}

	logger.info('User points called', { user, userID });

	return points;
};

export const getNextForDonuts = async (): Promise<TNextDonutUser | null> => {
	const fullDonutList = await getDonutList();
	const nextUser: TNextDonutUser = fullDonutList[0] as TNextDonutUser;

	nextUser.counts = await getDonutCountForUser(nextUser.userID);

	logger.info('Retrieved next user for donuts', { fullDonutList, nextUser });

	return nextUser;
};

export const getTopNUsers = async (topN: number): Promise<TUser[]> => {
	const params: AWS.DynamoDB.ScanInput = {
		TableName: POINT_TABLE,
	};
	const users: TUser[] = [];
	let hasMore = true;

	while (hasMore) {
		const {
			Count,
			Items,
			LastEvaluatedKey,
			ScannedCount,
		} = await dynamoDB.scan(params).promise();

		users.push(
			...Items.map(
				(item): TUser => {
					const scoreStr = item[POINT_COLS.Points].N;
					const score = parseInt(scoreStr, 10);
					const userID = item[POINT_COLS.UserID].S;

					return { score, userID };
				},
			),
		);

		if (LastEvaluatedKey) {
			params.ExclusiveStartKey = LastEvaluatedKey;
			hasMore = true;
		} else {
			hasMore = false;
		}

		logger.info('Scanned points table for all users', {
			foundUsers: users.length,
			hasMore,
			scanResults: { Count, ScannedCount },
		});
	}

	users.sort((user1, user2): number => user2.score - user1.score);

	logger.info('Retrieved and sorted all users from DynamoDB', {
		topN,
		userCount: users.length,
	});

	return users.slice(0, topN);
};

const getPointChangeMessage = (
	userID: string,
	points: number,
	score: number,
): string => {
	if (points > 1) {
		return `Great work, <@${userID}>, ${points} times! Current score: ${score}`;
	}

	if (points === 1) {
		return `Good work, <@${userID}>! Current score: ${score}`;
	}

	if (points === -1) {
		return `Bad form, <@${userID}>! Current score: ${score}`;
	}

	if (points < -1) {
		return `Ugh, <@${userID}> is the worst times ${points}! Current score: ${score}`;
	}

	return `Invalid points passed (${points}), please try again`;
};

export const modifyUserPoints = async ({
	channel,
	currentUser,
	points,
	users,
}: TModifyUserPointsParams): Promise<void> => {
	for (const userStr of users) {
		const userID = getUserFromMention(userStr);

		if (userID === currentUser) {
			const message = `Hey, what are you trying to pull, <@${currentUser}>?!`;

			await sendSlackMessage(channel, message);

			continue;
		}

		const getParams: AWS.DynamoDB.GetItemInput = {
			Key: {
				[POINT_COLS.UserID]: { S: userID },
			},
			TableName: POINT_TABLE,
		};
		const { Item: user } = await dynamoDB.getItem(getParams).promise();
		let score = points;

		if (user) {
			const existingPointsStr = user[POINT_COLS.Points].N;
			const existingPoints = parseInt(existingPointsStr, 10);

			score += existingPoints;

			const params: AWS.DynamoDB.UpdateItemInput = {
				ExpressionAttributeValues: {
					':pts': { N: `${score}` },
				},
				Key: {
					[POINT_COLS.UserID]: { S: userID },
				},
				ReturnValues: 'UPDATED_NEW',
				TableName: POINT_TABLE,
				UpdateExpression: `set ${POINT_COLS.Points} = :pts`,
			};

			await dynamoDB.updateItem(params).promise();
		} else {
			const addParams: AWS.DynamoDB.PutItemInput = {
				Item: {
					[POINT_COLS.UserID]: { S: userID },
					[POINT_COLS.Points]: { N: `${score}` },
				},
				TableName: POINT_TABLE,
			};

			await dynamoDB.putItem(addParams).promise();
		}

		logger.info(`Changed users points`, {
			channel,
			currentUser,
			points,
			score,
			userID,
		});

		const message = getPointChangeMessage(userID, points, score);

		await sendSlackMessage(channel, message);
	}
};

export const userBroughtDonutsIn = async (userID: string): Promise<TCounts> => {
	const userHistory = await getDonutHistoryForUser(userID);
	const unpaid = userHistory
		.filter(({ dateRepaid }): boolean => !dateRepaid)
		.sort(
			(user1, user2): number =>
				user1.dateOfInfraction.getTime() - user2.dateOfInfraction.getTime(),
		);
	const repaid = unpaid.splice(0, 1)[0];

	if (repaid) {
		const now = new Date().toISOString();
		const params: AWS.DynamoDB.UpdateItemInput = {
			ExpressionAttributeValues: {
				':now': { S: now },
			},
			Key: {
				[DONUT_COLS.ID]: { S: repaid.id },
				[DONUT_COLS.DateOfInfraction]: {
					S: repaid.dateOfInfraction.toISOString(),
				},
			},
			ReturnValues: 'UPDATED_NEW',
			TableName: DONUT_TABLE,
			UpdateExpression: `set ${DONUT_COLS.DateRepaid} = :now`,
		};

		await dynamoDB.updateItem(params).promise();
	}

	const counts: TCounts = [unpaid.length, userHistory.length]; //await getDonutCountForUser(userID);

	logger.info('Marked user as repaid for earliest infraction', {
		counts,
		repaid,
		userID,
	});

	return counts;
};
