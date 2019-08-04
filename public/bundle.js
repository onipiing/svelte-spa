
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(component, store, callback) {
        const unsub = store.subscribe(callback);
        component.$$.on_destroy.push(unsub.unsubscribe
            ? () => unsub.unsubscribe()
            : unsub);
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    /* src/routes/Start.svelte generated by Svelte v3.6.10 */

    const file = "src/routes/Start.svelte";

    function create_fragment(ctx) {
    	var h1, t1, label0, input0, input0_min_value, input0_max_value, t2, input1, input1_min_value, input1_max_value, t3, label1, input2, input2_min_value, input2_max_value, t4, input3, input3_min_value, input3_max_value, t5, label2, input4, input4_max_value, t6, input5, input5_max_value, dispose;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "START";
    			t1 = space();
    			label0 = element("label");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			label1 = element("label");
    			input2 = element("input");
    			t4 = space();
    			input3 = element("input");
    			t5 = space();
    			label2 = element("label");
    			input4 = element("input");
    			t6 = space();
    			input5 = element("input");
    			add_location(h1, file, 33, 0, 989);
    			attr(input0, "type", "number");
    			attr(input0, "min", input0_min_value = numberLimits.lower);
    			attr(input0, "max", input0_max_value = numberLimits.higher);
    			add_location(input0, file, 35, 1, 1013);
    			attr(input1, "type", "range");
    			attr(input1, "min", input1_min_value = numberLimits.lower);
    			attr(input1, "max", input1_max_value = numberLimits.higher);
    			add_location(input1, file, 36, 1, 1132);
    			add_location(label0, file, 34, 0, 1004);
    			attr(input2, "type", "number");
    			attr(input2, "min", input2_min_value = numberLimits.lower);
    			attr(input2, "max", input2_max_value = numberLimits.higher);
    			add_location(input2, file, 39, 1, 1267);
    			attr(input3, "type", "range");
    			attr(input3, "min", input3_min_value = numberLimits.lower);
    			attr(input3, "max", input3_max_value = numberLimits.higher);
    			add_location(input3, file, 40, 1, 1387);
    			add_location(label1, file, 38, 0, 1258);
    			attr(input4, "type", "number");
    			attr(input4, "min", "0");
    			attr(input4, "max", input4_max_value = numberLimits.questions);
    			add_location(input4, file, 43, 1, 1523);
    			attr(input5, "type", "range");
    			attr(input5, "min", "0");
    			attr(input5, "max", input5_max_value = numberLimits.questions);
    			add_location(input5, file, 44, 1, 1628);
    			add_location(label2, file, 42, 0, 1514);

    			dispose = [
    				listen(input0, "input", ctx.input0_input_handler),
    				listen(input0, "input", ctx.checkMin),
    				listen(input1, "change", ctx.input1_change_input_handler),
    				listen(input1, "input", ctx.input1_change_input_handler),
    				listen(input1, "input", ctx.checkMin),
    				listen(input2, "input", ctx.input2_input_handler),
    				listen(input2, "input", ctx.checkMax),
    				listen(input3, "change", ctx.input3_change_input_handler),
    				listen(input3, "input", ctx.input3_change_input_handler),
    				listen(input3, "input", ctx.checkMax),
    				listen(input4, "input", ctx.input4_input_handler),
    				listen(input4, "input", ctx.checkQuizLen),
    				listen(input5, "change", ctx.input5_change_input_handler),
    				listen(input5, "input", ctx.input5_change_input_handler),
    				listen(input5, "input", ctx.checkQuizLen)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, label0, anchor);
    			append(label0, input0);

    			input0.value = ctx.$lowestNumber;

    			append(label0, t2);
    			append(label0, input1);

    			input1.value = ctx.$lowestNumber;

    			insert(target, t3, anchor);
    			insert(target, label1, anchor);
    			append(label1, input2);

    			input2.value = ctx.$highestNumber;

    			append(label1, t4);
    			append(label1, input3);

    			input3.value = ctx.$highestNumber;

    			insert(target, t5, anchor);
    			insert(target, label2, anchor);
    			append(label2, input4);

    			input4.value = ctx.$quizLength;

    			append(label2, t6);
    			append(label2, input5);

    			input5.value = ctx.$quizLength;
    		},

    		p: function update(changed, ctx) {
    			if (changed.$lowestNumber) input0.value = ctx.$lowestNumber;
    			if (changed.$lowestNumber) input1.value = ctx.$lowestNumber;
    			if (changed.$highestNumber) input2.value = ctx.$highestNumber;
    			if (changed.$highestNumber) input3.value = ctx.$highestNumber;
    			if (changed.$quizLength) input4.value = ctx.$quizLength;
    			if (changed.$quizLength) input5.value = ctx.$quizLength;
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(label0);
    				detach(t3);
    				detach(label1);
    				detach(t5);
    				detach(label2);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $lowestNumber, $highestNumber, $quizLength;

    	validate_store(lowestNumber, 'lowestNumber');
    	subscribe($$self, lowestNumber, $$value => { $lowestNumber = $$value; $$invalidate('$lowestNumber', $lowestNumber); });
    	validate_store(highestNumber, 'highestNumber');
    	subscribe($$self, highestNumber, $$value => { $highestNumber = $$value; $$invalidate('$highestNumber', $highestNumber); });
    	validate_store(quizLength, 'quizLength');
    	subscribe($$self, quizLength, $$value => { $quizLength = $$value; $$invalidate('$quizLength', $quizLength); });

    	console.table(numberLimits);

        function checkMin() {
            if ($lowestNumber >= $highestNumber) {
                console.log('checkMin()');
                // let temp = $highestNumber;
                highestNumber.update(n => $lowestNumber);
                lowestNumber.update(n => $highestNumber);
            }
        }
        
        function checkMax() {
            if ($highestNumber < $lowestNumber) {
                console.log('checkMax()');
                // let temp = $highestNumber;
                lowestNumber.update(n => $highestNumber);
                highestNumber.update(n => $lowestNumber);
            }
        }

        function checkQuizLen() {
            console.log('checkQuizLen()');
            if ($quizLength > numberLimits.questions) {
                quizLength.update(n => numberLimits.questions);
            } else if ($quizLength < 1) {
                quizLength.update(n => 1);
            }
        }

    	function input0_input_handler() {
    		lowestNumber.set(to_number(this.value));
    	}

    	function input1_change_input_handler() {
    		lowestNumber.set(to_number(this.value));
    	}

    	function input2_input_handler() {
    		highestNumber.set(to_number(this.value));
    	}

    	function input3_change_input_handler() {
    		highestNumber.set(to_number(this.value));
    	}

    	function input4_input_handler() {
    		quizLength.set(to_number(this.value));
    	}

    	function input5_change_input_handler() {
    		quizLength.set(to_number(this.value));
    	}

    	return {
    		checkMin,
    		checkMax,
    		checkQuizLen,
    		$lowestNumber,
    		$highestNumber,
    		$quizLength,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_input_handler,
    		input5_change_input_handler
    	};
    }

    class Start extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* src/routes/Quiz.svelte generated by Svelte v3.6.10 */

    const file$1 = "src/routes/Quiz.svelte";

    // (10:0) {:else}
    function create_else_block(ctx) {
    	var h1;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "QUIZ";
    			add_location(h1, file$1, 10, 4, 261);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    			}
    		}
    	};
    }

    // (7:0) {#if $highestNumber}
    function create_if_block(ctx) {
    	var h1, t1, p, t2, t3, t4, t5;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "QUIZ";
    			t1 = space();
    			p = element("p");
    			t2 = text("Lowest: ");
    			t3 = text(ctx.$lowestNumber);
    			t4 = text(" / Highest: ");
    			t5 = text(ctx.$highestNumber);
    			add_location(h1, file$1, 7, 4, 172);
    			add_location(p, file$1, 8, 4, 190);
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			insert(target, t1, anchor);
    			insert(target, p, anchor);
    			append(p, t2);
    			append(p, t3);
    			append(p, t4);
    			append(p, t5);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$lowestNumber) {
    				set_data(t3, ctx.$lowestNumber);
    			}

    			if (changed.$highestNumber) {
    				set_data(t5, ctx.$highestNumber);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t1);
    				detach(p);
    			}
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor;

    	function select_block_type(ctx) {
    		if (ctx.$highestNumber) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type = select_block_type(ctx);
    	var if_block = current_block_type(ctx);

    	return {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(changed, ctx);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);
    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if_block.d(detaching);

    			if (detaching) {
    				detach(if_block_anchor);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $highestNumber, $lowestNumber;

    	validate_store(highestNumber, 'highestNumber');
    	subscribe($$self, highestNumber, $$value => { $highestNumber = $$value; $$invalidate('$highestNumber', $highestNumber); });
    	validate_store(lowestNumber, 'lowestNumber');
    	subscribe($$self, lowestNumber, $$value => { $lowestNumber = $$value; $$invalidate('$lowestNumber', $lowestNumber); });

    	return { $highestNumber, $lowestNumber };
    }

    class Quiz extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* src/routes/Results.svelte generated by Svelte v3.6.10 */

    const file$2 = "src/routes/Results.svelte";

    function create_fragment$2(ctx) {
    	var h1;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "RESULTS";
    			add_location(h1, file$2, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    			}
    		}
    	};
    }

    class Results extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$2, safe_not_equal, []);
    	}
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.6.10 */
    const { Error: Error_1, Object: Object_1 } = globals;

    function create_fragment$3(ctx) {
    	var switch_instance_anchor, current;

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		return {
    			props: { params: ctx.componentParams },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    	}

    	return {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = {};
    			if (changed.componentParams) switch_instance_changes.params = ctx.componentParams;

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    const hashPosition = window.location.href.indexOf('#/');
    let location = (hashPosition > -1) ? window.location.href.substr(hashPosition + 1) : '/';

    // Check if there's a querystring
    const qsPosition = location.indexOf('?');
    let querystring = '';
    if (qsPosition > -1) {
        querystring = location.substr(qsPosition + 1);
        location = location.substr(0, qsPosition);
    }

    return {location, querystring}
    }

    /**
     * Readable store that returns the current full location (incl. querystring)
     */
    const loc = readable(
    getLocation(),
    // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
        const update = () => {
            set(getLocation());
        };
        window.addEventListener('hashchange', update, false);

        return function stop() {
            window.removeEventListener('hashchange', update, false);
        }
    }
    );

    /**
     * Readable store that returns the current location
     */
    const location = derived(
    loc,
    ($loc) => $loc.location
    );

    /**
     * Readable store that returns the current querystring
     */
    const querystring = derived(
    loc,
    ($loc) => $loc.querystring
    );

    /**
     * Replaces the current page but without modifying the history stack.
     *
     * @param {string} location - Path to navigate to (must start with `/`)
     */
    function replace(location) {
    if (!location || location.length < 1 || location.charAt(0) != '/') {
        throw Error('Invalid parameter location')
    }

    // Execute this code when the current call stack is complete
    setTimeout(() => {
        history.replaceState(undefined, undefined, '#' + location);

        // The method above doesn't trigger the hashchange event, so let's do that manually
        window.dispatchEvent(new Event('hashchange'));
    }, 0);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $loc;

    	validate_store(loc, 'loc');
    	subscribe($$self, loc, $$value => { $loc = $$value; $$invalidate('$loc', $loc); });

    	/**
     * Dictionary of all routes, in the format `'/path': component`.
     *
     * For example:
     * ````js
     * import HomeRoute from './routes/HomeRoute.svelte'
     * import BooksRoute from './routes/BooksRoute.svelte'
     * import NotFoundRoute from './routes/NotFoundRoute.svelte'
     * routes = {
     *     '/': HomeRoute,
     *     '/books': BooksRoute,
     *     '*': NotFoundRoute
     * }
     * ````
     */
    let { routes = {} } = $$props;

    /**
     * Container for a route: path, component
     */
    class RouteItem {
        /**
         * Initializes the object and creates a regular expression from the path, using regexparam.
         *
         * @param {string} path - Path to the route (must start with '/' or '*')
         * @param {SvelteComponent} component - Svelte component for the route
         */
        constructor(path, component) {
            // Path must be a regular or expression, or a string starting with '/' or '*'
            if (!path || 
                (typeof path == 'string' && (path.length < 1 || (path.charAt(0) != '/' && path.charAt(0) != '*'))) ||
                (typeof path == 'object' && !(path instanceof RegExp))
            ) {
                throw Error('Invalid value for "path" argument')
            }

            const {pattern, keys} = regexparam(path);

            this.path = path;
            this.component = component;

            this._pattern = pattern;
            this._keys = keys;
        }

        /**
         * Checks if `path` matches the current route.
         * If there's a match, will return the list of parameters from the URL (if any).
         * In case of no match, the method will return `null`.
         *
         * @param {string} path - Path to test
         * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
         */
        match(path) {
            const matches = this._pattern.exec(path);
            if (matches === null) {
                return null
            }

            // If the input was a regular expression, this._keys would be false, so return matches as is
            if (this._keys === false) {
                return matches
            }

            const out = {};
            let i = 0;
            while (i < this._keys.length) {
                out[this._keys[i]] = matches[++i] || null;
            }
            return out
        }
    }

    // We need an iterable: if it's not a Map, use Object.entries
    const routesIterable = (routes instanceof Map) ? routes : Object.entries(routes);

    // Set up all routes
    const routesList = [];
    for (const [path, route] of routesIterable) {
        routesList.push(new RouteItem(path, route));
    }

    // Props for the component to render
    let component = null;
    let componentParams = {};

    	const writable_props = ['routes'];
    	Object_1.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('routes' in $$props) $$invalidate('routes', routes = $$props.routes);
    	};

    	$$self.$$.update = ($$dirty = { component: 1, $loc: 1 }) => {
    		if ($$dirty.component || $$dirty.$loc) { {
                // Find a route matching the location
                $$invalidate('component', component = null);
                let i = 0;
                while (!component && i < routesList.length) {
                    const match = routesList[i].match($loc.location);
                    if (match) {
                        $$invalidate('component', component = routesList[i].component);
                        $$invalidate('componentParams', componentParams = match);
                    }
                    i++;
                }
            } }
    	};

    	return { routes, component, componentParams };
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, ["routes"]);
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/routes/NotFound.svelte generated by Svelte v3.6.10 */

    const file$3 = "src/routes/NotFound.svelte";

    function create_fragment$4(ctx) {
    	var h1, t0, t1;

    	return {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text(ctx.$location);
    			t1 = text(" NOT FOUND");
    			add_location(h1, file$3, 6, 0, 98);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			append(h1, t0);
    			append(h1, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.$location) {
    				set_data(t0, ctx.$location);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    			}
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $location;

    	validate_store(location, 'location');
    	subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

    	return { $location };
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$4, safe_not_equal, []);
    	}
    }

    const lowestNumber = writable(222);
    const highestNumber = writable(555);
    const quizLength = writable(1);
    const numberLimits = {
        lower: 0,
        higher: 999,
        questions: 30
    };

    // create 'routes' object to pass to Router component in markup
    const routes = writable({
        // Exact path
        '/': Start,

        // Using named parameters, with last being optional
        '/quiz/:items?': Quiz,

        // Wildcard parameter
        '/results': Results,

        // Catch-all
        // This is optional, but if present it must be the last
        '*': NotFound,
    });

    /* src/App.svelte generated by Svelte v3.6.10 */

    const file$4 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.anOption = list[i];
    	return child_ctx;
    }

    // (40:3) {#each options as anOption}
    function create_each_block(ctx) {
    	var option, t0_value = ctx.anOption.text, t0, t1, option_value_value;

    	return {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.anOption;
    			option.value = option.__value;
    			add_location(option, file$4, 40, 4, 842);
    		},

    		m: function mount(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
    		},

    		p: function update(changed, ctx) {
    			option.value = option.__value;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var body, form, select, t0, hr0, t1, t2, hr1, current, dispose;

    	var each_value = ctx.options;

    	var each_blocks = [];

    	for (var i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	var router = new Router({
    		props: { routes: ctx.$routes },
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			body = element("body");
    			form = element("form");
    			select = element("select");

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			hr0 = element("hr");
    			t1 = space();
    			router.$$.fragment.c();
    			t2 = space();
    			hr1 = element("hr");
    			if (ctx.selected === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			attr(select, "class", "svelte-y8239u");
    			add_location(select, file$4, 38, 2, 776);
    			add_location(form, file$4, 37, 1, 767);
    			add_location(hr0, file$4, 46, 1, 936);
    			add_location(hr1, file$4, 48, 1, 972);
    			add_location(body, file$4, 36, 0, 759);
    			dispose = listen(select, "change", ctx.select_change_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, body, anchor);
    			append(body, form);
    			append(form, select);

    			for (var i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, ctx.selected);

    			append(body, t0);
    			append(body, hr0);
    			append(body, t1);
    			mount_component(router, body, null);
    			append(body, t2);
    			append(body, hr1);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.options) {
    				each_value = ctx.options;

    				for (var i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (changed.selected) select_option(select, ctx.selected);

    			var router_changes = {};
    			if (changed.$routes) router_changes.routes = ctx.$routes;
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(body);
    			}

    			destroy_each(each_blocks, detaching);

    			destroy_component(router);

    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $routes;

    	validate_store(routes, 'routes');
    	subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });

    	

    	let options = [
    		{ id: '', text: `Start` },
    		{ id: 'quiz', text: `Quiz` },
    		{ id: 'quiz/20', text: `Quiz 20	` },
    		{ id: 'results', text: `Results` },
    		{ id: 'WRONG', text: `Bad Path` }
    	];

    	let selected = { id: '', text: `Start` };

    	function select_change_handler() {
    		selected = select_value(this);
    		$$invalidate('selected', selected);
    		$$invalidate('options', options);
    	}

    	$$self.$$.update = ($$dirty = { selected: 1 }) => {
    		if ($$dirty.selected) { {
    				replace(`/${selected.id}`);
    				console.table(selected.id);
    			} }
    	};

    	return {
    		options,
    		selected,
    		$routes,
    		select_change_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$5, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
