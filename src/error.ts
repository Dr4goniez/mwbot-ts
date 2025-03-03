/**
 * See {@link MwbotError}.
 *
 * @module
 */

import type { ApiResponse } from './api_types';
import { isPlainObject } from './util';
import type { AxiosResponse } from 'axios';

/**
 * Custom error class for {@link Mwbot}, extending the built-in `Error` class.
 *
 * This error class is used throughout {@link Mwbot} to standardize error handling, ensuring that
 * all errors and rejected Promises include a stack trace for easier debugging. This simplifies
 * troubleshooting, especially when extending the `Mwbot` class.
 *
 * ### Error codes
 * * `mwbot_api_***`: Indicates an issue returned by the MediaWiki API response.
 * * `mwbot_fatal_***`:  Error originating from Mwbot's internal logic, often caused by incorrect
 * usage or unexpected conditions.
 */
export class MwbotError extends Error {

	code: string;
	info: string;
	[key: string]: any; // Allows handling of arbitrary properties from API responses

	/**
	 * Creates a new `MwbotError` instance.
	 *
	 * @param config The error details object. If an API response is passed, it should
	 * contain either an `error` or `errors` property.
	 *
	 * If `code` is not prefixed by `mwbot_`, `mwbot_api_` is prepended.
	 *
	 * @throws {TypeError} If `config` is not a plain object nor an array.
	 * @throws {Error} If `config` does not contain valid error information.
	 */
	constructor(config: ErrorBase) {

		if (!isPlainObject(config)) {
			throw new MwbotError({
				code: 'mwbot_fatal_typemismatch',
				info: 'MwbotError.constructor only accepts a plain object.'
			});
		}

		// Convert ApiReponse to MwbotErrorConfig
		if ('errors' in config && Array.isArray(config.errors)) {
			const info =
				config.errors[0]['*'] || // formatversion=1
				config.errors[0].html || // errorformat=html
				config.errors[0].text || // errorformat=wikitext, errorformat=plaintext
				config.errors[0].key || // errorformat=raw
				'Unknown error';
			const {errors, ...rest} = config;
			config = Object.assign({info: info as string}, errors[0], rest);
		} else if ('error' in config) {
			const {code, info, ...rest} = config.error;
			config = {code, info, ...rest};
		}

		// Set up instance properties
		const {code, info} = config; // Recognized as MwbotErrorConfig
		if (!code || !info) {
			throw new MwbotError({
				code: 'mwbot_fatal_invalidinput',
				info: 'An invalid object has been passed to MwbotError.constructor.'
			});
		}
		super(`${code}: ${info}`);
		this.name = 'MwbotError';
		this.code = (/^mwbot_/.test(code) ? '' : 'mwbot_api_') + code;
		this.info = info;
		Object.assign(this, config);

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, MwbotError);
		}

	}

	/**
	 * Updates the error code.
	 *
	 * @param code New error code. If not prefixed by `mwbot_`, `mwbot_api_` is prepended.
	 * @returns The updated `MwbotError` instance.
	 */
	setCode(code: string): this {
		this.code = (/^mwbot_/.test(code) ? '' : 'mwbot_api_') + code;
		this.message = `${code}: ${this.info}`;
		return this;
	}

	/**
	 * Updates the error information.
	 *
	 * @param info New error information.
	 * @returns The updated `MwbotError` instance.
	 */
	setInfo(info: string): this {
		this.info = info;
		this.message = `${this.code}: ${info}`;
		return this;
	}

}

/**
 * Configuration object for {@link MwbotError.constructor}. See also {@link ErrorBase}.
 */
export interface MwbotErrorConfig {
	code: string;
	info: string;
	response?: AxiosResponse;
	// [key: string]: any; // TODO: This breaks Intellisense for ErrorBase. Fix?
}

/**
 * The valid types for the first argument of {@link MwbotError.constructor}.
 *
 * Acceptable types:
 * - {@link MwbotErrorConfig}: A manually created object.
 * - {@link ApiResponse}: An API response where the `error` or `errors` property is guaranteed to exist.
 */
export type ErrorBase = MwbotErrorConfig | Required<Pick<ApiResponse, 'error' | 'errors'>>;