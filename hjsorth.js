var forth = (function()
{
    var glossary =
    [
        /*
         * Core word set.
         */
        
        /*
         * ! ( x a-addr -- )
         *
         * Store x at a-addr.
         */
        {
            name: "!",
            interpret: function(context)
            {
                var address = context.stack.pop();
                var x = context.stack.pop();

                context.forth.heap[address] = x;
            }
        },
        // TODO: "#"
        // TODO: "#>"
        // TODO: "#S"
        /**
         * ' ( "<spaces>name" -- xt )
         *
         * Skip leading space delimiters. Parse name delimited by a space. Find
         * name and return xt, the execution token for name. An ambiguous
         * condition exists if name is not found.
         *
         * When interpreting, ' xyz EXECUTE is equivalent to xyz.
         */
        {
            name: "'",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var word = context.forth.dictionary.findOrFail(name);

                context.stack.push(word.interpret);
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var word = context.forth.dictionary.findOrFail(name);

                    context.stack.push(word.interpret);
                });
            }
        },
        /**
         * Parse ccc delimited by ) (right parenthesis). ( is an immediate
         * word.
         * 
         * The number of characters in ccc may be zero to the number of
         * characters in the parse area.
         */
        {
            name: "(",
            immediate: true,
            interpret: function(context)
            {
                context.readUntil(")");
            }
        },
        /**
         * * ( n1|u1 n2|u2 -- n3|u3 )
         *
         * Multiply n1|u1 by n2|u2 giving the product n3|u3.
         */
        {
            name: "*",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 * n2);
            }
        },
        /**
         * ( n1 n2 n3 -- n4 )
         *
         * Multiply n1 by n2 producing the intermediate double-cell result d.
         * Divide d by n3 giving the single-cell quotient n4. An ambigous
         * condition exists if n3 is zero or if the quotient n4 lies outside
         * the range of a signed number. If d and n3 differ in sign, the
         * implementation-defined result returned will be the same as that
         * returned by either the phrase >R M* R> FM/MOD SWAP DROP or the
         * phrase >R M* R> SM/REM SWAP DROP .
         */
        {
            name: "*/",
            interpret: function(context)
            {
                var n3 = context.stack.pop();
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(Math.floor((n1 * n2) / n3));
            }
        },
        /**
         * ( n1 n2 n3 -- n4 n5 )
         *
         * Multiply n1 by n2 producing the intermediate double-cell result d.
         * Divide d by n3 producing the single-cell remainder n4 and the
         * single-cell quotient n5. An ambiguous condition exists if n3 is
         * zero, or if the quotient n5 lies outside the range of a single-cell
         * signed integer. If d and n3 differ in sign, the implementation-defined
         * result returned will be the same as that returned by either the
         * phrase >R M* R> FM/MOD or the phrase >R M* R> SM/REM .
         */
        {
            name: "*/MOD",
            interpret: function(context)
            {
                var n3 = context.stack.pop();
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();
                var d = n1 * n2;

                context.stack.push(d % n3, Math.floor(d / n3));
            }
        },
        /**
         * + ( n1|u1 n2|u2 -- n3|u3 )
         *
         * Add n2|u2 to n1|u1, giving the sum n3|u3.
         */
        {
            name: "+",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 + n2);
            }
        },
        /**
         * +! ( n|u a-addr -- )
         *
         * Add n|u to the single-cell number at a-addr.
         */
        {
            name: "+!",
            interpret: function(context)
            {
                var address = context.stack.pop();
                var n = context.stack.pop();

                context.forth.heap[address] += n;
            }
        },
        {
            name: "+LOOP",
            compile: function(context)
            {
                var code = context.definitions.pop().code;

                if (--context.compile)
                {
                    context.definitions.peek().push(function(context)
                    {
                        while (context.rstack.peek() < context.rstack.peekNext())
                        {
                            context.rstack.inc(context.stack.pop());
                            for (var i = 0; i < code.length; ++i)
                            {
                                var token = code[i];

                                if (typeof(token) === "function")
                                {
                                    token(context);
                                } else {
                                    context.stack.push(token);
                                }
                            }
                        }
                        context.rstack.pop();
                        context.rstack.pop();
                    });
                } else {
                    while (context.rstack.peek() < context.rstack.peekNext())
                    {
                        context.rstack.inc(context.stack.pop());
                        for (var i = 0; i < code.length; ++i)
                        {
                            var token = code[i];

                            if (typeof(token) === "function")
                            {
                                token(context);
                            } else {
                                context.stack.push(token);
                            }
                        }
                    }
                    context.rstack.pop();
                    context.rstack.pop();
                }
            }
        },
        /**
         * , ( x -- )
         *
         * Reserve one cell of data space and store x in the cell. If the
         * data-space pointer is aligned when , begins execution, it will
         * remain aligned when , finishes execution. An ambiguous condition
         * exists if the data-space pointer is not aligned prior to execution
         * of ,.
         */
        {
            name: ",",
            interpret: function(context)
            {
                var x = context.stack.pop();

                context.forth.heap[context.forth.heapNext++] = x;
            }
        },
        /**
         * - ( n1|u1 n2|u2 -- n3|u3 )
         *
         * Substract n2|u2 from n1|u1, giving the difference n3|u3.
         */
        {
            name: "-",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 - n2);
            }
        },
        /**
         * . ( n -- )
         *
         * Display n in free field format.
         */
        {
            name: ".",
            interpret: function(context)
            {
                context.forth.output(context.stack.pop().toString(context.base));
            }
        },
        /**
         * Parse ccc delimited by " (double-quote). Append the run-time
         * semantics given below to the current definition.
         *
         * Display ccc.
         */
        {
            name: ".\"",
            interpret: function(context)
            {
                context.forth.output(context.readUntil("\""));
            },
            compile: function(context)
            {
                var s = context.readUntil("\"");

                context.definitions.peek().code.push(function(context)
                {
                    context.forth.output(s);
                });
            }
        },
        /**
         * / ( n1 n2 -- n3 )
         *
         * Divide n1 by n2, giving the single-cell quotient n3. An ambiguous
         * condition exists if n2 is zero. If n1 and n2 differ in sign, the
         * implementation-defined result returned will be the same as that
         * returned by either the phrase >R S>D R> FM/MOD SWAP DROP or the
         * phrase >R S>D R> SM/REM SWAP DROP .
         */
        {
            name: "/",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(Math.floor(n1 / n2));
            }
        },
        /**
         * /MOD ( n1 n2 -- n3 n4 )
         *
         * Divide n1 by n2, giving the single-cell remainder n3 and the
         * single-cell quotient n4. An ambiguous condition exists if n2 is
         * zero. If n1 and n2 differ in sign, the implementation-defined
         * result returned will be the same as that returned by either the
         * phrase >R S>D R> FM/MOD or the phrase >R S>D R> SM/REM .
         */
        {
            name: "/MOD",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();
                
                context.stack.push(n1 % n2, Math.floor(n1 / n2));
            }
        },
        /**
         * 0< ( n -- flag )
         *
         * flag is true if and only if n is less than zero.
         */
        {
            name: "0<",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() < 0 ? 1 : 0);
            }
        },
        /**
         * 0= ( x -- flag )
         *
         * flag is true if and only if x is equal to zero.
         */
        {
            name: "0=",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() == 0 ? 1 : 0);
            }
        },
        /**
         * 1+ ( n1|u1 -- n2|u2 )
         *
         * Add one (1) to n1|u1 giving the sum n2|u2.
         */
        {
            name: "1+",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() + 1);
            }
        },
        /**
         * 1- ( n1|u1 -- n2|u2 )
         *
         * Substract one (1) from n1|u1 giving the difference n2|u2.
         */
        {
            name: "1-",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() - 1);
            }
        },
        /**
         * 2! ( x1 x2 a-addr -- )
         *
         * Store the cell pair x1 x2 at a-addr, with x2 at a-addr and x1 at the
         * next consecutive cell. It is equivalent of the sequence SWAP OVER !
         * CELL+ ! .
         */
        {
            name: "2!",
            interpret: function(context)
            {
                var address = context.stack.pop();
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.forth.heap[address] = x2;
                context.forth.heap[address + 1] = x1;
            }
        },
        /**
         * 2* ( x1 -- x2 )
         *
         * x2 is the result of shifting x1 one bit toward the most-significant
         * bit, filling the vacated least-significant bit with zero.
         */
        {
            name: "2*",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() * 2);
            }
        },
        /**
         * 2/ ( x1 -- x2 )
         *
         * x2 is the result of shifting x1 one bit toward the least-significant
         * bit, leaving the most-significant bit unchanged.
         */
        {
            name: "2/",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() / 2);
            }
        },
        /**
         * 2@ ( a-addr -- x1 x2 )
         *
         * Fetch the cell pair x1 x2 stored at a-addr. x2 is stored at a-addr
         * and x1 at the next consecutive cell. It is equivalent to the
         * sequence DUP CELL+ @ SWAP @ .
         */
        {
            name: "2@",
            interpret: function(context)
            {
                var address = context.stack.pop();

                context.stack.push(context.forth.heap[address + 1],
                                   context.forth.heap[address]);
            }
        },
        /**
         * 2DROP ( x1 x2 -- )
         *
         * Drop cell pair x1 x2 from the stack.
         */
        {
            name: "2DROP",
            interpret: function(context)
            {
                context.stack.pop();
                context.stack.pop();
            }
        },
        /**
         * 2DUP ( x1 x2 -- x1 x2 x1 x2 )
         *
         * Duplicate cell pair x1 x2.
         */
        {
            name: "2DUP",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1, x2, x1, x2);
            }
        },
        /**
         * 2OVER ( x1 x2 x3 x4 -- x1 x2 x3 x4 x1 x2 )
         *
         * Copy cell pair x1 x2 to the top of the stack.
         */
        {
            name: "2OVER",
            interpret: function(context)
            {
                var x4 = context.stack.pop();
                var x3 = context.stack.pop();
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1, x2, x3, x4, x1, x2);
            }
        },
        /**
         * 2SWAP ( x1 x2 x3 x4 -- x3 x4 x1 x2 )
         *
         * Exchange the top two cell pairs.
         */
        {
            name: "2SWAP",
            interpret: function(context)
            {
                var x4 = context.stack.pop();
                var x3 = context.stack.pop();
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x3, x4, x1, x2);
            }
        },
        /**
         * : ( C: "<spaces>name" -- colon-sys )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Create a definition for name, called a colon definition. Enter
         * compilation state and start the current definition, producing
         * colon-sys. Append the initiation semantics given below to the
         * current definition.
         *
         * The execution semantics of name will be determined by the words
         * compiled into the body of the definition. The current definition
         * shall not be findable in the dictionary until it is ended (or until
         * the execution of DOES> in some systems).
         */
        {
            name: ":",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.push({name: name, code: []});
                ++context.compile;
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    context.definitions.push({name: name, code: []});
                    ++context.compile;
                });
            }
        },
        /**
         * ; ( C: colon-sys -- )
         *
         * Append the run-time semantics below to the current definition. End
         * the current definition, allow it to be found in the dictionary and
         * enter interpretation state, consuming colon-sys. If the data-space
         * pointer is not aligned, reserve enough data space to align it.
         */
        {
            name: ";",
            compile: function(context)
            {
                var word = context.definitions.pop();
                var code = word.code;
                var interpret = function(context)
                {
                    for (var i = 0; i < code.length; ++i)
                    {
                        var token = code[i];

                        if (typeof(token) === "function")
                        {
                            token(context);
                        } else {
                            context.stack.push(token);
                        }
                    }
                };

                --context.compile;
                if ("name" in word)
                {
                    word.interpret = interpret;
                    context.forth.dictionary.push(word);
                }
                else if (context.compile)
                {
                    context.definitions.peek().code.push(function(context)
                    {
                        context.stack.push(interpret);
                    });
                } else {
                    context.stack.push(interpret);
                }
            }
        },
        /**
         * < ( n1 n2 -- flag )
         *
         * flag is true if and only if n1 is less than n2.
         */
        {
            name: "<",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 < n2 ? 1 : 0);
            }
        },
        // TODO: "<#"
        /**
         * = ( n1 n2 -- flag )
         *
         * flag is true if and only if x1 is bit-for-bit the same as x2.
         */
        {
            name: "=",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 == n2 ? 1 : 0);
            }
        },
        /**
         * > ( n1 n2 -- flag )
         *
         * flag is true if and only if n1 is greater than n2.
         */
        {
            name: ">",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 > n2 ? 1 : 0);
            }
        },
        /**
         * >BODY ( xt -- a-addr )
         *
         * a-addr is the data-field address corresponding to xt. An ambiguous
         * condition exists if xt is not for a word defined via CREATE.
         */
        {
            name: ">BODY",
            interpret: function(context)
            {
                var xt = context.stack.pop();

                if (typeof(xt) !== "function")
                {
                    throw "not an execution token";
                }
                for (var i = 0; i < context.forth.heap.length; ++i)
                {
                    if (context.forth.heap[i] === xt)
                    {
                        context.stack.push(i);
                        return;
                    }
                }

                throw "not an execution token defined with CREATE";
            }
        },
        // TODO: ">IN"
        // TODO: ">NUMBER"
        /**
         * >R ( x -- )
         *
         * Move x to the return stack.
         */
        {
            name: ">R",
            interpret: function(context)
            {
                context.rstack.push(context.stack.pop());
            }
        },
        /**
         * ?DUP ( x -- 0 | x x )
         *
         * Duplicate x if it is non-zero.
         */
        {
            name: "?DUP",
            interpret: function(context)
            {
                var x = context.stack.peek();

                if (x != 0)
                {
                    context.stack.push(x);
                }
            }
        },
        /**
         * @ ( a-addr -- x )
         *
         * x is the value stored at a-addr.
         */
        {
            name: "@",
            interpret: function(context)
            {
                var address = context.stack.pop();

                context.stack.push(context.forth.heap[address]);
            }
        },
        // TODO: "ABORT"
        // TODO: "ABORT\""
        /**
         * ABS ( n -- u )
         *
         * u is the absolute value of n.
         */
        {
            name: "ABS",
            interpret: function(context)
            {
                context.stack.pushUnsigned(context.stack.pop());
            }
        },
        // TODO: "ACCEPT"
        // TODO: "ALIGN"
        // TODO: "ALIGNED"
        /**
         * ALLOT ( n -- )
         *
         * If n is greater than zero, reserve n address units of data space. If
         * n is less than zero, release |n| address units of data space. If n
         * is zero, leave the data-space pointer unchanged.
         *
         * If the data-space pointer is aligned and n is a multiple of the size
         * of a cell when ALLOT begins execution, it will remain aligned when
         * ALLOT finishes execution.
         *
         * If the data-space pointer is character aligned and n is a multiple
         * of the size of a character when ALLOT begins execution, it will
         * remain character aligned when ALLOT finishes execution.
         */
        {
            name: "ALLOT",
            interpret: function(context)
            {
                var n = context.stack.pop();

                if (n < 0)
                {
                    n = -n;
                    for (var i = 0; i < n; ++i)
                    {
                        context.forth.heap.pop();
                    }
                    context.forth.heapNext -= n;
                }
                else if (n > 0)
                {
                    for (var i = 0; i < n; ++i)
                    {
                        context.forth.heap.push(0);
                    }
                    context.forth.heapNext += n;
                }
            }
        },
        /**
         * AND ( x1 x2 -- x3 )
         *
         * x3 is the bit-by-bit logical and of x1 with x2.
         */
        {
            name: "AND",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1 & x2);
            }
        },
        // TODO: "BASE"
        // TODO: "BEGIN"
        /**
         * BL ( -- char )
         *
         * char is the character value for a space.
         */
        {
            name: "BL",
            interpret: function(context)
            {
                context.stack.push(32);
            }
        },
        /**
         * C! ( char c-addr -- )
         *
         * Store char at c-addr. When character size is smaller than cell size,
         * only the number of low-order bits corresponding to character size
         * are transferred.
         */
        {
            name: "C!",
            interpret: function(context)
            {
                var address = context.stack.pop();
                var char = context.stack.pop();

                context.forth.heap[address] = String.fromCharCode(char);
            }
        },
        /**
         * C, ( char -- )
         *
         * Reserve space for one character in the data space and store char in
         * the space. If the data-space pointer is character aligned when C,
         * begins execution, it will remain character aligned when C, finishes
         * execution. An ambiguous condition exists if the data-space pointer
         * is not character-aligned prior to execution of C,.
         */
        {
            name: "C,",
            interpret: function(context)
            {
                var char = context.stack.pop();

                context.forth.heap.push(String.fromCharCode(char));
                ++context.forth.heapNext;
            }
        },
        /**
         * C@ ( c-addr -- char )
         *
         * Fetch the character stored at c-addr. When the cell size is greater
         * than character size, the unused high-order bits are all zeroes.
         */
        {
            name: "C@",
            interpret: function(context)
            {
                var address = context.stack.pop();

                context.stack.push(context.forth.heap[address].charCodeAt(0));
            }
        },
        /**
         * CELL+ ( a-addr1 -- a-addr2 )
         *
         * Add the size in address units of a cell to a-addr1, giving a-addr2.
         */
        {
            name: "CELL+",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() + 1);
            }
        },
        /**
         * CELLS ( n1 -- n2 )
         * 
         * n2 is the size in address units of n1 cells.
         */
        {
            name: "CELLS",
            interpret: function(context) {}
        },
        /**
         * CHAR ( "<spaces>name" -- char )
         *
         * Skip leading space delimiters. Parse name delimited by a space. Put
         * the value of it's first character onto the stack.
         */
        {
            name: "CHAR",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();

                context.stack.push(name.charCodeAt(0));
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(name.charCodeAt(0));
                });
            }
        },
        /**
         * CHAR+ ( c-addr1 -- c-addr2 )
         *
         * Add the size in address units of a character to c-addr1, giving c-addr2.
         */
        {
            name: "CHAR+",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() + 1);
            }
        },
        /**
         * CHARS ( n1 -- n2 )
         *
         * n2 is the size in address units of n1 characters.
         */
        {
            name: "CHARS",
            interpret: function(context) {}
        },
        /**
         * CONSTANT ( x "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Create a definition for name with the execution semantics defined
         * below.
         *
         * name is referred to as a constant.
         *
         *     name Execution: ( -- x )
         *
         * Place x on the stack. 
         */
        {
            name: "CONSTANT",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var x = context.stack.pop();

                context.forth.dictionary.push(
                {
                    name: name,
                    interpret: function(context)
                    {
                        context.stack.push(x);
                    }
                });
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var x = context.stack.pop();

                    context.forth.dictionary.push(
                    {
                        name: name,
                        interpret: function(context)
                        {
                            context.stack.push(x);
                        }
                    });
                });
            }
        },
        /**
         * COUNT ( c-addr1 -- c-addr2 u )
         *
         * Return the character string specification for the counted string
         * stored at c-addr1. c-addr2 is the address of the first character
         * after c-addr1. u is the contents of the character at c-addr1, which
         * is the length in characters of the string at c-addr2.
         */
        {
            name: "COUNT",
            interpret: function(context)
            {
                var address = context.stack.pop();

                context.stack.push(address + 1, context.forth.heap[address]);
            }
        },
        /**
         * CR ( -- )
         *
         * Cause subsequent output to appear at the beginning of the next line.
         */
        {
            name: "CR",
            interpret: function(context)
            {
                context.forth.output("\n");
            }
        },
        /**
         * CREATE ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Create a definition for name with the execution semantics defined
         * below. If the data-space pointer is not aligned, reserve enough
         * data space to align it. The new data-space pointer defines name's
         * data field. CREATE does not allocate data space in name's data
         * field.
         *
         * name Execution: ( -- a-addr )
         *
         * a-addr is the address of name's data field. The execution semantics
         * of name may be extended by using DOES>.
         */
        {
            name: "CREATE",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var address = context.forth.heap.length - 1;

                context.forth.dictionary.push(
                {
                    name: name,
                    interpret: function(context)
                    {
                        context.stack.push(address);
                    }
                });
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var address = context.forth.heap.length - 1;

                    context.forth.dictionary.push(
                    {
                        name: name,
                        interpret: function(context)
                        {
                            context.stack.push(address);
                        }
                    });
                });
            }
        },
        /**
         * DECIMAL ( -- )
         *
         * Set the numeric conversion radix to ten (decimal).
         */
        {
            name: "DECIMAL",
            interpret: function(context)
            {
                context.base = 10;
            }
        },
        /**
         * DEPTH ( -- +n )
         *
         * +n is the number of single-cell values contained in data stack
         * before +n was placed on the stack.
         */
        {
            name: "DEPTH",
            interpret: function(context)
            {
                context.stack.push(context.stack.depth());
            }
        },
        {
            name: "DO",
            immediate: true,
            interpret: function(context)
            {
                if (context.compile++)
                {
                    context.definitions.peek().code.push(function(context)
                    {
                        var x = context.stack.pop();
                        var y = context.stack.pop();

                        context.rstack.push(y, x);
                    });
                } else {
                    var x = context.stack.pop();
                    var y = context.stack.pop();

                    context.rstack.push(y, x);
                }
                context.definitions.push({code: []});
            }
        },
        // TODO: "DOES"
        /**
         * DROP ( x -- )
         *
         * Remove x from the stack.
         */
        {
            name: "DROP",
            interpret: function(context)
            {
                context.stack.pop();
            }
        },
        /**
         * DUP (x -- x x )
         *
         * Duplicate x.
         */
        {
            name: "DUP",
            interpret: function(context)
            {
                context.stack.push(context.stack.peek());
            }
        },
        {
            name: "ELSE",
            compile: function(context)
            {
                var code = context.definitions.pop().code;

                context.definitions.push({code: []});
                if (context.compile > 1)
                {
                    context.definitions.data[context.definitions.data.length - 2].code.push(function(context)
                    {
                        if (context.stack.pop() != 0)
                        {
                            for (var i = 0; i < code.length; ++i)
                            {
                                var token = code[i];

                                if (typeof(token) === "function")
                                {
                                    token(context);
                                } else {
                                    context.stack.push(token);
                                }
                            }
                            context.stack.push(0);
                        } else {
                            context.stack.push(1);
                        }
                    });
                }
                else if (context.stack.pop() != 0)
                {
                    for (var i = 0; i < code.length; ++i)
                    {
                        var token = code[i];

                        if (typeof(token) === "function")
                        {
                            token(context);
                        } else {
                            context.stack.push(token);
                        }
                    }
                    context.stack.push(0);
                } else {
                    context.stack.push(1);
                }
            }
        },
        /**
         * EMIT ( x -- )
         *
         * If x is a graphic character in the implementation-defined character
         * set, display x. The effect of EMIT for all other values of x is
         * implementation-defined.
         */
        {
            name: "EMIT",
            interpret: function(context)
            {
                context.forth.output(String.fromCharCode(context.stack.pop()));
            }
        },
        // TODO: "ENVIRONMENT?"
        // TODO: "EVALUATE"
        /**
         * EXECUTE ( i*x xt -- j*x )
         *
         * Remove xt from the stack and perform the semantics identified by it.
         * Other stack effects are due to the word EXECUTEd.
         */
        {
            name: "EXECUTE",
            interpret: function(context)
            {
                context.stack.pop().interpret(context);
            }
        },
        // TODO: "EXIT"
        /**
         * FILL ( c-addr u char -- )
         *
         * If u is greater than zero, store char in each of u consecutive
         * characters of memory beginning at c-addr.
         */
        {
            name: "FILL",
            interpret: function(context)
            {
                var char = String.fromCharCode(context.stack.pop());
                var u = context.stack.popUnsigned();
                var address = context.stack.pop();

                for (var i = address; i < address + u; ++i)
                {
                    context.forth.heap[i] = char;
                }
            }
        },
        /**
         * FIND ( c-addr -- c-addr 0 | xt 1 | xt -1 )
         *
         * Find the definition named in the counted string at c-addr. If the
         * definition is not found, return c-addr and zero. If the definition
         * is found, return its execution token xt. If the definition is
         * immediate, also return one (1), otherwise also return minus-one
         * (-1). For a given string, the values returned by FIND while
         * compiling may differ from those returned while not compiling.
         */
        {
            name: "FIND",
            interpret: function(context)
            {
                var address = context.stack.pop();
                var s = context.forth.heap.slice(address + 1, address + 1 + context.forth.heap[address]).join("");
                var word = context.forth.dictionary.find(s);

                if (word)
                {
                    context.stack.push(word.interpret, word.immediate ? 1 : -1);
                } else {
                    context.stack.push(address, 0);
                }
            }
        },
        /**
         * FM/MOD ( d1 n1 -- n2 n3 )
         *
         * Divide d1 by n1, giving the floored quotient n3 and the remainder
         * n2. Input and output stack arguments are signed. An ambiguous
         * condition exists if n1 is zero or if the quotient lies outside
         * the range of a single-cell signed integer.
         */
        {
            name: "FM/MOD",
            interpret: function(context)
            {
                var n1 = stack.context.pop();
                var d1 = stack.context.pop();

                context.stack.push(d1 % n1, Math.floor(d1 / n1));
            }
        },
        /**
         * HERE ( -- addr )
         *
         * addr is the data-space pointer.
         */
        {
            name: "HERE",
            interpret: function(context)
            {
                context.stack.push(context.forth.heap.length);
            }
        },
        // TODO: "HOLD"
        /**
         * I ( -- n|u )
         *
         * n|u is a copy of the current (innermost) loop index. An ambiguous
         * condition exists if the loop control parameters are unavailable.
         */
        {
            name: "I",
            interpret: function(context)
            {
                context.stack.push(context.rstack.peek());
            }
        },
        {
            name: "IF",
            immediate: true,
            interpret: function(context)
            {
                context.definitions.push({code: []});
                ++context.compile;
            }
        },
        /**
         * IMMEDIATE ( -- )
         *
         * Make the most recent definition an immediate word. An ambiguous
         * condition exists if the most recent definition does not have a name.
         */
        {
            name: "IMMEDIATE",
            interpret: function(context)
            {
                if (!("name" in context.forth.dictionary.tail))
                {
                    throw "word does not have a name";
                }
                context.forth.dictionary.tail.immediate = true;
            }
        },
        /**
         * INVERT ( x1 -- x2 )
         *
         * Invert all bits of x1, giving its logical inverse x2.
         */
        {
            name: "INVERT",
            interpret: function(context)
            {
                context.stack.push(~context.stack.pop());
            }
        },
        {
            name: "J",
            interpret: function(context)
            {
                context.stack.push(context.rstack.peekNext());
            }
        },
        // TODO: "KEY"
        // TODO: "LEAVE"
        /**
         * Compilation:
         * LITERAL ( x -- )
         *
         * Append the run-time semantics given below to the current definition.
         *
         * Run-time:
         * ( -- x )
         *
         * Place x on the stack.
         */
        {
            name: "LITERAL",
            compile: function(context)
            {
                var x = context.stack.pop();

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(x);
                });
            }
        },
        {
            name: "LOOP",
            compile: function(context)
            {
                var code = context.definitions.pop().code;

                if (--context.compile)
                {
                    context.definitions.peek().code.push(function(context)
                    {
                        while (context.rstack.peek() < context.rstack.peekNext())
                        {
                            context.rstack.inc(1);
                            for (var i = 0; i < code.length; ++i)
                            {
                                var token = code[i];

                                if (typeof(token) === "function")
                                {
                                    token(context);
                                } else {
                                    context.stack.push(token);
                                }
                            }
                        }
                        context.rstack.pop();
                        context.rstack.pop();
                    });
                } else {
                    while (context.rstack.peek() < context.rstack.peekNext())
                    {
                        context.rstack.inc(1);
                        for (var i = 0; i < code.length; ++i)
                        {
                            var token = code[i];

                            if (typeof(token) === "function")
                            {
                                token(context);
                            } else {
                                context.stack.push(token);
                            }
                        }
                    }
                    context.rstack.pop();
                    context.rstack.pop();
                }
            }
        },
        /**
         * LSHIFT (x1 u -- x2 )
         *
         * Perform a logical left shift of u bit-places on x1, giving x2. Put
         * zeroes into the least significant bits vacated by the shift. An
         * ambiguous condition exists if u is greater than or equal to the
         * number of bits in a cell.
         */
        {
            name: "LSHIFT",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();
                var x1 = context.stack.pop();

                context.stack.push(x1 << u);
            }
        },
        /**
         * M* ( n1 n2 -- d )
         *
         * d is the signed product of n1 times n2.
         */
        {
            name: "M*",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 * n2);
            }
        },
        /**
         * MAX ( n1 n2 -- n3 )
         *
         * n3 is the greater of n1 and n2.
         */
        {
            name: "MAX",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 > n2 ? n1 : n2);
            }
        },
        /**
         * MIN ( n1 n2 -- n3 )
         *
         * n3 is the lesser of n1 and n2.
         */
        {
            name: "MIN",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 < n2 ? n1 : n2);
            }
        },
        /**
         * MOD ( n1 n2 -- n3 )
         *
         * Divide n1 by n2, giving the single-cell remainder n3. An ambiguous
         * condition exists if n2 is zero. If n1 and n2 differ in sign, the
         * implementation-defined result returned will be the same as that
         * returned by either the phrase >R S>D FM/MOD DROP or the phrase
         * >R S>D R> SM/REM DROP.
         */
        {
            name: "MOD",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 % n2);
            }
        },
        /**
         * MOVE ( addr1 addr2 u -- )
         *
         * If u is greater than zero, copy the contents of u consecutive
         * address units at addr1 to the u consecutive address units at
         * addr2. After MOVE completes, the u consecutive address units
         * at addr2 contain exactly what the u consecutive address units
         * at addr1 contained before the move.
         */
        {
            name: "MOVE",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();
                var address2 = context.stack.pop();
                var address1 = context.stack.pop();

                for (var i = 0; i < u; ++i)
                {
                    context.forth.heap[address2 + u] = context.forth.heap[address1 + u];
                }
            }
        },
        /**
         * NEGATE ( n1 -- n2 )
         *
         * Negate n1, giving its arithmetic inverse n2.
         */
        {
            name: "NEGATE",
            interpret: function(context)
            {
                context.stack.push(-context.stack.pop());
            }
        },
        /**
         * OR ( x2 x2 -- x3 )
         *
         * x3 is the bit-by-bit inclusive-or of x1 with x2.
         */
        {
            name: "OR",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();

                context.stack.push(n1 | n2);
            }
        },
        /**
         * OVER ( x1 x2 -- x1 x2 x1 )
         *
         * Place a copy of x1 on top of the stack.
         */
        {
            name: "OVER",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1, x2, x1);
            }
        },
        /**
         * Compilation:
         * POSTPONE ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space. Find
         * name. Append the compilation semantics of name to the current
         * definition. An ambiguous condition exists if name is not found.
         */
        {
            name: "POSTPONE",
            compile: function(context)
            {
                var name = context.nextWordOrFail();
                var word = context.forth.dictionary.findOrFail(name);

                context.definitions.peek().code.push(word.compile ? word.compile : word.interpret);
            }
        },
        /**
         * QUIT ( -- ) ( R: i*x -- )
         *
         * Empty the return stack, store zero in SOURCE-ID if it is present,
         * make the user input device the input source, and enter
         * interpretation state. Do not display a message.
         */
        {
            name: "QUIT",
            interpret: function(context)
            {
                context.rstack.clear();
            }
        },
        /**
         * R> ( -- x )
         *
         * Move x from the return stack to the data stack.
         */
        {
            name: "R>",
            interpret: function(context)
            {
                context.stack.push(context.rstack.pop());
            }
        },
        /**
         * R@ ( -- x )
         *
         * Copy x from the return stack to the data stack.
         */
        {
            name: "R@",
            interpret: function(context)
            {
                context.stack.push(context.rstack.peek());
            }
        },
        /**
         * Compilation: RECURSE ( -- )
         *
         * Append the execution semantics of the current definition to the
         * current definition. An ambiguous condition exists if RECURSE
         * appears in a definition after DOES>.
         */
        {
            name: "RECURSE",
            compile: function(context)
            {
                var data = context.definitions.peek();

                Array.prototype.push.apply(data, data);
            }
        },
        // TODO: "REPEAT"
        /**
         * ROT ( x1 x2 x3 -- x2 x3 x1 )
         *
         * Rotate the top three stack entries.
         */
        {
            name: "ROT",
            interpret: function(context)
            {
                var x3 = context.stack.pop();
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x2, x3, x1);
            }
        },
        /**
         * RSHIFT ( x1 u -- x2 )
         *
         * Perform a logical shift right of u bit-places on x1, giving x2. Put
         * zeroes into the most significant bits vacated by the shift. An
         * ambiguous condition exists if u is greater than or equal to the
         * number of bits in a cell.
         */
        {
            name: "RSHIFT",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();
                var x1 = context.stack.pop();

                context.stack.push(x1 >> u);
            }
        },
        /**
         * Compilation: S" ( "ccc<quote>" -- )
         *
         * Parse ccc delimited by " (double-quote). Append the run-time
         * semantics given below to the current definition.
         *
         * Run-time: ( -- c-addr u )
         *
         * Return c-addr and u describing a string consisting of the
         * characters ccc. A program shall not alter the returned string.
         */
        {
            name: "S\"",
            interpret: function(context)
            {
                var s = context.readUntil("\"");

                context.stack.push(context.forth.heap.length, s.length);
                context.forth.heap.push(s.length);
                for (var i = 0; i < s.length; ++i)
                {
                    context.forth.heap.push(s[i]);
                }
            },
            compile: function(context)
            {
                var s = context.readUntil("\"");

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(context.forth.heap.length, s.length);
                    context.forth.heap.push(s.length);
                    for (var i = 0; i < s.length; ++i)
                    {
                        context.forth.heap.push(s[i]);
                    }
                });
            }
        },
        /**
         * S>D ( n -- d )
         *
         * Convert the number n to the double-cell number d with the same
         * numerical value.
         */
        {
            name: "S>D",
            interpret: function(context) {}
        },
        // TODO: "SIGN"
        // TODO: "SM/REM"
        // TODO: "SOURCE"
        /**
         * SPACE ( -- )
         *
         * Display one space.
         */
        {
            name: "SPACE",
            interpret: function(context)
            {
                context.forth.output(" ");
            }
        },
        /**
         * SPACES ( n -- )
         *
         * If n is greater than zero, display n spaces.
         */
        {
            name: "SPACES",
            interpret: function(context)
            {
                var n = context.stack.pop();
                var result = "";

                for (var i = 0; i < n; ++i)
                {
                    result += " ";
                }
                if (result.length > 0)
                {
                    context.forth.output(result);
                }
            }
        },
        // TODO: "STATE"
        /**
         * SWAP ( x1 x2 -- x2 x1 )
         *
         * Exchange the top two stack items.
         */
        {
            name: "SWAP",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x2, x1);
            }
        },
        {
            name: "THEN",
            compile: function(context)
            {
                var code = context.definitions.pop().code;

                if (--context.compile)
                {
                    context.definitions.peek().code.push(function(context)
                    {
                        if (context.stack.pop() != 0)
                        {
                            for (var i = 0; i < code.length; ++i)
                            {
                                var token = code[i];

                                if (typeof(token) === "function")
                                {
                                    token(context);
                                } else {
                                    context.stack.push(token);
                                }
                            }
                        }
                    });
                }
                else if (context.stack.pop() != 0)
                {
                    for (var i = 0; i < code.length; ++i)
                    {
                        var token = code[i];

                        if (typeof(token) === "function")
                        {
                            token(context);
                        } else {
                            context.stack.push(token);
                        }
                    }
                }
            }
        },
        /**
         * TYPE ( c-addr u -- )
         *
         * If u is greater than zero, display the character string specified by
         * c-addr and u.
         */
        {
            name: "TYPE",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();
                var address = context.stack.pop();

                if (u > 0)
                {
                    context.forth.output(context.forth.heap.slice(address + 1, address + u + 1).join(""));
                }
            }
        },
        /**
         * U. ( u -- )
         *
         * Display u in free field format.
         */
        {
            name: "U.",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();

                context.forth.output(u.toString(context.base));
            }
        },
        /**
         * U< ( u1 u2 -- flag )
         *
         * flag is true if and only if u1 is less than u2.
         */
        {
            name: "U<",
            interpret: function(context)
            {
                var u2 = context.stack.popUnsigned();
                var u1 = context.stack.popUnsigned();

                context.stack.push(u1 < u2 ? 1 : 0);
            }
        },
        /**
         * UM* ( u1 u2 -- ud )
         *
         * Multiply u1 by u2, giving the unsigned double-cell product ud. All
         * values and arithmetic are unsigned.
         */
        {
            name: "UM*",
            interpret: function(context)
            {
                var u2 = context.stack.popUnsigned();
                var u1 = context.stack.popUnsigned();
                
                context.stack.pushUnsigned(u1 * u2);
            }
        },
        /**
         * UM/MOD ( ud u1 -- u2 u3 )
         *
         * Divide ud by u1, giving the quotient u3 and the remainder u2. All
         * values and arithmetic are unsigned. An ambiguous condition exists
         * if u1 is zero or if the quotient lies outside the range of a
         * single-cell unsigned integer.
         */
        {
            name: "UM/MOD",
            interpret: function(context)
            {
                var u1 = context.stack.popUnsigned();
                var ud = context.stack.popUnsigned();

                context.stack.pushUnsigned(ud % u1, ud / u1);
            }
        },
        // TODO: "UNLOOP"
        // TODO: "UNTIL"
        /**
         * VARIABLE ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Create a definition for name with the execution semantics defined
         * below. Reserve one cell of data space at an aligned address.
         *
         * name is referred to as a variable.
         *
	     *     name Execution: ( -- a-addr )
         *
         * a-addr is the address of the reserved cell. A program is responsible
         * for initializing the contents of the reserved cell.
         */
        {
            name: "VARIABLE",
            interpret: function(context)
            {
                var word = context.nextWordOrFail();
                var address = context.forth.heap.length;

                context.forth.heap.push(0);
                context.stack.push(address);
            },
            compile: function(context)
            {
                var word = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var address = context.forth.heap.length;

                    context.forth.heap.push(0);
                    context.stack.push(address);
                });
            }
        },
        // TODO: "WHILE"
        // TODO: "WORD"
        /**
         * XOR ( x1 x2 -- x3 )
         *
         * x3 is the bit-by-bit exclusive-or of x1 with x2.
         */
        {
            name: "XOR",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1 ^ x2);
            }
        },
        /**
         * Compilation: Perform execution semantics given below.
         *
         * Enter interpretation state. [ is an immediate word.
         */
        {
            name: "[",
            immediate: true,
            interpret: function(context)
            {
                --context.compile;
            }
        },
        /**
         * Compilation:
         * ['] ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space. Find
         * name. Append the run-time semantics given below to the current
         * definition.
         *
         * An ambiguous condition exists if name is not found.
         *
         * Run-time: ( -- xt )
         *
         * Place name's execution token xt on the stack. The execution token
         * returned by the compiled phrase ['] X is the same value returned by
         * ' X outside of compilation state.
         */
        {
            name: "[']",
            compile: function(context)
            {
                var name = context.nextWordOrFail();
                var word = context.forth.dictionary.findOrFail(name);

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(word.interpret);
                });
            }
        },
        /**
         * Compilation:
         * [CHAR] ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Append the run-time semantics given below to the current definition.
         *
         * Run-time: ( -- char )
         *
         * Place char, the value of the first character of name, on the stack.
         */
        {
            name: "[CHAR]",
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(name.charCodeAt(0));
                });
            }
        },
        /**
         * ] ( -- )
         *
         * Enter compilation state.
         */
        {
            name: "]",
            interpret: function(context)
            {
                ++context.compile;
            }
        },

        /*
         * Core extension word set.
         */

        // TODO: "#TIB"        
        /**
         * .( ( "ccc<paren>" -- )
         *
         * Parse and display ccc delimited by ) (right parenthesis).
         */
        {
            name: ".(",
            immediate: true,
            interpret: function(context)
            {
                context.forth.output(context.readUntil(")"));
            }
        },
        /**
         * .R ( n1 n2 -- )
         *
         * Display n1 right aligned in a field n2 characters wide. If the
         * number of characters required to display n1 is greater than n2,
         * all digits are displayed with no leading spaces in a field as
         * wide as necessary.
         */
        {
            name: ".R",
            interpret: function(context)
            {
                var n2 = context.stack.pop();
                var n1 = context.stack.pop();
                var s = n1.toString(context.base);

                if (s.length < n2)
                {
                    for (var i = 0; i < s.length - n2; ++i)
                    {
                        s = " " + s;
                    }
                }
                context.forth.output(s);
            }
        },
        /**
         * 0<> ( x -- flag )
         *
         * flag is true if and only if x is not equal to zero.
         */
        {
            name: "0<>",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() != 0 ? 1 : 0);
            }
        },
        /**
         * 0> ( n -- flag )
         *
         * flag is true if and only if n is greater than zero.
         */
        {
            name: "0>",
            interpret: function(context)
            {
                context.stack.push(context.stack.pop() > 0 ? 1 : 0);
            }
        },
        /**
         * 2>R ( x1 x2 -- ) ( R: -- x1 x2 )
         *
         *  Transfer cell pair x1 x2 to the return stack. Semantically
         * equivalent to SWAP >R >R .
         */
        {
            name: "2>R",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.rstack.push(x1, x2);
            }
        },
        /**
         * 2R> ( -- x1 x2 ) ( R: x1 x2 -- )
         *
         * Transfer cell pair x1 x2 from the return stack. Semantically
         * equivalent to R> R> SWAP .
         */
        {
            name: "2R>",
            interpret: function(context)
            {
                var x2 = context.rstack.pop();
                var x1 = context.rstack.pop();

                context.stack.push(x1, x2);
            }
        },
        /**
         * 2R@ ( -- x1 x2 ) ( R: x1 x2 -- x1 x2 )
         *
         * Copy cell pair x1 x2 from the return stack. Semantically equivalent
         * to R> R> 2DUP >R >R SWAP .
         */
        {
            name: "2R@",
            interpret: function(context)
            {
                var x2 = context.rstack.pop();
                var x1 = context.rstack.pop();

                context.stack.push(x1, x2);
                context.rstack.push(x1, x2);
            }
        },
        /**
         * :NONAME ( C:  -- colon-sys ) ( S:  -- xt )
         *
         * Create an execution token xt, enter compilation state and start the
         * current definition, producing colon-sys. Append the initiation
         * semantics given below to the current definition.
         *
         * The execution semantics of xt will be determined by the words
         * compiled into the body of the definition. This definition can be
         * executed later by using xt EXECUTE. 
         */
        {
            name: ":NONAME",
            interpret: function(context)
            {
                context.definitions.push({code: []});
                ++context.compile;
            }
        },
        /**
         * <> ( x1 x2 -- flag )
         *
         * flag is true if and only if x1 is not bit-for-bit the same as x2.
         */
        {
            name: "<>",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x1 != x2 ? 1 : 0);
            }
        },
        // TODO: "?DO"
        // TODO: "AGAIN"
        /**
         * C" ( "ccc<quote>" -- )
         *
         * Parse ccc delimited by " (double-quote) and append the run-time
         * semantics given below to the current definition.
         *
         * Run-time: ( -- c-addr )
         *
         * Return c-addr, a counted string consisting of the characters ccc.
         * A program shall not alter the returned string.
         */
        {
            name: "C\"",
            interpret: function(context)
            {
                var s = context.readUntil("\"");
                var address = context.forth.heap.length;

                context.forth.heap.push(s.length);
                for (var i = 0; i < s.length; ++i)
                {
                    context.forth.heap.push(s[i]);
                }
                context.stack.push(address);
            },
            compile: function(context)
            {
                var s = context.readUntil("\"");

                context.definitions.peek().code.push(function(context)
                {
                    var address = context.forth.heap.length;

                    context.forth.heap.push(s.length);
                    for (var i = 0; i < s.length; ++i)
                    {
                        context.forth.heap.push(s[i]);
                    }
                    context.stack.push(address);
                });
            }
        },
        // TODO: "CASE"
        /**
         * COMPILE, ( xt -- )
         *
         * Append the execution semantics of the definition represented by xt
         * to the execution semantics of the current definition.
         */
        {
            name: "COMPILE,",
            compile: function(context)
            {
                context.definitions.peek().code.push(context.stack.pop());
            }
        },
        // TODO: "CONVERT"
        // TODO: "ENDCASE"
        // TODO: "ENDOF"
        /**
         * ERASE ( addr u -- )
         *
         * If u is greater than zero, clear all bits in each of u consecutive
         * address units of memory beginning at addr .
         */
        {
            name: "ERASE",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();
                var address = context.stack.pop();

                for (var i = 0; i < u; ++i)
                {
                    context.forth.heap[address + u] = 0;
                }
            }
        },
        // TODO: "EXPECT"
        /**
         * FALSE ( -- false )
         *
         * Return a false flag.
         */
        {
            name: "FALSE",
            interpret: function(context)
            {
                context.stack.push(0);
            }
        },
        /**
         * HEX ( -- )
         *
         * Set contents of BASE to sixteen.
         */
        {
            name: "HEX",
            interpret: function(context)
            {
                context.base = 16;
            }
        },
        // TODO: "MARKER"
        /**
         * NIP ( x1 x2 -- x2 )
         *
         * Drop the first item below the top of stack.
         */
        {
            name: "NIP",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x2);
            }
        },
        // TODO: "OF"
        // TODO: "PAD"
        /**
         * PARSE ( char "ccc<char>" -- c-addr u )
         *
         * Parse ccc delimited by the delimiter char.
         *
         * c-addr is the address (within the input buffer) and u is the length
         * of the parsed string. If the parse area was empty, the resulting
         * string has a zero length.
         */
        {
            name: "PARSE",
            interpret: function(context)
            {
                var char = String.fromCharCode(context.stack.pop());
                var s = context.readUntil(char);

                context.stack.push(context.forth.heap.length);
                context.forth.heap.push(s.length);
                for (var i = 0; i < s.length; ++i)
                {
                    context.forth.heap.push(s[i]);
                }
            }
        },
        /**
         * PICK ( xu ... x1 x0 u -- xu ... x1 x0 xu )
         *
         * Remove u. Copy the xu to the top of the stack. An ambiguous
         * condition exists if there are less than u+2 items on the stack
         * before PICK is executed.
         */
        {
            name: "PICK",
            interpret: function(context)
            {
                var u = context.stack.popUnsigned();

                context.stack.push(context.stack.data[context.data.length - u]);
            }
        },
        // TODO: "QUERY"
        // TODO: "REFILL"
        // TODO: "RESTORE-INPUT"
        // TODO: "ROLL"
        // TODO: "SAVE-INPUT"
        // TODO: "SOURCE-ID"
        // TODO: "SPAN"
        // TODO: "TIB"
        /**
         * Interpretation:
         * TO ( x "<spaces>name" -- )
         *
         * Skip leading spaces and parse name delimited by a space. Store x in
         * name. An ambiguous condition exists if name was defined by VALUE.
         *
         * Compilation:
         * TO ( "<spaces>name" -- )
         *
         * Skip leading spaces and parse name delimited by a space. Append the
         * run-time semantics given below to the current definition. An
         * ambiguous condition exists if name was not defined by VALUE.
         *
         * Run-time: ( x -- )
         *
         * Store x in name.
         *
         * Note: An ambiguous condition exists if either POSTPONE or [COMPILE]
         * is applied to TO.
         */
        {
            name: "TO",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var word = context.forth.dictionary.findOrFail(name);
                var x = context.stack.pop();

                if (!word || !word.value)
                {
                    throw "word not defined by VALUE";
                }
                word.interpret = function(context)
                {
                    context.stack.push(x);
                };
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var word = context.forth.dictionary.findOrFail(name);
                    var x = context.stack.pop();

                    if (!word || !word.value)
                    {
                        throw "word not defined by VALUE";
                    }
                    word.interpret = function(context)
                    {
                        context.stack.push(x);
                    };
                });
            }
        },
        /**
         * TRUE ( -- flag )
         *
         * Return a true flag, a single-cell value with all bits set.
         */
        {
            name: "TRUE",
            interpret: function(context)
            {
                context.stack.push(1);
            }
        },
        /**
         * TUCK ( x1 x2 -- x2 x1 x2 )
         *
         * Copy the first (top) stack item below the second stack item.
         */
        {
            name: "TUCK",
            interpret: function(context)
            {
                var x2 = context.stack.pop();
                var x1 = context.stack.pop();

                context.stack.push(x2, x1, x2);
            }
        },
        /**
         * U.R ( u n -- )
         *
         * Display u right aligned in a field n characters wide. If the number
         * of characters required to display u is greater than n, all digits
         * are displayed with no leading spaces in a field as wide as necessary.
         */
        {
            name: "U.R",
            interpret: function(context)
            {
                var n = context.stack.pop();
                var u = context.stack.popUnsigned();
                var s = u.toString(context.base);

                if (s.length < n)
                {
                    for (var i = 0; i < s.length - n; ++i)
                    {
                        s = " " + s;
                    }
                }
                context.forth.output(s);
            }
        },
        /**
         * U> ( u1 u2 -- flag )
         *
         * flag is true if and only if u1 is greater than u2.
         */
        {
            name: "U>",
            interpret: function(context)
            {
                var u2 = context.stack.popUnsigned();
                var u1 = context.stack.popUnsigned();

                context.stack.push(u1 < u2 ? 1 : 0);
            }
        },
        /**
         * UNUSED ( -- u )
         *
         * u is the amount of space remaining in the region addressed by HERE,
         * in address units.
         */
        {
            name: "UNUSED",
            interpret: function(context)
            {
                context.stack.push(0);
            }
        },
        /**
         * VALUE ( x "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space.
         * Create a definition for name with the execution semantics defined
         * below, with an initial value equal to x.
         *
         * name is referred to as a value.
         *
         * name Execution: ( -- x )
         *
         * Place x on the stack. The value of x is that given when name was
         * created, until the phrase x TO name is executed, causing a new
         * value of x to be associated with name.
         */
        {
            name: "VALUE",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var x = context.stack.pop();

                context.forth.dictionary.push(
                {
                    name: name,
                    interpret: function(context)
                    {
                        context.stack.push(x);
                    }
                });
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var x = context.stack.pop();

                    context.forth.dictionary.push(
                    {
                        name: name,
                        interpret: function(context)
                        {
                            context.stack.push(x);
                        }
                    });
                });
            }
        },
        // TODO: "WITHIN"
        /**
         * [COMPILE] ( "<spaces>name" -- )
         *
         * Skip leading space delimiters. Parse name delimited by a space. Find
         * name. If name has other than default compilation semantics, append
         * them to the current definition; otherwise append the execution
         * semantics of name. An ambiguous condition exists if name is not
         * found.
         */
        {
            name: "[COMPILE]",
            compile: function(context)
            {
                var name = context.nextWordOrFail();
                var word = context.forth.dictionary.findOrFail(name);

                context.definitions.peek().push(word.compile ? word.compile : word.interpret);
            }
        },
        /**
         * \ ( "ccc<eol>"" -- )
         *
         * Parse and discard the remainder of the parse area. \ is an immediate
         * word.
         */
        {
            name: "\\",
            immediate: true,
            interpret: function(context)
            {
                while (context.offset < context.source.length)
                {
                    var c = context.source[context.offset++];

                    if (c == '\n' || c == '\r')
                    {
                        return;
                    }
                }
            }
        },

        /*
         * JavaScript word set.
         */

        {
            name: "JS-STRING\"",
            interpret: function(context)
            {
                var s = context.readUntil("\"");

                context.stack.push(s);
            },
            compile: function(context)
            {
                var s = context.readUntil("\"");

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(s);
                });
            }
        },
        {
            name: "JS-VARIABLE",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();

                context.stack.push(window[name]);
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(window[name]);
                });
            }
        },
        {
            name: "JS-PROPERTY@",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var x = context.stack.pop();

                context.stack.push(x[name]);
            },
            compile: function(context)
            {
                var name = context.nextWordOrFail();
                var x = context.stack.pop();

                context.definitions.peek().code.push(function(context)
                {
                    context.stack.push(x[name]);
                });
            }
        },
        {
            name: "JS-PROPERTY!",
            interpret: function(context)
            {
                var name = context.nextWordOrFail();
                var receiver = context.stack.pop();
                var value = context.stack.pop();

                receiver[name] = value;
            },
            interpret: function(context)
            {
                var name = context.nextWordOrFail();

                context.definitions.peek().code.push(function(context)
                {
                    var receiver = context.stack.pop();
                    var value = context.stack.pop();

                    receiver[name] = value;
                });
            }
        },
        {
            name: "JS-CALL",
            interpret: function(context)
            {
                var func = context.stack.pop();
                var receiver = context.stack.pop();
                var n = context.stack.popUnsigned();
                var args = [];

                for (var i = 0; i < n; ++i)
                {
                    args.unshift(context.stack.pop());
                }
                context.stack.push(func.apply(receiver, args));
            }
        }
    ];

    var Stack = function()
    {
        this.data = [];
    };

    Stack.prototype.depth = function()
    {
        return this.data.length;
    };

    Stack.prototype.peek = function()
    {
        return this.data[this.data.length - 1];
    };

    Stack.prototype.peekNext = function()
    {
        return this.data[this.data.length - 2];
    };

    Stack.prototype.push = function()
    {
        Array.prototype.push.apply(this.data, arguments);
    };

    Stack.prototype.pushUnsigned = function()
    {
        for (var i = 0; i < arguments.length; ++i)
        {
            var value = arguments[i];

            this.data.push(value < 0 ? -value : value);
        }
    };

    Stack.prototype.pop = function()
    {
        return this.data.pop();
    };

    Stack.prototype.popUnsigned = function()
    {
        var value = this.data.pop();

        if (value < 0)
        {
            value = -value;
        }

        return value;
    };

    Stack.prototype.clear = function()
    {
        this.data.length = 0;
    };

    Stack.prototype.inc = function(n)
    {
        this.data[this.data.length - 1] += n;
    };

    var Dictionary = function()
    {
        this.words = {};
    };

    Dictionary.prototype.find = function(name)
    {
        return this.words[name];
    };

    Dictionary.prototype.findOrFail = function(name)
    {
        var word = this.words[name];

        if (!word)
        {
            throw "unrecognized word: " + name;
        }

        return word;
    };

    Dictionary.prototype.push = function(word)
    {
        if (this.tail)
        {
            this.tail.next = word;
            word.prev = this.tail;
        } else {
            this.head = word;
        }
        this.tail = word;
        if ("name" in word)
        {
            this.words[word.name] = word;
        }
    };

    var Context = function(forth, source)
    {
        this.forth = forth;
        this.source = source;
        this.offset = 0;
        this.stack = new Stack();
        this.rstack = new Stack();
        this.definitions = new Stack();
        this.compile = 0;
        this.base = 10;
    };

    Context.prototype.nextWord = function()
    {
        var begin = this.offset;
        var end = this.offset;

        while (this.offset < this.source.length)
        {
            if (/\s/.test(this.source[this.offset++]))
            {
                if (end - begin > 0)
                {
                    return this.source.substring(begin, end);
                }
                begin = end = this.offset;
            } else {
                ++end;
            }
        }
        if (end - begin > 0)
        {
            return this.source.substring(begin, end);
        }
    };

    Context.prototype.nextWordOrFail = function()
    {
        var word = this.nextWord();

        if (!word)
        {
            throw "missing word";
        }

        return word;
    };

    Context.prototype.readUntil = function(delimiter)
    {
        var begin = this.offset;
        var end = this.offset;

        while (this.offset < this.source.length)
        {
            if (this.source[this.offset++] === delimiter)
            {
                if (end - begin > 0)
                {
                    return this.source.substring(begin, end);
                } else {
                    return "";
                }
            } else {
                ++end;
            }
        }

        throw "syntax error: missing " + delimiter;
    };

    Context.prototype.interpret = function()
    {
        while (this.offset < this.source.length)
        {
            var name = this.nextWord();
            var word;

            if (!name)
            {
                return;
            }
            if (word = this.forth.dictionary.find(name))
            {
                if (!this.compile || word.immediate)
                {
                    word.interpret(this);
                }
                else if (word.compile)
                {
                    word.compile(this);
                } else {
                    this.definitions.peek().code.push(word.interpret);
                }
            } else {
                var number = parseInt(name, this.base);

                if (isNaN(number))
                {
                    throw "unrecognized word: " + name;
                }
                else if (this.compile)
                {
                    this.definitions.peek().code.push(number);
                } else {
                    this.stack.push(number);
                }
            }
        }
    };

    var Forth = function()
    {
        this.heap = [];
        this.heapNext = -1;
        this.dictionary = new Dictionary();
        for (var i = 0; i < glossary.length; ++i)
        {
            this.dictionary.push(glossary[i]);
        }
    };

    Forth.prototype.createContext = function(source)
    {
        return new Context(this, source);
    };

    Forth.prototype.eval = function(source)
    {
        return this.createContext(source).interpret();
    };

    Forth.prototype.output = function(text)
    {
        var lines = text.split(/\r?\n/);
        var currentLine = this.outputLine;

        for (var i = 0; i < lines.length; ++i)
        {
            if (!currentLine)
            {
                this.outputLine = currentLine = document.createElement("p");
                currentLine.setAttribute("class", "forth-output");
                document.body.appendChild(currentLine);
            }
            currentLine.textContent += lines[i];
        }
        if (/\r?\n$/.test(text))
        {
            this.outputLine = null;
        }
    };

    Forth.prototype.eval = function(source)
    {
        return this.createContext(source).interpret();
    };

    var instance = new Forth();

    window.addEventListener("load", function()
    {
        var load = function(url)
        {
            var request;

            if (window.XMLHttpRequest)
            {
                request = new XMLHttpRequest();
            }
            else if (window.ActiveXObject)
            {
                request = new ActiveXObject("Microsoft.XMLHTTP");
            } else {
                return "";
            }
            request.open("GET", url, false);
            if (request.overrideMimeType)
            {
                request.overrideMimeType("text/plain");
            }
            request.send(null);
            if (request.status == 200)
            {
                return request.responseText;
            } else {
                return "";
            }
        };
        var scripts = document.getElementsByTagName("script");

        for (var i = 0; i < scripts.length; ++i)
        {
            var script = scripts[i];

            if (script.type == "application/forth")
            {
                if (script.src)
                {
                    instance.eval(load(script.src));
                } else {
                    instance.eval(script.innerHTML);
                }
            }
        }
    });

    return instance;
}());
