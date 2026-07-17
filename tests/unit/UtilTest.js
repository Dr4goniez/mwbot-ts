/* eslint-disable @stylistic/padded-blocks */
import { describe, it, beforeEach, afterEach } from 'mocha';
import { assert } from 'chai';
import sinon from 'sinon';
import { Mwbot } from '../../dist/index.js';
const {
	CloneConfig,
	mergeDeep,
	cloneDeep,
	deepCloneInstance,
	isObject,
	isPlainObject,
	isEmptyObject,
	isClassInstance,
	isPrimitive,
	escapeRegExp,
	arraysEqual,
	sleep,
} = Mwbot.Util;

describe('Mwbot.Util', function () {

	describe('mergeDeep()', function () {

		describe('Basic merging & prototype parity', function () {
			it('should return an empty null-prototype object when called with no arguments', function () {
				const result = mergeDeep();
				assert.isNull(Object.getPrototypeOf(result));
			});

			it('should preserve the prototype of the first object when merging multiple objects', function () {
				class BaseClass {}
				const base = new BaseClass();
				const result = mergeDeep(base, { a: 1 }, { b: 2 });

				assert.instanceOf(result, BaseClass);
				assert.strictEqual(Object.getPrototypeOf(result), BaseClass.prototype);
				assert.strictEqual(result.a, 1);
				assert.strictEqual(result.b, 2);
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
				const result = mergeDeep({ a: 1 }, { a: 2 });
				assert.deepEqual(result, { a: 2 });
			});

			it('should preserve property attributes when merging data properties', function () {
				const obj = {};
				Object.defineProperty(obj, 'foo', {
					value: 123,
					writable: false,
					enumerable: false,
					configurable: false,
				});

				const result = mergeDeep(obj);
				const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

				assert.strictEqual(descriptor?.value, 123);
				assert.isFalse(descriptor?.writable);
				assert.isFalse(descriptor?.enumerable);
				assert.isFalse(descriptor?.configurable);
			});
		});

		describe('Array strategies', function () {
			it('should concatenate arrays by default', function () {
				const result = mergeDeep(
					{ arr: [1, 2] },
					{ arr: [3, 4] }
				);
				assert.deepEqual(result, { arr: [1, 2, 3, 4] });
			});

			it('should replace arrays when arrayStrategy is "replace"', function () {
				const config = new CloneConfig({ arrayStrategy: 'replace' });
				const result = mergeDeep(
					config,
					{ arr: [1, 2] },
					{ arr: [3, 4] }
				);
				assert.deepEqual(result, { arr: [3, 4] });
			});

			it('should merge arrays by index when arrayStrategy is "mergeByIndex"', function () {
				const config = new CloneConfig({ arrayStrategy: 'mergeByIndex' });
				const result = mergeDeep(
					config,
					{ arr: [{ x: 1 }, 2, 3] },
					{ arr: [{ y: 2 }, 9] }
				);
				assert.deepEqual(result, { arr: [{ x: 1, y: 2 }, 9, 3] });
			});

			it('should deep clone object elements in arrays (concat)', function () {
				const obj = { x: 1 };
				const result = mergeDeep({ a: [obj] });

				assert.deepEqual(result.a, [{ x: 1 }]);
				assert.notStrictEqual(result.a[0], obj);
			});
		});

		describe('Built-in objects & classes', function () {
			it('should clone Date instances', function () {
				const date = new Date();
				const result = mergeDeep({ date });

				assert.instanceOf(result.date, Date);
				assert.notStrictEqual(result.date, date);
				assert.strictEqual(result.date.getTime(), date.getTime());
			});

			it('should clone Map instances', function () {
				const value = { x: 1 };
				const map = new Map([['a', value]]);
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

			it('should preserve class instances by reference by default (cloneClassInstances: false)', function () {
				class TestClass {}
				const instance = new TestClass();
				const result = mergeDeep({ instance });

				assert.instanceOf(result.instance, TestClass);
				assert.strictEqual(result.instance, instance); // Preserved by reference
			});

			it('should clone class instances when cloneClassInstances is true', function () {
				const config = new CloneConfig({ cloneClassInstances: true });
				class TestClass {
					value = 123;
				}
				const instance = new TestClass();
				const result = mergeDeep(config, { instance });

				assert.instanceOf(result.instance, TestClass);
				assert.notStrictEqual(result.instance, instance); // Cloned
				assert.strictEqual(result.instance.value, 123);
			});

			it('should overwrite earlier class instances entirely', function () {
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

				assert.strictEqual(result.obj, instance2); // Replaced by reference
			});

			it('should overwrite earlier Map instances rather than merging their entries', function () {
				const map1 = new Map([['x', 1]]);
				const map2 = new Map([['y', 2]]);
				const result = mergeDeep({ data: map1 }, { data: map2 });

				assert.isFalse(result.data.has('x'));
				assert.isTrue(result.data.has('y'));
			});
		});

		describe('Strategies for getters/setters ', function () {
			it('should preserve getters by default', function () {
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

			it('should preserve setters by default', function () {
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

			it('should resolve getters into values when getterSetterStrategy is "resolve"', function () {
				const config = new CloneConfig({ getterSetterStrategy: 'resolve' });
				const value = { x: 1 };
				const obj = {};
				Object.defineProperty(obj, 'foo', {
					get() {
						return value;
					},
					enumerable: true,
				});
				const result = mergeDeep(config, obj);
				const descriptor = Object.getOwnPropertyDescriptor(result, 'foo');

				assert.isUndefined(descriptor?.get); // Getter is gone
				assert.deepEqual(result.foo, value);
				assert.notStrictEqual(result.foo, value);
				assert.deepEqual(descriptor?.value, value); // Became a static value
			});

			it('should preserve symbol properties', function () {
				const key = Symbol('foo');
				const result = mergeDeep({ [key]: 123 });
				assert.strictEqual(result[key], 123);
			});

			it('should not overwrite existing getter properties in the target (preserve)', function () {
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

			it('should overwrite existing properties with getter properties (preserve)', function () {
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

	});

	describe('cloneDeep()', function () {

		describe('Basic cloning & edge cases', function () {
			it('should return primitive values unchanged', function () {
				assert.strictEqual(cloneDeep(123), 123);
				assert.strictEqual(cloneDeep('abc'), 'abc');
			});

			it('should return null for null inputs', function () {
				assert.isNull(cloneDeep(null));
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
				const clone = cloneDeep(instance);

				assert.isTrue(called);
				assert.notStrictEqual(clone, instance);
				assert.instanceOf(clone, TestClass);
				assert.isTrue(clone.custom);
			});
		});

		describe('Built-in object cloning strategies', function () {
			it('should clone Date instances', function () {
				const original = new Date();
				const clone = cloneDeep(original);

				assert.instanceOf(clone, Date);
				assert.notStrictEqual(clone, original);
				assert.strictEqual(clone.getTime(), original.getTime());
			});

			it('should clone RegExp instances', function () {
				const original = /foo/gi;
				const clone = cloneDeep(original);

				assert.instanceOf(clone, RegExp);
				assert.notStrictEqual(clone, original);
				assert.strictEqual(clone.source, original.source);
				assert.strictEqual(clone.flags, original.flags);
			});

			it('should clone Map instances deeply by default', function () {
				const key = { k: 1 };
				const value = { x: 1 };
				const original = new Map([[key, value]]);
				const clone = cloneDeep(original);

				const [[clonedKey, clonedValue]] = [...clone.entries()];

				// By default: key is shallow (reference), value is deep
				assert.strictEqual(clonedKey, key);
				assert.deepEqual(clonedValue, value);
				assert.notStrictEqual(clonedValue, value);
			});

			it('should clone Map keys and values deeply when mapStrategy is "deep-aggressive"', function () {
				const config = new CloneConfig({ mapStrategy: 'deep-aggressive' });
				const key = { k: 1 };
				const value = { x: 1 };
				const original = new Map([[key, value]]);
				const clone = cloneDeep(original, config);

				const [[clonedKey, clonedValue]] = [...clone.entries()];

				assert.deepEqual(clonedKey, key);
				assert.notStrictEqual(clonedKey, key);
				assert.deepEqual(clonedValue, value);
				assert.notStrictEqual(clonedValue, value);
			});

			it('should clone Map values shallowly when mapStrategy is "shallow"', function () {
				const config = new CloneConfig({ mapStrategy: 'shallow' });
				const key = { k: 1 };
				const value = { x: 1 };
				const original = new Map([[key, value]]);
				const clone = cloneDeep(original, config);

				const [[clonedKey, clonedValue]] = [...clone.entries()];

				assert.strictEqual(clonedKey, key);
				assert.strictEqual(clonedValue, value); // Reference kept
			});

			it('should clone Set instances deeply by default', function () {
				const value = { x: 1 };
				const original = new Set([value]);
				const clone = cloneDeep(original);

				const clonedValue = [...clone][0];
				assert.deepEqual(clonedValue, value);
				assert.notStrictEqual(clonedValue, value);
			});

			it('should clone Set values shallowly when setStrategy is "shallow"', function () {
				const config = new CloneConfig({ setStrategy: 'shallow' });
				const value = { x: 1 };
				const original = new Set([value]);
				const clone = cloneDeep(original, config);

				const clonedValue = [...clone][0];
				assert.strictEqual(clonedValue, value); // Reference kept
			});
		});

		describe('Prototypes, nesting & references', function () {
			it('should preserve prototype but NOT clone custom class instances by default', function () {
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
				const clone = cloneDeep(original);

				assert.instanceOf(clone, TestClass);
				assert.strictEqual(clone.getValue(), 123);
				assert.strictEqual(clone, original); // Preserved by ref
			});

			it('should clone custom class instances when cloneClassInstances is true', function () {
				const config = new CloneConfig({ cloneClassInstances: true });
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
				const clone = cloneDeep(original, config);

				assert.instanceOf(clone, TestClass);
				assert.strictEqual(clone.getValue(), 123);
				assert.notStrictEqual(clone, original); // Cloned
			});

			it('should deep clone nested objects', function () {
				class TestClass {}
				const config = new CloneConfig({ cloneClassInstances: true });

				/** @type {TestClass & { nested?: { x: { y: number }}; }} */
				const original = new TestClass();
				original.nested = { x: { y: 1 } };

				const clone = cloneDeep(original, config);

				assert.notStrictEqual(clone.nested, original.nested);
				assert.deepEqual(clone.nested, { x: { y: 1 } });
			});

			it('should support cyclic references', function () {
				class Node {
					constructor() {
						this.self = this;
					}
				}
				const config = new CloneConfig({ cloneClassInstances: true });
				const node = new Node();
				const clone = cloneDeep(node, config);

				assert.strictEqual(clone.self, clone);
				assert.notStrictEqual(clone.self, node);
				assert.notStrictEqual(clone, node);
			});

			it('should support cyclic references through custom _clone methods', function () {
				class TestClass {
					/** @type {TestClass} */
					self;

					constructor() {
						this.self = this;
					}

					/**
					 * @param {WeakMap<any, any>} seen
					 * @returns {TestClass}
					 */
					_clone(seen) {
						const cloned = new TestClass();
						seen.set(this, cloned);
						cloned.self = cloned;
						return cloned;
					}
				}

				const original = new TestClass();
				const clone = cloneDeep(original);

				assert.strictEqual(clone.self, clone);
			});

			it('should preserve shared references', function () {
				const shared = { x: 1 };
				class TestClass {
					constructor() {
						this.a = shared;
						this.b = shared;
					}
				}
				const config = new CloneConfig({ cloneClassInstances: true });
				const clone = cloneDeep(new TestClass(), config);

				assert.strictEqual(clone.a, clone.b);
				assert.notStrictEqual(clone.a, shared);
			});
		});

		describe('Resolution for getters/setters', function () {
			it('should preserve getters by default', function () {
				class TestClass {
					value = 123;
					get doubled() {
						return this.value * 2;
					}
				}
				const config = new CloneConfig({ cloneClassInstances: true });
				const clone = cloneDeep(new TestClass(), config);
				const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(clone), 'doubled');

				assert.isFunction(descriptor?.get);
				assert.strictEqual(clone.doubled, 246);
			});

			it('should resolve getters to static values when getterSetterStrategy is "resolve"', function () {
				const config = new CloneConfig({ getterSetterStrategy: 'resolve' });
				const obj = {};
				Object.defineProperty(obj, 'foo', {
					get() {
						return { value: 1 };
					},
					enumerable: true,
				});

				const clone = cloneDeep(obj, config);
				const descriptor = Object.getOwnPropertyDescriptor(clone, 'foo');

				assert.isUndefined(descriptor?.get);
				assert.deepEqual(clone.foo, { value: 1 });
			});

			it('should preserve property descriptors', function () {
				const obj = {};
				Object.defineProperty(obj, 'foo', {
					value: 123,
					writable: false,
					enumerable: false,
					configurable: false,
				});

				const clone = cloneDeep(obj);
				const descriptor = Object.getOwnPropertyDescriptor(clone, 'foo');

				assert.strictEqual(descriptor?.value, 123);
				assert.isFalse(descriptor?.writable);
				assert.isFalse(descriptor?.enumerable);
				assert.isFalse(descriptor?.configurable);
			});
		});

	});

	describe('deepCloneInstance() [deprecated]', function () {
		it('should clone class instances by default for backward compatibility', function () {
			class TestClass {
				/** @param {number} value */
				constructor(value) {
					this.value = value;
				}
			}
			const original = new TestClass(123);
			const clone = deepCloneInstance(original);

			assert.instanceOf(clone, TestClass);
			assert.notStrictEqual(clone, original);
			assert.strictEqual(clone.value, 123);
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
		beforeEach(function () {
			clock = sinon.useFakeTimers();
		});
		afterEach(function () {
			clock.restore();
		});

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
});
