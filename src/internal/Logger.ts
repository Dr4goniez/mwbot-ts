import { Chalk } from 'chalk';
import { type AxiosResponse, AxiosError, isAxiosError } from 'axios';
import {
	MwbotError,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	type MwbotErrorData, // Only referenced in comments
} from '../MwbotError.js';

const colorChalk = new Chalk({ level: 3 });
const plainChalk = new Chalk({ level: 0 });

let chalk = colorChalk;

/**
 * @private
 */
export function disableLoggerColors(): void {
	chalk = plainChalk;
}

type SeverityLevel = 'info' | 'warn' | 'error';

/**
 * @private
 */
export class Logger {

	private suppressInfo: boolean;
	private suppressWarnings: boolean;
	private outputErrors: boolean;
	private unredactErrors: boolean;

	constructor(options?: LoggerOptions) {
		this.suppressInfo = options?.suppressInfo ?? false;
		this.suppressWarnings = options?.suppressWarnings ?? false;
		this.outputErrors = options?.outputErrors ?? false;
		this.unredactErrors = options?.unredactErrors  ?? false;
	}

	private getPrefix(
		level: SeverityLevel,
		showLevel = false
	) {
		if (!showLevel) {
			return '';
		}

		let color: 'blue' | 'yellow' | 'red';
		switch (level) {
			case 'info':
				color = 'blue';
				break;
			case 'warn':
				color = 'yellow';
				break;
			case 'error':
				color = 'red';
				break;
			default: {
				const exhaustive: never = level;
				throw new Error(`Invalid logger output level: ${exhaustive}`);
			}
		}

		return chalk[color](`[${level}]`);
	}

	/**
	 * Outputs the given message to the console.
	 *
	 * @param level The severity level of the message.
	 * @param message The message to output.
	 * @param options Additional options that control output behaviour.
	 */
	output(
		level: SeverityLevel,
		message: string,
		options: {
			/**
			 * Whether to prefix the message with `[<level>]`. (default: `false`)
			 */
			showLevel?: boolean;
			/**
			 * Whether to output the message regardless of the logger configuration.
			 * (default: `false`)
			 */
			ignoreConfig?: boolean;
		} = {}
	): void {
		if (!message) {
			return;
		}

		let shouldOutput = options.ignoreConfig ?? false;
		let out: 'log' | 'warn' | 'error';

		switch (level) {
			case 'info':
				shouldOutput ||= !this.suppressInfo;
				out = 'log';
				break;
			case 'warn':
				shouldOutput ||= !this.suppressWarnings;
				out = 'warn';
				break;
			case 'error':
				shouldOutput ||= this.outputErrors;
				out = 'error';
				break;
			default: {
				const exhaustive: never = level;
				throw new Error(`Invalid logger output level: ${exhaustive}`);
			}
		}
		if (!shouldOutput) {
			return;
		}

		const prefix = this.getPrefix(level, options.showLevel);
		console[out](prefix ? `${prefix} ${message}` : message);
	}

	info(message: string): void {
		this.output('info', message, { showLevel: true });
	}

	warn(message: string): void {
		this.output('warn', message, { showLevel: true });
	}

	error(error: string | MwbotError): void {
		if (typeof error === 'string') {
			this.output('error', error, { showLevel: true });
			return;
		}

		if (!this.outputErrors) {
			return;
		}

		const axiosData = error.data?.axios;
		if (this.unredactErrors || !axiosData) {
			console.error('%s %o', this.getPrefix('error', true), error);
			return;
		}

		const clone = error._clone() as RedactedMwbotError;
		if (isAxiosError(axiosData)) {
			clone.data!.axios = redactAxiosError(axiosData);
		} else {
			clone.data!.axios = redactAxiosResponse(axiosData);
		}
		console.error('%s %o', this.getPrefix('error', true), clone);
	}
}

/**
 * Configuration options for {@link Logger}.
 *
 * All options are opt-in and default to `false`.
 */
export interface LoggerOptions {
	/**
	 * Whether to suppress information messages that `mwbot-ts` would otherwise output.
	 */
	suppressInfo?: boolean;
	/**
	 * Whether to suppress warning messages that `mwbot-ts` would otherwise output.
	 */
	suppressWarnings?: boolean;
	/**
	 * Whether to output internal errors, such as intermediate HTTP request failures
	 * before a retry succeeds, which would otherwise be silently ignored.
	 *
	 * When error output is enabled, sensitive information under {@link MwbotErrorData.axios}
	 * is redacted by default. See {@link unredactErrors} to disable this behaviour.
	 */
	outputErrors?: boolean;
	/**
	 * **DO NOT ENABLE THIS IN PUBLIC ENVIRONMENTS.**
	 *
	 * Whether to disable redaction of sensitive data in error output. This includes data such as
	 * HTTP request headers that may contain authentication credentials or cookies.
	 *
	 * Note: This option has no effect unless {@link outputErrors} is enabled.
	 */
	unredactErrors?: boolean;
}

type RedactedAxiosResponse = Pick<AxiosResponse, 'status' | 'statusText' | 'data'>;

function redactAxiosResponse(response: AxiosResponse): RedactedAxiosResponse {
	const { status, statusText, data } = response;
	return { status, statusText, data };
}

type RedactedAxiosError =
	Pick<AxiosError,
		| 'name'
		| 'message'
		| 'stack'
		| 'code'
		| 'status'
		| 'cause'
		| 'isAxiosError'
		| 'toJSON'
	> & {
		response?: RedactedAxiosResponse;
	};

function redactAxiosError(error: AxiosError): RedactedAxiosError {
	const redacted = Object.create(
		Object.getPrototypeOf(error)
	) as RedactedAxiosError;

	Object.assign(redacted, {
		name: error.name,
		message: error.message,
		code: error.code,
		status: error.status,
		cause: error.cause,
		isAxiosError: error.isAxiosError,
		toJSON: error.toJSON,
		response: error.response && redactAxiosResponse(error.response),
	});

	const stackDesc = Object.getOwnPropertyDescriptor(error, 'stack');
	if (stackDesc) {
		Object.defineProperty(redacted, 'stack', stackDesc);
	}

	// Clean up undefined properties
	for (const key of Object.keys(redacted) as (keyof RedactedAxiosError)[]) {
		if (redacted[key] === undefined) {
			delete redacted[key];
		}
	}

	return redacted;
}

type RedactedMwbotError =
	Omit<MwbotError, 'data'> &
	{ data?: Omit<MwbotError['data'], 'axios'> &
	{ axios: RedactedAxiosResponse | RedactedAxiosError } };