"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParamBase = void 0;
const Util_1 = require("./Util");
/**
 * A base class for another class that should have a `params` property that is a string array.
 */
class ParamBase {
    /**
     * Creates a new instance.
     *
     * @param params Parameters of the instance.
     */
    constructor(params = []) {
        this.params = params.slice();
    }
    /**
     * Adds a parameter (to the end of the {@link params} array).
     *
     * @param param The new parameter.
     * @returns
     */
    addParam(param) {
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
    setParam(param, index, options = {}) {
        const { overwrite = true, ifexist = false } = options;
        if (typeof this.params[index] !== 'string' && !ifexist ||
            typeof this.params[index] === 'string' && !overwrite) {
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
    getParam(index) {
        return this.params[index] === 'string' ? this.params[index] : null;
    }
    hasParam(indexOrPred, value) {
        if (typeof indexOrPred !== 'number' && typeof indexOrPred !== 'function') {
            return false;
        }
        if (typeof indexOrPred === 'function') {
            return this.params.some((val, i) => indexOrPred(i, val));
        }
        if (typeof this.params[indexOrPred] !== 'string') {
            return false;
        }
        else if (value === undefined) {
            return true;
        }
        value = value instanceof RegExp ? value : new RegExp(`^${(0, Util_1.escapeRegExp)(value)}$`);
        return value.test(this.params[indexOrPred]);
    }
    /**
     * Deletes a parameter.
     *
     * @param index The parameter index to delete.
     * @param leftShift Whether to shift the remaining parameters to the left after deletion. (Default: `true`)
     * @returns `true` if the parameter was deleted, otherwise `false`.
     */
    deleteParam(index, leftShift = true) {
        const param = this.params[index];
        if (typeof param !== 'string') {
            return false;
        }
        if (leftShift) {
            this.params.splice(index, 1);
        }
        else {
            delete this.params[index];
        }
        return true;
    }
}
exports.ParamBase = ParamBase;
