/**
 * This module provides functions to manipulate strings, accessible via {@link Mwbot.String}.
 *
 * **Example**:
 * ```
 * import { Mwbot } from 'mwbot-ts';
 *
 * console.log(Mwbot.String.ucFirst('mwbot')); // Output: "Mwbot"
 * ```
 *
 * This module is adapted from the `mediawiki.String` module in MediaWiki core (GNU General Public License v2).
 *
 * References:
 * * Original source code: {@link https://gerrit.wikimedia.org/r/plugins/gitiles/mediawiki/core/+/50cdd378682dd1f3963507cddf7f08f1897b7ce5/resources/src/mediawiki.String.js}
 * * MediaWiki core documentation: {@link https://doc.wikimedia.org/mediawiki-core/master/js/module-mediawiki.String.html}
 *
 * @module
 */
/**
 * Calculate the byte length of a string (accounting for UTF-8).
 *
 * @param str
 * @return
 */
export declare function byteLength(str: string): number;
/**
 * Calculate the character length of a string (accounting for UTF-16 surrogates).
 *
 * @param str
 * @return
 */
export declare function codePointLength(str: string): number;
/**
 * Like {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/charAt String.charAt()},
 * but return the pair of UTF-16 surrogates for characters outside of BMP.
 *
 * @param string
 * @param offset Offset to extract the character
 * @param backwards Use backwards direction to detect UTF-16 surrogates,  defaults to false
 * @return
 */
export declare function charAt(string: string, offset: number, backwards?: boolean): string;
/**
 * Lowercase the first character. Support UTF-16 surrogates for characters outside of BMP.
 *
 * @param string
 * @return
 */
export declare function lcFirst(string: string): string;
/**
 * Uppercase the first character. Support UTF-16 surrogates for characters outside of BMP.
 *
 * @param string
 * @return
 */
export declare function ucFirst(string: string): string;
/**
 * The return type of {@link trimByteLength} and {@link trimCodePointLength}.
 */
export interface StringTrimmed {
    /**
     * A trimmed version of the string.
     */
    newVal: string;
    /**
     * Whether the string is different from the original version.
     */
    trimmed: boolean;
}
/**
 * A function used in {@link trimByteLength} and {@link trimCodePointLength} to transform the input
 * string before measuring its length.
 */
export type FilterFunction = (val: string) => string;
/**
 * Utility function to trim down a string, based on byteLimit
 * and given a safe start position. It supports insertion anywhere
 * in the string, so "foo" to "fobaro" if limit is 4 will result in
 * "fobo", not "foba". Basically emulating the native maxlength by
 * reconstructing where the insertion occurred.
 *
 * @param safeVal Known value that was previously returned by this
 * function, if none, pass empty string.
 * @param newVal New value that may have to be trimmed down.
 * @param byteLimit Number of bytes the value may be in size.
 * @param filterFunction Function to call on the string before assessing the length.
 * @return
 */
export declare function trimByteLength(safeVal: string, newVal: string, byteLimit: number, filterFunction?: FilterFunction): StringTrimmed;
/**
 * Utility function to trim down a string, based on codePointLimit
 * and given a safe start position. It supports insertion anywhere
 * in the string, so "foo" to "fobaro" if limit is 4 will result in
 * "fobo", not "foba". Basically emulating the native maxlength by
 * reconstructing where the insertion occurred.
 *
 * @param safeVal Known value that was previously returned by this
 * function, if none, pass empty string.
 * @param newVal New value that may have to be trimmed down.
 * @param codePointLimit Number of characters the value may be in size.
 * @param filterFunction Function to call on the string before assessing the length.
 * @return
 */
export declare function trimCodePointLength(safeVal: string, newVal: string, codePointLimit: number, filterFunction?: FilterFunction): StringTrimmed;
//# sourceMappingURL=String.d.ts.map