"use strict";
/**
 * This module defines the {@link MwbotError} class, which is used to standardize
 * error handling. See {@link MwbotError} for details.
 *
 * Note that internal exceptions are caught by the built-in Error class.
 *
 * @module
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MwbotError = void 0;
const Util_1 = require("./Util");
/**
 * Custom error class for {@link Mwbot}, extending the built-in `Error` class.
 * This class is exported for use with the `instanceof` operator.
 *
 * This error class is used throughout {@link Mwbot} to standardize error handling,
 * ensuring that all errors and rejected Promises include a stack trace for easier
 * debugging.
 *
 * For a list of error codes, see {@link MwbotErrorCodes}.
 */
class MwbotError extends Error {
    /**
     * Returns the {@link info} property. This property is only for compatibility
     * with the parent Error class.
     */
    get message() {
        return this.info;
    }
    /**
     * Creates a new instance.
     *
     * @param type The type of the error.
     * @param config The error details object. This object must contain `code` and `info`
     * properties. Other properties are merged into the `data` property of the new instance.
     * @param data Optional object to initialize the `data` property with.
     * @throws {TypeError} If `config` is not a plain object.
     */
    constructor(type, config, data) {
        if (!(0, Util_1.isPlainObject)(config)) {
            throw TypeError('MwbotError.constructor only accepts a plain object.');
        }
        super();
        const { code, info, ...rest } = config;
        this.name = 'MwbotError';
        this.type = type;
        this.code = code;
        this.info = info;
        if (!(0, Util_1.isEmptyObject)(data)) {
            this.data = Object.assign({}, data);
        }
        if (!(0, Util_1.isEmptyObject)(rest)) {
            this.data = Object.assign(this.data || {}, { error: rest });
        }
        // Ensure proper stack trace capture
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, MwbotError);
        }
    }
    /**
     * Creates a new instance from an API error response.
     *
     * @param response An API response with the `error` or `errors` property.
     * @returns A new MwbotError instance.
     */
    static newFromResponse(response) {
        let error;
        if ('errors' in response) {
            const info = response.errors[0]['*'] || // formatversion=1
                response.errors[0].html || // errorformat=html
                response.errors[0].text || // errorformat=wikitext, errorformat=plaintext
                response.errors[0].key || // errorformat=raw
                'Unknown error.';
            const { errors, ...rest } = response;
            error = Object.assign({ info }, errors[0], rest);
        }
        else {
            error = response.error;
        }
        return new MwbotError('api', error);
    }
    /**
     * Updates the error code.
     *
     * @param code The new error code.
     * @returns The current instance for chaining.
     */
    setCode(code) {
        this.code = code;
        return this;
    }
    /**
     * Updates the error information.
     *
     * @param info The new error information.
     * @returns The current instance for chaining.
     */
    setInfo(info) {
        this.info = info;
        return this;
    }
}
exports.MwbotError = MwbotError;
