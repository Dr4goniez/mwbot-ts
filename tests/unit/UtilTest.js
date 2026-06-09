import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import { Mwbot } from '../../dist/index.js';
const {
	mergeDeep,
	isObject,
	isPlainObject,
	isEmptyObject,
	isClassInstance,
	deepCloneInstance,
	isPrimitive,
	escapeRegExp,
	arraysEqual,
	sleep,
} = Mwbot.Util;

describe('mergeDeep()', function () {

	it('should return an empty object when called with no arguments', function () {
		const result = mergeDeep();

		assert.deepEqual(result, {});
	});

	it('should return an object with a null prototype', function () {
		const result = mergeDeep();

		assert.isNull(Object.getPrototypeOf(result));
	});

	it('should ignore null and undefined inputs', function () {
		const result = mergeDeep(
			// @ts-expect-error Passing a non-object
			null,
			{ a: 1 },
			undefined
		);

		assert.deepEqual(result, { a: 1 });
	});

	it('should recursively merge plain objects', function () {
		const result = mergeDeep(
			{ a: { x: 1 } },
			{ a: { y: 2 } }
		);

		assert.deepEqual(result, {
			a: {
				x: 1,
				y: 2,
			},
		});
	});

	it('should overwrite earlier primitive values', function () {
		const result = mergeDeep(
			{ a: 1 },
			{ a: 2 }
		);

		assert.deepEqual(result, { a: 2 });
	});

	it('should concatenate arrays', function () {
		const result = mergeDeep(
			{ arr: [1, 2] },
			{ arr: [3, 4] }
		);

		assert.deepEqual(result, { arr: [1, 2, 3, 4] });
	});

	it('should deep clone object elements in arrays', function () {
		const obj = { x: 1 };
		const result = mergeDeep({ a: [obj] });

		assert.deepEqual(result.a, [{ x: 1 }]);
		assert.notStrictEqual(result.a[0], obj);
	});

	it('should clone Date instances', function () {
		const date = new Date();
		const result = mergeDeep({ date });

		assert.instanceOf(result.date, Date);
		assert.notStrictEqual(result.date, date);
		assert.strictEqual(result.date.getTime(), date.getTime());
	});

	it('should clone Map instances', function () {
		const value = { x: 1 };
		const map = new Map([
			['a', value],
		]);
		const result = mergeDeep({ map });

		assert.instanceOf(result.map, Map);
		assert.notStrictEqual(result.map, map);
		assert.deepEqual(result.map.get('a'), { x: 1 });
		assert.notStrictEqual(result.map.get('a'), value);
	});

	it('should clone Set instances', function () {
		const value = { x: 1 };
		const set = new Set([value]);
		const result = mergeDeep({ set });

		assert.instanceOf(result.set, Set);
		assert.notStrictEqual(result.set, set);

		const clonedValue = [...result.set][0];

		assert.deepEqual(clonedValue, value);
		assert.notStrictEqual(clonedValue, value);
	});

	it('should clone class instances', function () {
		class TestClass {
			/** @param {number} value */
			constructor(value) {
				this.value = value;
			}
		}

		const instance = new TestClass(123);
		const result = mergeDeep({ instance });

		assert.instanceOf(result.instance, TestClass);
		assert.notStrictEqual(result.instance, instance);
		assert.strictEqual(result.instance.value, 123);
	});

	it('should overwrite earlier class instances', function () {
		class TestClass {
			/** @param {number} value */
			constructor(value) {
				this.value = value;
			}
		}

		const instance1 = new TestClass(1);
		const instance2 = new TestClass(2);
		const result = mergeDeep(
			{ obj: instance1 },
			{ obj: instance2 }
		);

		assert.instanceOf(result.obj, TestClass);
		assert.notStrictEqual(result.obj, instance1);
		assert.notStrictEqual(result.obj, instance2);
		assert.strictEqual(result.obj.value, 2);
	});

	it('should overwrite earlier Map instances rather than merging their entries', function () {
		const map1 = new Map([['x', 1]]);
		const map2 = new Map([['y', 2]]);
		const result = mergeDeep({ data: map1 }, { data: map2 });

		assert.isFalse(result.data.has('x'));
		assert.isTrue(result.data.has('y'));
	});

	it('should preserve getters', function () {
		const obj = {};
		Object.defineProperty(obj, 'foo', {
			get() {
				return 123;
			},
			enumerable: true,
		});
		const result = mergeDeep(obj);
		const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

		assert.strictEqual(result.foo, 123);
		assert.isFunction(descriptor?.get);
	});

	it('should preserve setters', function () {
		let value = 0;
		const obj = {};
		Object.defineProperty(obj, 'foo', {
			set(v) {
				value = v;
			},
			enumerable: true,
		});

		const result = mergeDeep(obj);
		const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

		assert.isFunction(descriptor?.set);

		result.foo = 100;

		assert.strictEqual(value, 100);
	});

	it('should preserve symbol properties', function () {
		const key = Symbol('foo');
		const result = mergeDeep({ [key]: 123 });

		assert.strictEqual(result[key], 123);
	});

	it('should not overwrite existing getter properties', function () {
		const obj1 = {};
		Object.defineProperty(obj1, 'foo', {
			get() {
				return { x: 1 };
			},
			enumerable: true,
			configurable: true,
		});
		const obj2 = { foo: { y: 2 } };
		const result = mergeDeep(obj1, obj2);
		const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

		assert.isFunction(descriptor?.get);
		assert.deepEqual(/** @type {any} */ (result).foo, { x: 1 });
	});

	it('should overwrite existing properties with getter properties', function () {
		const obj1 = { foo: { x: 1 } };
		const obj2 = {};
		Object.defineProperty(obj2, 'foo', {
			get() {
				return { y: 2 };
			},
			enumerable: true,
			configurable: true,
		});
		const result = mergeDeep(obj1, obj2);
		const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

		assert.isFunction(descriptor?.get);
		assert.deepEqual(/** @type {any} */ (result).foo, { y: 2 });
	});
});

describe('isObject()', function () {
	it('should return true for plain objects', function () {
		assert.isTrue(isObject({}));
		assert.isTrue(isObject(Object.create(null)));
	});

	it('should return true for class instances', function () {
		assert.isTrue(isObject(new Set()));
		assert.isTrue(isObject(new Map()));
		assert.isTrue(isObject(new Date()));
		assert.isTrue(isObject(/a/));
	});

	it('should return false for null', function () {
		assert.isFalse(isObject(null));
	});

	it('should return false for arrays', function () {
		assert.isFalse(isObject([]));
	});

	it('should return false for primitives', function () {
		assert.isFalse(isObject('abc'));
		assert.isFalse(isObject(123));
		assert.isFalse(isObject(123n));
		assert.isFalse(isObject(true));
		assert.isFalse(isObject(Symbol()));
		assert.isFalse(isObject(undefined));
	});
});

describe('isPlainObject()', function () {

	it('should return true for plain objects', function () {
		assert.isTrue(isPlainObject({}));
	});

	it('should return true for null prototype objects', function () {
		assert.isTrue(isPlainObject(Object.create(null)));
	});

	it('should return false for class instances', function () {
		assert.isFalse(isPlainObject(new Set()));
		assert.isFalse(isPlainObject(new Map()));
		assert.isFalse(isPlainObject(new Date()));
		assert.isFalse(isPlainObject(/a/));
	});

	it('should return false for null', function () {
		assert.isFalse(isPlainObject(null));
	});

	it('should return false for arrays', function () {
		assert.isFalse(isPlainObject([]));
	});

	it('should return false for primitives', function () {
		assert.isFalse(isPlainObject('abc'));
		assert.isFalse(isPlainObject(123));
		assert.isFalse(isPlainObject(123n));
		assert.isFalse(isPlainObject(true));
		assert.isFalse(isPlainObject(Symbol()));
		assert.isFalse(isPlainObject(undefined));
	});
});

describe('isEmptyObject()', function () {

	it('should return true for empty objects', function () {
		assert.isTrue(isEmptyObject({}));
	});

	it('should return true for empty null prototype objects', function () {
		assert.isTrue(isEmptyObject(Object.create(null)));
	});

	it('should return false for non-empty objects', function () {
		assert.isFalse(isEmptyObject({ a: 1 }));
	});

	it('should return false for objects with symbol properties', function () {
		assert.isFalse(isEmptyObject({ [Symbol('a')]: 1 }));
	});

	it('should return false for objects with non-enumerable properties', function () {
		const obj = {};

		Object.defineProperty(obj, 'foo', {
			value: 1,
			enumerable: false,
		});

		assert.isFalse(isEmptyObject(obj));
	});

	it('should return null for class instances', function () {
		assert.isNull(isEmptyObject(new Set()));
		assert.isNull(isEmptyObject(new Map()));
		assert.isNull(isEmptyObject(new Date()));
		assert.isNull(isEmptyObject(/a/));
	});

	it('should return null for null', function () {
		assert.isNull(isEmptyObject(null));
	});

	it('should return null for arrays', function () {
		assert.isNull(isEmptyObject([]));
	});

	it('should return null for primitives', function () {
		assert.isNull(isEmptyObject('abc'));
		assert.isNull(isEmptyObject(123));
		assert.isNull(isEmptyObject(123n));
		assert.isNull(isEmptyObject(true));
		assert.isNull(isEmptyObject(Symbol()));
		assert.isNull(isEmptyObject(undefined));
	});
});

describe('isClassInstance()', function () {

	class TestClass {
		foo = 'bar';
	}

	it('should return true for class instances', function () {
		assert.isTrue(isClassInstance(new TestClass()));
	});

	it('should return true for built-in object instances', function () {
		assert.isTrue(isClassInstance(new Set()));
		assert.isTrue(isClassInstance(new Map()));
		assert.isTrue(isClassInstance(new Date()));
		assert.isTrue(isClassInstance(/a/));
	});

	it('should return false for plain objects', function () {
		assert.isFalse(isClassInstance({}));
	});

	it('should return false for null prototype objects', function () {
		assert.isFalse(isClassInstance(Object.create(null)));
	});

	it('should return false for arrays', function () {
		assert.isFalse(isClassInstance([]));
	});

	it('should return false for null', function () {
		assert.isFalse(isClassInstance(null));
	});

	it('should return false for primitives', function () {
		assert.isFalse(isClassInstance('abc'));
		assert.isFalse(isClassInstance(123));
		assert.isFalse(isClassInstance(123n));
		assert.isFalse(isClassInstance(true));
		assert.isFalse(isClassInstance(Symbol()));
		assert.isFalse(isClassInstance(undefined));
	});
});

describe('deepCloneInstance()', function () {

	it('should return primitive values unchanged', function () {
		// @ts-expect-error Intentional non-object input
		assert.strictEqual(deepCloneInstance(123), 123);
		// @ts-expect-error Intentional non-object input
		assert.strictEqual(deepCloneInstance('abc'), 'abc');
	});

	it('should return null for null inputs', function () {
		// @ts-expect-error Intentional non-object input
		assert.isNull(deepCloneInstance(null));
	});

	it('should use custom _clone method when available', function () {
		let called = false;

		class TestClass {
			custom = true;
			_clone() {
				called = true;
				return new TestClass();
			}
		}

		const instance = new TestClass();
		const clone = deepCloneInstance(instance);

		assert.isTrue(called);
		assert.deepEqual(clone, instance);
		assert.notStrictEqual(clone, instance);
		assert.instanceOf(clone, TestClass);
		assert.isTrue(clone.custom);
	});

	it('should clone Date instances', function () {
		const original = new Date();

		const clone = deepCloneInstance(original);

		assert.instanceOf(clone, Date);
		assert.notStrictEqual(clone, original);
		assert.strictEqual(clone.getTime(), original.getTime());
	});

	it('should clone RegExp instances', function () {
		const original = /foo/gi;

		const clone = deepCloneInstance(original);

		assert.instanceOf(clone, RegExp);
		assert.notStrictEqual(clone, original);
		assert.strictEqual(clone.source, original.source);
		assert.strictEqual(clone.flags, original.flags);
	});

	it('should clone Map instances deeply', function () {
		const key = { k: 1 };
		const value = { x: 1 };

		const original = new Map([
			[key, value],
		]);

		const clone = deepCloneInstance(original);

		assert.instanceOf(clone, Map);
		assert.notStrictEqual(clone, original);

		const [[clonedKey, clonedValue]] = [...clone.entries()];

		assert.deepEqual(clonedKey, key);
		assert.notStrictEqual(clonedKey, key);
		assert.deepEqual(clonedValue, value);
		assert.notStrictEqual(clonedValue, value);
	});

	it('should clone Set instances deeply', function () {
		const value = { x: 1 };

		const original = new Set([value]);

		const clone = deepCloneInstance(original);

		assert.instanceOf(clone, Set);
		assert.notStrictEqual(clone, original);

		const clonedValue = [...clone][0];

		assert.deepEqual(clonedValue, value);
		assert.notStrictEqual(clonedValue, value);
	});

	it('should preserve prototype', function () {
		class TestClass {
			/** @param {number} value */
			constructor(value) {
				this.value = value;
			}

			getValue() {
				return this.value;
			}
		}

		const original = new TestClass(123);
		const clone = deepCloneInstance(original);

		assert.instanceOf(clone, TestClass);
		assert.strictEqual(clone.getValue(), 123);
		assert.notStrictEqual(clone, original);
	});


	it('should deep clone nested objects', function () {
		class TestClass {}

		/**
		 * @type {TestClass & { nested?: { x: { y: number }}; }}
		 */
		const original = new TestClass();
		original.nested = { x: { y: 1 }};

		const clone = deepCloneInstance(original);

		assert.notStrictEqual(clone.nested, original.nested);
		assert.deepEqual(clone.nested, { x: { y: 1 }});
	});

	it('should preserve getters', function () {
		class TestClass {
			value = 123;

			get doubled() {
				return this.value * 2;
			}
		}

		const clone = deepCloneInstance(new TestClass());
		const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(clone), 'doubled');

		assert.isFunction(descriptor?.get);
		assert.strictEqual(clone.doubled, 246);
	});

	it('should preserve inherited methods', function () {
		class Parent {
			getParentValue() {
				return 1;
			}
		}

		class Child extends Parent {}

		const clone = deepCloneInstance(new Child());

		assert.instanceOf(clone, Child);
		assert.strictEqual(clone.getParentValue(), 1);
	});

	it('should support cyclic references', function () {
		class Node {
			constructor() {
				this.self = this;
			}
		}

		const node = new Node();
		const clone = deepCloneInstance(node);

		assert.strictEqual(clone.self, clone);
		assert.notStrictEqual(clone.self, node);
		assert.notStrictEqual(clone, node);
	});

	it('should preserve shared references', function () {
		const shared = { x: 1 };

		class TestClass {
			constructor() {
				this.a = shared;
				this.b = shared;
			}
		}

		const clone = deepCloneInstance(new TestClass());

		assert.strictEqual(clone.a, clone.b);
		assert.notStrictEqual(clone.a, shared);
	});
});

describe('isPrimitive()', function () {

	it('should return true for primitives', function () {
		assert.isTrue(isPrimitive(null));
		assert.isTrue(isPrimitive(undefined));
		assert.isTrue(isPrimitive('abc'));
		assert.isTrue(isPrimitive(1));
		assert.isTrue(isPrimitive(true));
		assert.isTrue(isPrimitive(Symbol()));
		assert.isTrue(isPrimitive(1n));
	});

	it('should return false for objects', function () {
		assert.isFalse(isPrimitive({}));
		assert.isFalse(isPrimitive([]));
		assert.isFalse(isPrimitive(new Date()));
	});
});

describe('escapeRegExp()', function () {

	it('should escape regex metacharacters', function () {
		assert.strictEqual(
			escapeRegExp('\\{}()|.?*+-^$[]'),
			'\\\\\\{\\}\\(\\)\\|\\.\\?\\*\\+\\-\\^\\$\\[\\]'
		);
	});
});

describe('arraysEqual()', function () {

	it('should compare ordered arrays', function () {
		assert.isTrue(arraysEqual([1, 2, 3], [1, 2, 3]));
		assert.isFalse(arraysEqual([1, 2, 3], [3, 2, 1]));
	});

	it('should compare arrays ignoring order', function () {
		assert.isTrue(arraysEqual([1, 2, 3], [3, 2, 1], true));
	});

	it('should detect different lengths', function () {
		assert.isFalse(arraysEqual([1, 2], [1], true));
	});

	it('should fail for duplicate mismatch', function () {
		assert.isFalse(arraysEqual([1, 1], [1, 2], true));
	});
});

describe('sleep()', function () {
	/**
	 * @type {sinon.SinonFakeTimers}
	 */
	let clock;
	beforeEach(() => { clock = sinon.useFakeTimers(); });
	afterEach(() => { clock.restore(); });

	it('should resolve after the specified duration', async function () {
		let resolved = false;

		const promise = sleep(50).then(() => {
			resolved = true;
		});

		clock.tick(49);
		assert.isFalse(resolved);

		clock.tick(1);
		await promise;

		assert.isTrue(resolved);
	});

	it('should clamp negative durations to zero', async function () {
		let resolved = false;

		const promise = sleep(-100).then(() => {
			resolved = true;
		});

		assert.isFalse(resolved);

		clock.tick(0);
		await promise;

		assert.isTrue(resolved);
	});
});