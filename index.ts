import fs from 'fs';

import AWS from 'aws-sdk';
import Papa from 'papaparse';
import uuidv4 from 'uuid/v4';

const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const DONUT_COLS = {
	DateOfInfraction: 'dateOfInfraction',
	DateRepaid: 'dateRepaid',
	ID: 'id',
	UserID: 'userID',
};
const DONUT_TABLE = 'DonutHistory';

const POINT_COLS = {
	Points: 'points',
	UserID: 'userID',
};
const POINT_TABLE = 'UserPointTracker';

type TDonutUser = {
	DateAdded: Date;
	DateRepaid: Date;
	DisplayName: string;
};
type TFixedDonutUser = {
	DateAdded: string;
	DateRepaid: string;
	UserID: string;
};
type TFixedPointUser = {
	Points: number;
	UserID: string;
};
type TMember = {
	id: string;
	profile: {
		display_name: string;
		real_name: string;
	};
};
type TMemberResponse = {
	ok: boolean;
	members: TMember[];
};
type TPointUser = {
	DisplayName: string;
	Points: number;
};
type TUser = {
	[displayName: string]: string;
};

const readUsersIntoMemory = (): TUser => {
	const jsonFile = JSON.parse(
		fs.readFileSync('./AllUsers.json', 'utf8'),
	) as TMemberResponse;
	const users = jsonFile.members.reduce((obj, user): TUser => {
		const name = user.profile.display_name || user.profile.real_name;

		obj[`@${name}`] = user.id;

		return obj;
	}, {} as TUser);

	return users;
};

const readOldDonutListIntoMemory = (): TDonutUser[] => {
	const { data } = Papa.parse(fs.readFileSync('./OldDonutList.csv', 'utf8'), {
		header: true,
		skipEmptyLines: true,
	});

	return data
		.map(
			(oldUser): TDonutUser => {
				const DisplayName = oldUser.User;
				const DateAdded = new Date(oldUser.Added);
				const DateRepaid = oldUser.Repaid ? new Date(oldUser.Repaid) : null;

				return {
					DateAdded,
					DateRepaid,
					DisplayName,
				};
			},
		)
		.sort(
			(user1, user2): number =>
				user1.DateAdded.getTime() - user2.DateAdded.getTime(),
		);
};

const readDonutListIntoMemory = (): TFixedDonutUser[] => {
	const { data } = Papa.parse(fs.readFileSync('./DonutList.csv', 'utf8'), {
		header: true,
		skipEmptyLines: true,
	});

	return data as TFixedDonutUser[];
};

const readOldPointsListIntoMemory = (): TPointUser[] => {
	const { data } = Papa.parse(
		fs.readFileSync('./OldPointHistory.csv', 'utf8'),
		{
			header: true,
			skipEmptyLines: true,
		},
	);

	return data.map(
		(oldUser): TPointUser => {
			const DisplayName = oldUser.User;
			const Points = oldUser.Points;

			return {
				DisplayName,
				Points,
			};
		},
	);
};

const readPointsListIntoMemory = (): TFixedPointUser[] => {
	const { data } = Papa.parse(fs.readFileSync('./PointHistory.csv', 'utf8'), {
		header: true,
		skipEmptyLines: true,
	});

	return data as TFixedPointUser[];
};

const saveCSVToFile = (
	content: TFixedDonutUser[] | TFixedPointUser[],
	fileName: string,
): void => {
	const csvString = Papa.unparse(content);

	fs.writeFileSync(fileName, csvString);
};

const uploadDonutUserToDynamoDB = async ({
	DateAdded,
	DateRepaid,
	UserID,
}: TFixedDonutUser): Promise<void> => {
	const addParams: AWS.DynamoDB.PutItemInput = {
		Item: {
			[DONUT_COLS.DateOfInfraction]: { S: DateAdded },
			[DONUT_COLS.DateRepaid]: { S: DateRepaid },
			[DONUT_COLS.ID]: { S: uuidv4() },
			[DONUT_COLS.UserID]: { S: UserID },
		},
		TableName: DONUT_TABLE,
	};

	await dynamoDB.putItem(addParams).promise();
};

const uploadPointUserToDynamoDB = async ({
	Points,
	UserID,
}: TFixedPointUser): Promise<void> => {
	const getParams: AWS.DynamoDB.GetItemInput = {
		Key: {
			[POINT_COLS.UserID]: { S: UserID },
		},
		TableName: POINT_TABLE,
	};
	const { Item: user } = await dynamoDB.getItem(getParams).promise();

	if (user) {
		const params: AWS.DynamoDB.UpdateItemInput = {
			ExpressionAttributeValues: {
				':pts': { N: `${Points}` },
			},
			Key: {
				[POINT_COLS.UserID]: { S: UserID },
			},
			ReturnValues: 'UPDATED_NEW',
			TableName: POINT_TABLE,
			UpdateExpression: `set ${POINT_COLS.Points} = :pts`,
		};

		await dynamoDB.updateItem(params).promise();
	} else {
		const addParams: AWS.DynamoDB.PutItemInput = {
			Item: {
				[POINT_COLS.UserID]: { S: UserID },
				[POINT_COLS.Points]: { N: `${Points}` },
			},
			TableName: POINT_TABLE,
		};

		await dynamoDB.putItem(addParams).promise();
	}
};

export const fixDonutHistory = (): void => {
	const users = readUsersIntoMemory();
	const donutList = readOldDonutListIntoMemory();
	const newDonutList = donutList.reduce(
		(list, donutUser): TFixedDonutUser[] => {
			const UserID = users[donutUser.DisplayName];
			const DateAdded = donutUser.DateAdded.toISOString();
			const DateRepaid = donutUser.DateRepaid?.toISOString() || '';

			if (!UserID) console.log({ donutUser, UserID });

			return [
				...list,
				{
					DateAdded,
					DateRepaid,
					UserID,
				},
			];
		},
		[] as TFixedDonutUser[],
	);

	saveCSVToFile(newDonutList, './DonutList.csv');
};

export const fixPointHistory = (): void => {
	const users = readUsersIntoMemory();
	const pointList = readOldPointsListIntoMemory();
	const newPointsList = pointList.reduce(
		(list, pointUser): TFixedPointUser[] => {
			const UserID = users[pointUser.DisplayName];
			const Points = pointUser.Points;

			if (!UserID) console.log({ pointUser, UserID });

			return [
				...list,
				{
					Points,
					UserID,
				},
			];
		},
		[] as TFixedPointUser[],
	);

	saveCSVToFile(newPointsList, './PointHistory.csv');
};

const uploadHistoryToDynamoDB = async (): Promise<void> => {
	console.log('Starting upload...');

	const donutList = readDonutListIntoMemory();

	for (const user of donutList) {
		await uploadDonutUserToDynamoDB(user);
	}

	const pointList = readPointsListIntoMemory();

	for (const user of pointList) {
		await uploadPointUserToDynamoDB(user);
	}

	console.log('Done!');
};

(async (): Promise<void> => {
	await uploadHistoryToDynamoDB();
})();
