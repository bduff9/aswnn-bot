import { createLogger, format, transports } from 'winston';

const { combine, errors, json, timestamp } = format;
const LEVEL = Symbol.for('level');
const MESSAGE = Symbol.for('message');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const printError = (error: any): string =>
	JSON.stringify(error, Object.getOwnPropertyNames(error));

const logger = createLogger({
	level: 'info',
	format: combine(timestamp(), errors({ stack: true }), json()),
	transports: [
		new transports.Console({
			log (info, callback): void {
				setImmediate((): void => this.emit('logged', info));

				if (this.stderrLevels[info[LEVEL]]) {
					console.error(info[MESSAGE]);

					if (callback) callback();

					return;
				}

				console.log(info[MESSAGE]);

				if (callback) callback();
			},
		}),
	],
});

export default logger;
