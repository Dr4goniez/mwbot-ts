import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import { AxiosError } from 'axios';

import { Logger } from '../../dist/build/Logger.js';
import { MwbotError } from '../../dist/index.js';

describe('Logger', () => {
	/** @type {sinon.SinonStub} */
	let logStub;
	/** @type {sinon.SinonStub} */
	let warnStub;
	/** @type {sinon.SinonStub} */
	let errorStub;

	beforeEach(() => {
		logStub = sinon.stub(console, 'log');
		warnStub = sinon.stub(console, 'warn');
		errorStub = sinon.stub(console, 'error');
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('info()', () => {
		it('outputs an info message', () => {
			const logger = new Logger();

			logger.info('hello');

			assert.isTrue(logStub.calledOnce);
			assert.match(logStub.firstCall.args[0], /\[info\]/);
		});

		it('does nothing when suppressed', () => {
			const logger = new Logger({ suppressInfo: true });

			logger.info('hello');

			assert.isFalse(logStub.called);
		});

		it('ignores empty messages', () => {
			const logger = new Logger();

			logger.info('');

			assert.isFalse(logStub.called);
		});
	});

	describe('warn()', () => {
		it('outputs a warning', () => {
			const logger = new Logger();

			logger.warn('warning');

			assert.isTrue(warnStub.calledOnce);
		});

		it('does nothing when suppressed', () => {
			const logger = new Logger({ suppressWarnings: true });

			logger.warn('warning');

			assert.isFalse(warnStub.called);
		});
	});

	describe('error()', () => {
		it('does nothing when outputErrors is false', () => {
			const logger = new Logger();
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' }
			);

			logger.error(err);

			assert.isFalse(errorStub.called);
		});

		it('outputs the original error when no axios data exists', () => {
			const logger = new Logger({ outputErrors: true });
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' }
			);

			logger.error(err);

			assert.isTrue(errorStub.calledOnce);
			assert.strictEqual(errorStub.firstCall.args[2], err);
		});

		it('outputs the original error when unredactErrors is true', () => {
			const logger = new Logger({
				outputErrors: true,
				unredactErrors: true,
			});
			const axiosError = new AxiosError('boom');
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' },
				{ axios: axiosError }
			);

			logger.error(err);

			assert.strictEqual(errorStub.firstCall.args[2], err);
		});

		it('redacts AxiosError', () => {
			const logger = new Logger({
				outputErrors: true,
			});
			const axiosError = new AxiosError('boom');
			axiosError.config = {
				headers: {
					Authorization: 'secret',
				},
			};
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' },
				{ axios: axiosError }
			);

			logger.error(err);

			const logged = errorStub.firstCall.args[2];

			assert.instanceOf(logged, MwbotError);
			assert.notStrictEqual(logged, err);
			assert.strictEqual(logged.data.axios.message, 'boom');
			assert.notProperty(logged.data.axios, 'config');
			assert.notProperty(logged.data.axios, 'request');

			const desc = Object.getOwnPropertyDescriptor(logged.data.axios, 'stack');

			assert.exists(desc);
			assert.isOk(desc.get ?? desc.value);
		});

		it('redacts AxiosResponse', () => {
			const logger = new Logger({
				outputErrors: true,
			});
			const response = {
				status: 200,
				statusText: 'OK',
				data: { ok: true },
				headers: {
					'set-cookie': 'secret',
				},
				config: {},
			};
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' },
				{ axios: response }
			);

			logger.error(err);

			const logged = errorStub.firstCall.args[2];

			assert.instanceOf(logged, MwbotError);
			assert.deepEqual(logged.data.axios, {
				status: 200,
				statusText: 'OK',
				data: { ok: true },
			});
		});

		it('redacts AxiosError.response', () => {
			const logger = new Logger({
				outputErrors: true,
			});
			const axiosError = new AxiosError('boom');
			axiosError.response = {
				status: 404,
				statusText: 'Not Found',
				data: { error: true },
				headers: {
					authorization: 'secret',
				},
				config: {},
			};
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' },
				{ axios: axiosError }
			);

			logger.error(err);

			const logged = errorStub.firstCall.args[2];

			assert.deepEqual(logged.data.axios.response, {
				status: 404,
				statusText: 'Not Found',
				data: { error: true },
			});
			assert.notProperty(logged.data.axios.response, 'headers');
			assert.notProperty(logged.data.axios.response, 'config');
		});

		it('does not mutate the original AxiosError', () => {
			const logger = new Logger({
				outputErrors: true,
			});
			const axiosError = new AxiosError('boom');
			axiosError.config = {
				headers: {
					Authorization: 'secret',
				},
			};
			const err = new MwbotError(
				'api_mwbot',
				{ code: 'foo', info: 'bar' },
				{ axios: axiosError }
			);

			logger.error(err);

			assert.property(err.data.axios, 'config');
			assert.property(err.data.axios.config, 'headers');
			assert.strictEqual(
				err.data.axios.config.headers.Authorization,
				'secret'
			);
		});
	});
});