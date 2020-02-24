// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

require('dotenv').config({
	path: path.resolve(process.cwd(), 'test.env'),
});
