import { escapeRegExp } from './Util';

/**
 * A base class for another class that should have a `params` property that is a string array.
 * @internal
 */
export abstract class ParamBase {

	/**
	 * Parameters of the instance. These are *not* automatically trimmed of leading and trailing whitespace.
	 */
	params: string[];

	/**
	 * Creates a new instance.
	 *
	 * @param params Parameters of the instance.
	 */
	constructor(params: string[] = []) {
		this.params = params.slice();
	}

	/**
	 * Adds a parameter (to the end of the {@link params} array).
	 *
	 * @param param The new parameter.
	 * @returns
	 */
	addParam(param: string): this {
		this.params.push(param);
		return this;
	}

	/**
	 * Sets a parameter at the given index.
	 *
	 * @param param The new parameter.
	 * @param index The index of the parameter to update.
	 * @param options Options to set the new parameter.
	 * @returns A boolean indicating whether the new parameter has been set.
	 */
	setParam(param: string, index: number, options: {
		/**
		 * Whether to overwrite existing parameters. If `false`, the new parameter is not registered
		 * if there is an existing parameter at the specified index. (Default: `true`)
		 */
		overwrite?: boolean;
		/**
		 * Whether to set the parameter only if a parameter is already set at the specified index.
		 */
		ifexist?: boolean;
	} = {}): boolean {
		const {overwrite = true, ifexist = false} = options;
		if (
			typeof this.params[index] !== 'string' && !ifexist ||
			typeof this.params[index] === 'string' && !overwrite
		) {
			return false;
		}
		this.params[index] = param;
		return true;
	}

	/**
	 * Gets a parameter at the given index.
	 *
	 * @param index The index of the parameter to retrieve.
	 * @returns The parameter value, or `null` if no value is found at the specified index.
	 */
	getParam(index: number): string | null {
		return this.params[index] === 'string' ? this.params[index] : null;
	}

	/**
	 * Checks if a parameter at the specified index exists, optionally matching its value.
	 *
	 * @param index The parameter index to match.
	 * @param value The optional value matcher.
	 * - If a string, checks for an exact value match.
	 * - If a regular expression, tests the parameter value against the pattern.
	 * - If omitted, only the parameter index is checked.
	 * @returns `true` if a matching parameter exists; otherwise, `false`.
	 */
	hasParam(index: number, value?: string | RegExp): boolean;
	/**
	 * Checks if a parameter exists based on a custom predicate function.
	 *
	 * @param predicate A function that tests each parameter.
	 * @returns `true` if a matching parameter exists; otherwise, `false`.
	 */
	hasParam(predicate: (index: number, value: string) => boolean): boolean;
	hasParam(
		indexOrPred: number | ((index: number, value: string) => boolean),
		value?: string | RegExp
	): boolean {
		if (typeof indexOrPred !== 'number' && typeof indexOrPred !== 'function') {
			return false;
		}
		if (typeof indexOrPred === 'function') {
			return this.params.some((val, i) => indexOrPred(i, val));
		}
		if (typeof this.params[indexOrPred] !== 'string') {
			return false;
		} else if (value === undefined) {
			return true;
		}
		value = value instanceof RegExp ? value : new RegExp(`^${escapeRegExp(value)}$`);
		return value.test(this.params[indexOrPred]);
	}

	/**
	 * Deletes a parameter.
	 *
	 * @param index The parameter index to delete.
	 * @param leftShift Whether to shift the remaining parameters to the left after deletion. (Default: `true`)
	 * @returns `true` if the parameter was deleted, otherwise `false`.
	 */
	deleteParam(index: number, leftShift = true): boolean {
		const param = this.params[index];
		if (typeof param !== 'string') {
			return false;
		}
		if (leftShift) {
			this.params.splice(index, 1);
		} else {
			delete this.params[index];
		}
		return true;
	}

}