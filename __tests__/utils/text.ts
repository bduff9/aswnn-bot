import { formatMyScore } from '../../src/utils/text';

describe('text.ts', (): void => {
	it('should return correct message for score', async (): Promise<
		void
	> => {
		const message1 = formatMyScore('USERID', 0);

		expect(message1).toEqual('No point activity yet');

		const message2 = formatMyScore('USERID', 10);

		expect(message2).toEqual('<@USERID> is at 10 points');
	});
});
