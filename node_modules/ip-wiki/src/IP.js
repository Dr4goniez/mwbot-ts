/**
 * ip-wiki — IP Address Utility Library
 * @version 1.1.2
 * @see https://dr4goniez.github.io/ip-wiki/index.html API documentation
 */
//<nowiki>
/**
 * Abstract class with protected methods for IP handling.
 * @abstract
 */
class IPBase {

	/**
	 * Constructor for abstract class.
	 * Throws an error if called directly.
	 *
	 * @param {boolean} override Must be `true` to instantiate.
	 * @throws {Error} If `override` is not `true`.
	 * @hidden
	 */
	constructor(override) {
		if (override !== true) {
			throw new Error('It is not allowed to create an instance of the abstract class.');
		}
	}

	/**
	 * Returns a trimmed string with all Unicode bidirectional characters removed.
	 *
	 * Unicode bidirectional characters are special invisible characters that can slip into
	 * cut-and-pasted strings, which are shown as red dots in WikiEditor. They can cause issues
	 * when parsing IP addresses.
	 *
	 * @see MediaWikiTitleCodec::splitTitleString in MediaWiki core
	 *
	 * @param {string} str
	 * @returns {string}
	 */
	static clean(str) {
		return str.replace(/[\u200E\u200F\u202A-\u202E]+/g, '').trim();
	}

	/**
	 * Parses a string potentially representing an IP or CIDR address.
	 *
	 * @param {string} ipStr The string to parse.
	 * @param {number} [bitLen] Optional bit length for CIDR parsing.
	 * @returns {Parsed?} A parsed object, or `null` if:
	 * * `ipStr` is not a string.
	 * * It does not represent a valid IP address.
	 * * It contains an invalid CIDR bit length.
	 * @protected
	 */
	static parse(ipStr, bitLen) {

		if (typeof ipStr !== 'string') {
			return null;
		}
		ipStr = this.clean(ipStr);
		if (typeof bitLen === 'number') {
			ipStr = ipStr.replace(/\/\d+$/, '');
			ipStr += '/' + bitLen;
		}

		let m;
		if ((m = ipStr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\/(\d+))?$/))) {
			// Potential IPv4
			/** @type {Parsed} */
			const ret = {
				parts: [],
				bitLen: typeof m[5] === 'string' ? parseInt(m[5]) : null
			};
			if (ret.bitLen !== null && !(0 <= ret.bitLen && ret.bitLen <= 32)) {
				return null;
			}
			for (let i = 1; i <= 4; i++) {
				const num = parseInt(m[i]);
				if (m[i].length <= 3 && 0 <= num && num <= 255) {
					ret.parts.push(num);
				} else {
					return null;
				}
			}
			return ret;
		} else if ((m = ipStr.match(/^([\p{Hex_Digit}:]+)(?:\/(\d+))?$/u)) && !/:::/.test(ipStr) && (ipStr.match(/::/g) || []).length < 2) {
			// Potential IPv6
			/** @type {Parsed} */
			const ret = {
				parts: [],
				bitLen: typeof m[2] === 'string' ? parseInt(m[2]) : null
			};
			if (ret.bitLen !== null && !(0 <= ret.bitLen && ret.bitLen <= 128)) {
				return null;
			}
			ipStr = m[1];
			let parts = ipStr.split(':');
			if (parts.length < 7) {
				ipStr = ipStr.replace('::', ':'.repeat(10 - parts.length));
				parts = ipStr.split(':');
			}
			if (parts.length !== 8) {
				return null;
			}
			for (const el of parts) {
				const num = el === '' ? 0 : parseInt(el, 16);
				if (el.length <= 4 && 0 <= num && num <= 0xffff) {
					ret.parts.push(num);
				} else {
					return null;
				}
			}
			return ret;
		}

		return null;

	}

	/**
	 * Returns the first and last IPs in the given range.
	 *
	 * @param {number[]} parts Decimal parts of the IP address.
	 * @param {number?} bitLen Optional CIDR bit length.
	 * @returns {RangeObject}
	 * @protected
	 */
	static parseRange(parts, bitLen) {

		if (parts.length !== 4 && parts.length !== 8) {
			throw new Error(`Unexpected error: The IP has ${parts.length} parts.`);
		}
		if (typeof bitLen !== 'number') {
			return {
				first: parts,
				last: parts,
				bitLen: parts.length === 4 ? 32 : 128,
				isCidr: false
			};
		}

		// Get the netmask
		const netMaskParts =
			(
				// Convert the bit length to a 32- or 128-bit binary-representing string.
				// e.g. if the input is IPv4 and bitLen is 24, this will be `11111111 11111111 11111111 00000000`.
				// The max bit length is the square of the number of IP parts multiplied by 2:
				// 4^2*2=32 or 8^2*2=128 (where "^" here is an exponent operator, not the JS bitwise XOR)
				// If JS allowed 52-bit+ numbers, we would be able to use something like `~(1 << bitLen) >>> 0`
				// instead, but the result will cause an overflow in the case of IPv6.
				('1'.repeat(bitLen) + '0'.repeat(Math.pow(parts.length, 2) * 2 - bitLen))
				// Split the string to an array of 8- or 16-bit binary-representing strings
				.match(new RegExp(`.{${parts.length * 2}}`, 'g')) || []
			)
			// Map the binary-representing strings to decimals, e.g. [255, 255, 255, 0]
			.map(/** @param {string} bin */ (bin) => parseInt(bin, 2));

		// Get the first address
		const first = parts.map((el, i) => {
			// The first address of the netmask calculated above is the bitwise AND of the IP parts and the netmask parts
			// e.g. if the input IP string is `192.168.0.1`:
			// 192 & 255 = 192, 168 & 255 = 168, 0 & 255 = 0, 1 & 0 = 0
			return el & netMaskParts[i];
		});

		// Get the last address
		const high = parts.length === 4 ? 255 : 0xffff;
		const invNetMaskParts = netMaskParts.map((el) => el ^ high); // Inverted netmask, e.g. [0, 0, 0, 255]
		// The last address of the netmask calculated above is the bitwise OR of the first IP's parts and the inverted netmask parts
		// 192 | 0 = 192, 168 | 0 = 168, 0 | 0 = 0, 1 | 255 = 255
		const last = first.map((el, i) => el | invNetMaskParts[i]);

		// Return the result as an object of arrays of decimals
		// CAUTION: The IP parts are in decimals (must be converted to hex for IPv6)
		return {
			first,
			last,
			bitLen,
			isCidr: true
		};

	}

	/**
	 * Converts an array of decimal IP parts into a string.
	 *
	 * @param {number[]} decimals Array of decimal parts.
	 * @param {string} suffix Suffix to append (e.g., `/24`).
	 * @param {StringifyOptions} [options]
	 * @returns {string}
	 * @protected
	 */
	static stringify(decimals, suffix, options = {}) {
		/** @type {(number | string)[]} */
		let parts = decimals;
		const version = parts.length === 4 ? 4 : 6;
		const delimiter = version === 4 ? '.' : ':';
		const {mode, capitalize} = options;
		if (version === 6) {
			// IPv6's parts need to be converted from decimal to hex
			parts = parts.map(el => el.toString(16));
		}
		if (mode === 'short' && version === 6) {

			// Step 1: Find the longest run of consecutive "0" elements
			let maxStart = -1, maxLen = 0;
			for (let i = 0; i < parts.length; ) {
				if (parts[i] !== '0') {
					i++;
					continue;
				}
				const start = i;
				while (parts[i] === '0') i++;
				const len = i - start;
				if (len > maxLen) {
					maxStart = start;
					maxLen = len;
				}
			}

			// Step 2: If found a run of at least two zeros, replace with empty string and insert "::"
			if (maxLen >= 2) {
				const compressed = [
					...parts.slice(0, maxStart),
					'',
					...parts.slice(maxStart + maxLen),
				];
				// If compression was at the start or end, ensure correct leading/trailing ':'
				let ret = compressed.join(':');
				if (ret.startsWith(':')) ret = ':' + ret;
				if (ret.endsWith(':')) ret += ':';
				ret = ret.replace(/:{2,}/, '::');
				ret += suffix;
				return capitalize ? ret.toUpperCase() : ret;
			}

			// No compression possible
			const ret = parts.join(':') + suffix;
			return capitalize ? ret.toUpperCase() : ret;

		} else if (mode === 'long') {
			parts = parts.map((el) => {
				const str = el.toString();
				return '0'.repeat((version === 4 ? 3 : 4) - str.length) + str;
			});
		}
		const ret = parts.join(delimiter) + suffix;
		return capitalize ? ret.toUpperCase() : ret;
	}

	/**
	 * Parses and stringifies an IP string with optional filtering.
	 *
	 * @param {string} ipStr IP or CIDR string to parse.
	 * @param {StringifyOptions} options Options for formatting.
	 * @param {ConditionPredicate} [conditionPredicate]
	 * A predicate to filter addresses by version and CIDR.
	 * @returns {string?} `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 * @protected
	 */
	static parseAndStringify(ipStr, options, conditionPredicate) {
		let {parts, bitLen} = this.parse(ipStr) || {parts: null, bitLen: null};
		if (
			parts === null ||
			conditionPredicate && !conditionPredicate(parts.length === 4 ? 4 : 6, bitLen !== null)
		) {
			return null;
		}
		// If CIDR, correct any inaccurate ones
		parts = this.parseRange(parts, bitLen).first;
		const suffix = bitLen !== null ? '/' + bitLen : '';
		return this.stringify(parts, suffix, options);
	}

	/**
	 * Compares two IP address ranges to check for inclusion.
	 *
	 * @param {RangeObject} ip1 Range object of the first IP.
	 * @param {string | IP} ip2 IP string or IP instance to compare against.
	 * @param {"<" | ">"} comparator Use `<` if `ip2` should contain `ip1`, or `>` if `ip1` should contain `ip2`.
	 * @returns {boolean?} `null` if `ip2` is not a valid IP address.
	 * @protected
	 */
	static compareRanges(ip1, ip2, comparator) {
		const range1 = ip1;
		const range2 = this.getRangeObject(ip2);
		if (range2 === null) {
			return null;
		}
		const len = range1.first.length;
		if (![range1.last, range2.first, range2.last].every(({length}) => length === len)) {
			return false;
		}
		let broader, narrower;
		if (comparator === '<') {
			broader = range2;
			narrower = range1;
		} else if (comparator === '>') {
			broader = range1;
			narrower = range2;
		} else {
			throw new Error('Invalid comparator has been provided.');
		}
		for (let i = 0; i < len; i++) {
			if (!(broader.first[i] <= narrower.first[i] && narrower.last[i] <= broader.last[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Parses an IP string or instance into a range object.
	 *
	 * @param {string | IP} ip An IP/CIDR string or IP instance.
	 * @returns {RangeObject?} Range object, or `null` if the input is not a valid IP.
	 * @protected
	 */
	static getRangeObject(ip) {
		if (ip instanceof IP) {
			return ip.getProperties();
		} else {
			const {parts, bitLen} = this.parse(ip) || {parts: null, bitLen: null};
			if (!parts) {
				return null;
			}
			return this.parseRange(parts, bitLen);
		}
	}

	/**
	 * Checks if two IP addresses are equal.
	 *
	 * @param {RangeObject} ipObj Range object of the first IP.
	 * @param {string | IP} ipStr IP or CIDR string, or IP instance.
	 * @returns {boolean?} `null` if the second input is invalid.
	 * @protected
	 */
	static checkEquality(ipObj, ipStr) {
		const ip1 = ipObj;
		const ip2 = this.getRangeObject(ipStr);
		if (!ip2) {
			return null;
		}
		if (ip1.first.length !== ip2.first.length || ip1.bitLen !== ip2.bitLen) {
			return false;
		} else {
			return ip1.first.every((part, i) => part === ip2.first[i]);
		}
	}

}
/**
 * A utility class that provides static methods for validating and formatting IP and CIDR strings.
 * Unlike the {@link IP} class, these methods are stateless and ideal for one-off checks or
 * transformations on varying inputs.
 */
class IPUtil extends IPBase {

	/**
	 * @throws {Error} Always throws. This class cannot be instantiated.
	 * @hidden
	 */
	constructor() {
		super(true);
		throw new Error('It is not allowed to create an instance of the static class.');
	}

	/**
	 * Returns a sanitized representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.0.1` (IPv4; same as {@link IPUtil.abbreviate})
	 * * `fd12:3456:789a:1:0:0:0:0`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1::1/64`
	 * * Output: `fd12:3456:789a:1:0:0:0:0/64`
	 *
	 * @param {string} ipStr IP or CIDR string to sanitize.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate]
	 * Optional condition for filtering valid IPs.
	 * @returns {string?} Sanitized string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static sanitize(ipStr, capitalize, conditionPredicate) {
		return this.parseAndStringify(ipStr, {capitalize: !!capitalize}, conditionPredicate);
	}

	/**
	 * Returns an abbreviated representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.0.1` (IPv4; same as {@link IPUtil.sanitize})
	 * * `fd12:3456:789a:1::`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1:0:0:0:1/64`
	 * * Output: `fd12:3456:789a:1::/64`
	 *
	 * @param {string} ipStr IP or CIDR string to abbreviate.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate] Optional condition for filtering valid IPs.
	 * @returns {string?} Abbreviated string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static abbreviate(ipStr, capitalize, conditionPredicate) {
		return this.parseAndStringify(ipStr, {mode: 'short', capitalize: !!capitalize}, conditionPredicate);
	}

	/**
	 * Returns a fully expanded (lengthened) representation of an IP string.
	 *
	 * Examples:
	 * * `192.168.000.001`
	 * * `fd12:3456:789a:0001:0000:0000:0000:0000`
	 *
	 * Inaccurate CIDRs are corrected automatically:
	 * * Input: `fd12:3456:789a:1:0:0:0:1/64`
	 * * Output: `fd12:3456:789a:0001:0000:0000:0000:0000/64`
	 *
	 * @param {string} ipStr IP or CIDR string to expand.
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @param {ConditionPredicate} [conditionPredicate] Optional condition for filtering valid IPs.
	 * @returns {string?} Expanded string, or `null` if:
	 * * The input string does not represent an IP address.
	 * * The parsed IP address does not meet the conditions specified by `conditionPredicate`
	 */
	static lengthen(ipStr, capitalize, conditionPredicate) {
		return this.parseAndStringify(ipStr, {mode: 'long', capitalize: !!capitalize}, conditionPredicate);
	}

	/**
	 * Validates whether a string is a valid IP or CIDR address.
	 *
	 * - If `allowCidr` is `true`, CIDR suffixes are allowed.
	 * - If `allowCidr` is `'strict'`, the method returns a normalized CIDR string if the input is valid
	 * but not in canonical form.
	 * - If `allowCidr` is `false`, CIDR suffixes are disallowed.
	 *
	 * ### Return values:
	 * * `true`: The input is valid.
	 * * `false`: The input is invalid.
	 * * `string`: A corrected CIDR string (only if `allowCidr === 'strict'` and normalization is needed).
	 *
	 * @param {string} ipStr The IP or CIDR string to validate.
	 * @param {boolean | StrictCIDR} allowCidr Whether to allow CIDRs, or require strict CIDR format.
	 * @param {ConditionPredicate} [conditionPredicate] Optional function to apply additional validation.
	 * @param {StringifyOptions} [options] Output formatting options (used only if returning a string).
	 * @returns {boolean | string} See above.
	 * @protected
	 */
	static validate(ipStr, allowCidr, conditionPredicate, options) {
		const {parts, bitLen} = this.parse(ipStr) || {parts: null, bitLen: null};
		const isCidr = bitLen !== null;
		if (
			// Not a valid IP, or
			!parts ||
			// Disallowed to be CIDR but is CIDR, or
			!allowCidr && isCidr ||
			// Doesn't meet the conditions of the predicate
			conditionPredicate && !conditionPredicate(parts.length === 4 ? 4 : 6, isCidr)
		) {
			return false;
		}
		if (allowCidr === 'strict' && isCidr) {
			// On strict CIDR validation mode, return a corrected CIDR if the prefix is inaccurate
			const {first} = this.parseRange(parts, bitLen);
			if (!first.every((num, i) => num === parts[i])) {
				return this.stringify(first, '/' + bitLen, options);
			}
		}
		return true;
	}

	/**
	 * Checks whether the input is a valid IP or CIDR address.
	 *
	 * @param {string} ipStr The IP or CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIP(ipStr, allowCidr = false, options = {}) {
		return this.validate(ipStr, allowCidr, void 0, options);
	}

	/**
	 * Checks whether the input is a valid IPv4 address or IPv4 CIDR.
	 *
	 * @param {string} ipStr The IPv4 or IPv4 CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv4(ipStr, allowCidr = false, options = {}) {
		return this.validate(ipStr, allowCidr, (v) => v === 4, options);
	}

	/**
	 * Checks whether the input is a valid IPv6 address or IPv6 CIDR.
	 *
	 * @param {string} ipStr The IPv6 or IPv6 CIDR string to check.
	 * @param {boolean | StrictCIDR} [allowCidr=false] Whether to allow CIDRs, or require strict CIDR format.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv6(ipStr, allowCidr = false, options = {}) {
		return this.validate(ipStr, allowCidr, (v) => v === 6, options);
	}

	/**
	 * Checks whether the input is a valid CIDR (either IPv4 or IPv6).
	 *
	 * @param {string} ipStr The CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isCIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this.validate(ipStr, allowCidr, (_, isCidr) => isCidr, options);
	}

	/**
	 * Checks whether the input is a valid IPv4 CIDR.
	 *
	 * @param {string} ipStr The IPv4 CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv4CIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this.validate(ipStr, allowCidr, (v, isCidr) => v === 4 && isCidr, options);
	}

	/**
	 * Checks whether the input is a valid IPv6 CIDR.
	 *
	 * @param {string} ipStr The IPv6 CIDR string to check.
	 * @param {StrictCIDR} [mode] Require strict CIDR formatting if `'strict'` is passed.
	 * @param {StringifyOptions} [options] Formatting options for corrected CIDRs.
	 * @returns {boolean | string} Returns `true` if valid, `false` if invalid, or a normalized CIDR string.
	 */
	static isIPv6CIDR(ipStr, mode, options) {
		const allowCidr = mode === 'strict' ? mode : true;
		return this.validate(ipStr, allowCidr, (v, isCidr) => v === 6 && isCidr, options);
	}

	/**
	 * Checks whether a given IP address is within the CIDR range of another.
	 *
	 * @param {string | IP} ipStr The target IP address to evaluate.
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the range.
	 * @returns {boolean?} `true` if `ipStr` is within the range of `cidrStr`, `false` if not, or `null`
	 * if either input is invalid.
	 */
	static isInRange(ipStr, cidrStr) {
		const ip = this.getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return this.compareRanges(ip, cidrStr, '<');
	}

	/**
	 * Checks whether a given IP address is within any of the CIDR ranges in the array.
	 *
	 * @param {string | IP} ipStr The IP address to evaluate.
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {number?} The index of the first matching CIDR in the array, `-1` if none match, or `null`
	 * if `ipStr` is invalid.
	 */
	static isInAnyRange(ipStr, cidrArr) {
		const ip = this.getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return cidrArr.findIndex((cidr) => !!this.compareRanges(ip, cidr, '<'));
	}

	/**
	 * Checks whether a given IP address is within all CIDR ranges in the array.
	 *
	 * @param {string | IP} ipStr The IP address to evaluate.
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {boolean?} `true` if the IP is within all CIDRs, `false` if not, or `null` if `ipStr` is invalid
	 * or `cidrArr` is not an array or an empty array.
	 */
	static isInAllRanges(ipStr, cidrArr) {
		if (!Array.isArray(cidrArr) || !cidrArr.length) {
			return null;
		}
		const ip = this.getRangeObject(ipStr);
		if (ip === null) {
			return null;
		}
		return cidrArr.every((cidr) => !!this.compareRanges(ip, cidr, '<'));
	}

	/**
	 * Checks whether a CIDR range contains the specified IP address.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {string | IP} ipStr The target IP address to check.
	 * @returns {boolean?} `true` if `cidrStr` contains `ipStr`, `false` if not, or `null` if either input is invalid.
	 */
	static contains(cidrStr, ipStr) {
		const cidr = this.getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return this.compareRanges(cidr, ipStr, '>');
	}

	/**
	 * Checks whether a CIDR range contains any of the IP addresses in the array.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {number?} The index of the first match in `ipArr`, `-1` if none match, or `null` if `cidrStr` is invalid.
	 */
	static containsAny(cidrStr, ipArr) {
		const cidr = this.getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return ipArr.findIndex((ip) => !!this.compareRanges(cidr, ip, '>'));
	}

	/**
	 * Checks whether a CIDR range contains all of the IP addresses in the array.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the containing range.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {boolean?} `true` if all IPs are contained, `false` if any are not, or `null` if `cidrStr` is invalid or
	 * `ipArr` is not an array or an empty array.
	 */
	static containsAll(cidrStr, ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const cidr = this.getRangeObject(cidrStr);
		if (cidr === null) {
			return null;
		}
		return ipArr.every((ip) => !!this.compareRanges(cidr, ip, '>'));
	}

	/**
	 * Checks whether two IP addresses are equal.
	 *
	 * @param {string | IP} ipStr1 The first IP address to compare.
	 * @param {string | IP} ipStr2 The second IP address to compare.
	 * @returns {boolean?} `true` if the IPs are equal, `false` if not, or `null` if either input is invalid.
	 */
	static equals(ipStr1, ipStr2) {
		const ip1 = this.getRangeObject(ipStr1);
		if (ip1 === null) {
			return null;
		}
		return this.checkEquality(ip1, ipStr2);
	}

	/**
	 * Checks whether an IP address is equal to any address in a given array.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to check against.
	 * @returns {number?} The index of the first match in `ipArr`, `-1` if none match, or `null` if `ipStr` is invalid.
	 */
	static equalsAny(ipStr, ipArr) {
		const ip1 = this.getRangeObject(ipStr);
		if (ip1 === null) {
			return null;
		}
		return ipArr.findIndex((ip2) => !!this.checkEquality(ip1, ip2));
	}

	/**
	 * Checks whether an IP address is equal to all addresses in a given array.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to compare against.
	 * @returns {boolean?} `true` if all addresses are equal to `ipStr`, `false` otherwise, or `null` if `ipStr` is invalid
	 * or `ipArr` is not an array or an empty array.
	 */
	static equalsAll(ipStr, ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const ip1 = this.getRangeObject(ipStr);
		if (ip1 === null) {
			return null;
		}
		return ipArr.every((ip2) => !!this.checkEquality(ip1, ip2));
	}

}
/**
 * The IP class. Unlike the static {@link IPUtil} class, this class provides several instance methods
 * that can be used to perform validations on the same IP or CIDR address multiple times.
 *
 * To initialize a new instance, use {@link IP.newFromText} or {@link IP.newFromRange}:
 * ```ts
 * const ip = IP.newFromText('fd12:3456:789a:1::1');
 * if (!ip) return;
 * console.log(ip.stringify()); // fd12:3456:789a:1:0:0:0:1
 * ```
 */
class IP extends IPBase {

	/**
	 * Initializes an IP instance from a string.
	 *
	 * @param {string} ipStr An IP- or CIDR-representing string.
	 * @returns {IP?} A new `IP` instance if parsing succeeds, or `null` if the input is invalid.
	 */
	static newFromText(ipStr) {
		const {parts, bitLen} = this.parse(ipStr) || {parts: null, bitLen: null};
		if (!parts) {
			return null;
		}
		return new IP(this.parseRange(parts, bitLen));
	}

	/**
	 * Initializes an IP instance from a string and a range (*aka.* a bit length).
	 *
	 * @param {string} ipStr An IP- or CIDR-representing string. If a CIDR string is passed, the `/XX` part
	 * will be overridden by `range`.
	 * @param {number} range The desired CIDR bit length (0–32 for IPv4, 0–128 for IPv6).
	 * @returns {IP?} A new `IP` instance if parsing succeeds, or `null` if the input or range is invalid.
	 * @throws {TypeError} If `range` is not a number.
	 */
	static newFromRange(ipStr, range) {
		if (typeof range !== 'number') {
			throw new TypeError('The "range" parameter for IP.newFromRange must be a number.');
		}
		const {parts, bitLen} = this.parse(ipStr, range) || {parts: null, bitLen: null};
		if (!parts || bitLen === null) { // bitLen should never be null, though
			return null;
		}
		return new IP(this.parseRange(parts, bitLen));
	}

	/**
	 * Private constructor. Use {@link IP.newFromText} or {@link IP.newFromRange} to create a new instance.
	 *
	 * @param {RangeObject} range An object containing internal CIDR information.
	 * @protected
	 */
	constructor(range) {
		super(true);
		/**
		 * @type {number[]}
		 * @readonly
		 * @protected
		 */
		this.first = range.first;
		/**
		 * @type {number[]}
		 * @readonly
		 * @protected
		 */
		this.last = range.last;
		/**
		 * @type {number}
		 * @readonly
		 * @protected
		 */
		this.bitLen = range.bitLen;
		/**
		 * @type {boolean}
		 * @readonly
		 * @protected
		 */
		this.isCidr = range.isCidr;
	}

	/**
	 * Gets a copy of the internal CIDR-related properties.
	 *
	 * @returns {RangeObject} An object containing `first`, `last`, `bitLen`, and `isCidr`.
	 */
	getProperties() {
		return {
			first: this.first.slice(),
			last: this.last.slice(),
			bitLen: this.bitLen,
			isCidr: this.isCidr
		};
	}

	/**
	 * Returns the IP version as a number.
	 *
	 * @returns {4 | 6} The IP version: `4` for IPv4 or `6` for IPv6.
	 */
	get version() {
		if (this.first.length === 4) {
			return 4;
		} else if (this.first.length === 8) {
			return 6;
		} else {
			throw new Error('The internal array of the IP instance seems to be broken.');
		}
	}

	/**
	 * Gets the IP version as a string in the format `IPv4` or `IPv6`.
	 *
	 * @returns {string} A string representation of the IP version.
	 */
	getVersion() {
		return 'IPv' + this.version;
	}

	/**
	 * Returns the stringified form of this IP or CIDR block.
	 *
	 * @param {StringifyOptions} [options] Optional formatting options.
	 * If omitted, a default "sanitized" format will be used.
	 * @returns {string} A properly formatted string representation of the IP or CIDR.
	 *
	 * Note: If the instance was initialized from an imprecise CIDR string,
	 * the output will reflect the corrected internal format.
	 * ```ts
	 * const ip = IP.newFromText('fd12:3456:789a:1::1/64');
	 * ip.stringify(); // fd12:3456:789a:1:0:0:0:0/64
	 * ```
	 */
	stringify(options = {}) {
		const suffix = this.isCidr ? '/' + this.bitLen : '';
		return IP.stringify(this.first, suffix, options);
	}

	/**
	 * Alias for {@link IP.stringify} with default options.
	 *
	 * @returns {string} A stringified representation of the IP.
	 */
	toString() {
		return this.stringify();
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in an abbreviated format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option set to `'short'`.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	abbreviate(capitalize = false) {
		return this.stringify({capitalize, mode: 'short'});
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in a sanitized format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option unset.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	sanitize(capitalize = false) {
		return this.stringify({capitalize});
	}

	/**
	 * Returns the stringified form of this IP or CIDR block in a lengthened format.
	 *
	 * This is a shorthand method of {@link stringify} with the {@link StringifyOptions.mode | mode}
	 * option set to `'long'`.
	 *
	 * @param {boolean} [capitalize=false] Whether to capitalize the output.
	 * @returns A properly formatted string representation of the IP or CIDR.
	 */
	lengthen(capitalize = false) {
		return this.stringify({capitalize, mode: 'long'});
	}

	/**
	 * Checks whether the current instance represents an IPv4 address.
	 *
	 * @param {boolean} [allowCidr=false] Whether to allow a CIDR address.
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv4 address.
	 */
	isIPv4(allowCidr = false) {
		return this.version === 4 && !(!allowCidr && this.isCidr);
	}

	/**
	 * Checks whether the current instance represents an IPv6 address.
	 *
	 * @param {boolean} [allowCidr=false] Whether to allow a CIDR address.
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv6 address.
	 */
	isIPv6(allowCidr = false) {
		return this.version === 6 && !(!allowCidr && this.isCidr);
	}

	/**
	 * Checks whether the current instance represents a CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents a CIDR address.
	 */
	isCIDR() {
		return this.isCidr;
	}

	/**
	 * Checks whether the current instance represents an IPv4 CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv4 CIDR address.
	 */
	isIPv4CIDR() {
		return this.version === 4 && this.isCidr;
	}

	/**
	 * Checks whether the current instance represents an IPv6 CIDR address.
	 *
	 * @returns {boolean} A boolean indicating whether the current instance represents an IPv6 CIDR address.
	 */
	isIPv6CIDR() {
		return this.version === 6 && this.isCidr;
	}

	/**
	 * Gets the bit length of the current instance.
	 *
	 * This always returns a number between `0-32` for IPv4 and `0-128` for IPv6.
	 * To check whether the current instance represents a CIDR address, use {@link IP.isCIDR}.
	 * @returns {number} The bit length as a number.
	 */
	getBitLength() {
		return this.bitLen;
	}

	/**
	 * Gets range information of the IP instance.
	 *
	 * @overload
	 * @param {false} [getInstance=false] Whether to get the start and end IP addresses as IP instances.
	 * @param {StringifyOptions} [options] Optional formatting options for the `cidr`, `first`,
	 * and `last` properties.
	 * @returns {{bitLen: number; cidr: string; first: string; last: string;}}
	 */
	/**
	 * Gets range information of the IP instance.
	 *
	 * @overload
	 * @param {true} getInstance Whether to get the start and end IP addresses as IP instances.
	 * @param {StringifyOptions} [options] Optional formatting options for the `cidr` property.
	 * @returns {{bitLen: number; cidr: string; first: IP; last: IP;}}
	 */
	/**
	 * @param {boolean} [getInstance]
	 * @param {StringifyOptions} [options]
	 * @returns {{bitLen: number; cidr: string; first: string | IP; last: string | IP;}}
	 */
	getRange(getInstance, options = {}) {
		let {first, last, bitLen, isCidr} = this.getProperties();
		if (!getInstance) {
			const firstStr = IP.stringify(first, '', options);
			return {
				bitLen,
				cidr: firstStr + '/' + bitLen,
				first: firstStr,
				last: IP.stringify(last, '', options)
			};
		} else {
			first = first.slice();
			last = last.slice();
			const bl = first.length === 4 ? 32 : 128;
			isCidr = false;
			return {
				bitLen,
				cidr: IP.stringify(first, '/' + bitLen, options),
				first: new IP({first, last: first, bitLen: bl, isCidr}),
				last: new IP({first: last, last, bitLen: bl, isCidr})
			};
		}
	}

	/**
	 * Checks whether the IP address associated with this instance is within the CIDR range of another.
	 *
	 * @param {string | IP} cidrStr The CIDR string or IP instance representing the range.
	 * @returns {boolean?} A boolean indicating whether the IP address is within the CIDR range, or
	 * `null` if `cidrStr` is invalid.
	 */
	isInRange(cidrStr) {
		return IP.compareRanges(this.getProperties(), cidrStr, '<');
	}

	/**
	 * Checks whether the IP address associated with this instance is within any of the CIDR ranges in the array.
	 *
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {number} The index of the first matching CIDR in the array, or `-1` if none match.
	 */
	isInAnyRange(cidrArr) {
		const props = this.getProperties();
		return cidrArr.findIndex((cidr) => !!IP.compareRanges(props, cidr, '<'));
	}

	/**
	 * Checks whether the IP address associated with this instance is within all CIDR ranges in the array.
	 *
	 * @param {(string | IP)[]} cidrArr An array of CIDR strings or IP instances to check against.
	 * @returns {boolean?} `true` if the IP is within all CIDRs, `false` if not, or `null` if `cidrArr` is
	 * not an array or an empty array.
	 */
	isInAllRanges(cidrArr) {
		if (!Array.isArray(cidrArr) || !cidrArr.length) {
			return null;
		}
		const props = this.getProperties();
		return cidrArr.every((cidr) => !!IP.compareRanges(props, cidr, '<'));
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains the specified IP address.
	 *
	 * @param {string | IP} ipStr The target IP address to check.
	 * @returns {boolean?} `true` if the CIDR range contains `ipStr`, `false` if not, or `null` if `ipStr` is invalid.
	 */
	contains(ipStr) {
		return IP.compareRanges(this.getProperties(), ipStr, '>');
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains any of the IP addresses in the array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {number} The index of the first match in `ipArr`, or `-1` if none match.
	 */
	containsAny(ipArr) {
		const props = this.getProperties();
		return ipArr.findIndex((ip) => !!IP.compareRanges(props, ip, '>'));
	}

	/**
	 * Checks whether the CIDR range associated with this instance contains all of the IP addresses in the array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to test.
	 * @returns {boolean?} `true` if all IPs are contained, `false` if any are not, or `null` if
	 * `ipArr` is not an array or an empty array.
	 */
	containsAll(ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const props = this.getProperties();
		return ipArr.every((ip) => !!IP.compareRanges(props, ip, '>'));
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to a given IP address.
	 *
	 * @param {string | IP} ipStr The IP address to compare.
	 * @returns {boolean?} `true` if the IPs are equal, `false` if not, or `null` if `ipStr` is invalid.
	 */
	equals(ipStr) {
		const props = this.getProperties();
		return IP.checkEquality(props, ipStr);
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to any address in a given array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to check against.
	 * @returns {number} The index of the first match in `ipArr`, or `-1` if none match.
	 */
	equalsAny(ipArr) {
		const props = this.getProperties();
		return ipArr.findIndex((ip) => !!IP.checkEquality(props, ip));
	}

	/**
	 * Checks whether the IP address associated with this intance is equal to all addresses in a given array.
	 *
	 * @param {(string | IP)[]} ipArr An array of IP or CIDR strings or IP instances to compare against.
	 * @returns {boolean?} `true` if all addresses are equal to this IP instance, `false` otherwise, or
	 * `null` if `ipArr` is not an array or an empty array.
	 */
	equalsAll(ipArr) {
		if (!Array.isArray(ipArr) || !ipArr.length) {
			return null;
		}
		const props = this.getProperties();
		return ipArr.every((ip) => !!IP.checkEquality(props, ip));
	}

}
/**
 * @typedef {import('./IP-types.ts').Parsed} Parsed
 * @typedef {import('./IP-types.ts').RangeObject} RangeObject
 * @typedef {import('./IP-types.ts').StringifyOptions} StringifyOptions
 * @typedef {import('./IP-types.ts').StrictCIDR} StrictCIDR
 * @typedef {import('./IP-types.ts').ConditionPredicate} ConditionPredicate
 */
module.exports = {
	IPUtil,
	IP
};
//</nowiki>