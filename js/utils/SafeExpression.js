/**
 * Safe math expression compiler.
 *
 * Supports:
 * - Numbers (incl. scientific notation)
 * - Variable: t
 * - Constants: pi, e (and Math.PI/Math.E)
 * - Operators: + - * / % **, comparisons, && ||, ternary ?:
 * - Functions: sin/cos/tan/... (and Math.<fn>)
 *
 * This intentionally rejects arbitrary JavaScript to avoid code execution when
 * importing untrusted scene JSON.
 */

const NUMBER_RE = /^(?:\d+\.\d*|\d+|\.\d+)(?:[eE][+-]?\d+)?/;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*/;

const OPERATORS_2 = new Set(['**', '&&', '||', '==', '!=', '<=', '>=']);
const OPERATORS_1 = new Set(['+', '-', '*', '/', '%', '<', '>', '!', '(', ')', ',', '?', ':']);

const PRECEDENCE = {
    '||': 1,
    '&&': 2,
    '==': 3,
    '!=': 3,
    '<': 4,
    '<=': 4,
    '>': 4,
    '>=': 4,
    '+': 5,
    '-': 5,
    '*': 6,
    '/': 6,
    '%': 6,
    '**': 8
};

const RIGHT_ASSOCIATIVE = new Set(['**']);
const UNARY_PRECEDENCE = 7;
const TERNARY_PRECEDENCE = 0;

const baseFunctions = {
    abs: Math.abs,
    acos: Math.acos,
    asin: Math.asin,
    atan: Math.atan,
    atan2: Math.atan2,
    ceil: Math.ceil,
    cos: Math.cos,
    exp: Math.exp,
    floor: Math.floor,
    log: Math.log,
    max: Math.max,
    min: Math.min,
    pow: Math.pow,
    round: Math.round,
    sign: Math.sign,
    sin: Math.sin,
    sqrt: Math.sqrt,
    tan: Math.tan
};

const ALLOWED_FUNCTIONS = Object.fromEntries([
    ...Object.entries(baseFunctions),
    ...Object.entries(baseFunctions).map(([name, fn]) => [`Math.${name}`, fn]),
    [
        'clamp',
        (x, min, max) => {
            const xv = Number(x);
            const minv = Number(min);
            const maxv = Number(max);
            return Math.min(Math.max(xv, minv), maxv);
        }
    ],
    [
        'Math.clamp',
        (x, min, max) => {
            const xv = Number(x);
            const minv = Number(min);
            const maxv = Number(max);
            return Math.min(Math.max(xv, minv), maxv);
        }
    ]
]);

const ALLOWED_CONSTANTS = {
    pi: Math.PI,
    PI: Math.PI,
    'Math.PI': Math.PI,
    e: Math.E,
    E: Math.E,
    'Math.E': Math.E,
    tau: Math.PI * 2,
    TAU: Math.PI * 2
};

const DEFAULT_ALLOWED_VARIABLES = new Set(['t']);
const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function syntaxError(message, position) {
    const err = new SyntaxError(message);
    err.position = position;
    return err;
}

function tokenize(input) {
    const tokens = [];
    let index = 0;

    while (index < input.length) {
        const ch = input[index];
        if (/\s/.test(ch)) {
            index += 1;
            continue;
        }

        const rest = input.slice(index);
        const numMatch = rest.match(NUMBER_RE);
        if (numMatch) {
            const raw = numMatch[0];
            tokens.push({ type: 'number', value: Number(raw), position: index });
            index += raw.length;
            continue;
        }

        const identMatch = rest.match(IDENT_RE);
        if (identMatch) {
            const raw = identMatch[0];
            tokens.push({ type: 'identifier', value: raw, position: index });
            index += raw.length;
            continue;
        }

        const op2 = input.slice(index, index + 2);
        if (OPERATORS_2.has(op2)) {
            tokens.push({ type: 'op', value: op2, position: index });
            index += 2;
            continue;
        }

        if (OPERATORS_1.has(ch)) {
            tokens.push({ type: 'op', value: ch, position: index });
            index += 1;
            continue;
        }

        throw syntaxError(`Unexpected character "${ch}"`, index);
    }

    tokens.push({ type: 'eof', value: '', position: index });
    return tokens;
}

class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.index = 0;
    }

    peek() {
        return this.tokens[this.index];
    }

    consume() {
        const token = this.tokens[this.index];
        this.index += 1;
        return token;
    }

    expectOp(op) {
        const token = this.peek();
        if (token.type === 'op' && token.value === op) return this.consume();
        throw syntaxError(`Expected "${op}"`, token.position);
    }

    expectEof() {
        const token = this.peek();
        if (token.type === 'eof') return;
        throw syntaxError(`Unexpected token "${token.value}"`, token.position);
    }

    parseExpression(minPrecedence = 0) {
        let left = this.parsePrefix();
        left = this.parsePostfix(left);

        while (true) {
            const token = this.peek();
            if (token.type === 'op' && token.value === '?') {
                if (TERNARY_PRECEDENCE < minPrecedence) break;
                this.consume();
                const consequent = this.parseExpression(0);
                this.expectOp(':');
                const alternate = this.parseExpression(0);
                left = { type: 'ternary', condition: left, consequent, alternate, position: token.position };
                continue;
            }

            if (token.type !== 'op' || !(token.value in PRECEDENCE)) break;

            const op = token.value;
            const prec = PRECEDENCE[op];
            if (prec < minPrecedence) break;

            this.consume();
            const nextMin = prec + (RIGHT_ASSOCIATIVE.has(op) ? 0 : 1);
            const right = this.parseExpression(nextMin);
            left = { type: 'binary', op, left, right, position: token.position };
        }

        return left;
    }

    parsePrefix() {
        const token = this.peek();

        if (token.type === 'number') {
            this.consume();
            return { type: 'number', value: token.value, position: token.position };
        }

        if (token.type === 'identifier') {
            this.consume();
            return { type: 'identifier', name: token.value, position: token.position };
        }

        if (token.type === 'op' && (token.value === '+' || token.value === '-' || token.value === '!')) {
            this.consume();
            const expr = this.parseExpression(UNARY_PRECEDENCE);
            return { type: 'unary', op: token.value, expr, position: token.position };
        }

        if (token.type === 'op' && token.value === '(') {
            this.consume();
            const expr = this.parseExpression(0);
            this.expectOp(')');
            return expr;
        }

        throw syntaxError(`Unexpected token "${token.value}"`, token.position);
    }

    parsePostfix(node) {
        while (true) {
            const token = this.peek();
            if (!(token.type === 'op' && token.value === '(')) break;

            if (node.type !== 'identifier') {
                throw syntaxError('Only simple function calls are allowed', token.position);
            }

            this.consume(); // (
            const args = [];
            if (this.peek().type === 'op' && this.peek().value === ')') {
                this.consume();
                node = { type: 'call', callee: node, args, position: token.position };
                continue;
            }

            while (true) {
                args.push(this.parseExpression(0));
                const next = this.peek();
                if (next.type === 'op' && next.value === ',') {
                    this.consume();
                    continue;
                }
                break;
            }
            this.expectOp(')');
            node = { type: 'call', callee: node, args, position: token.position };
        }
        return node;
    }
}

function validateAst(node, allowedVariables = DEFAULT_ALLOWED_VARIABLES) {
    if (!node || typeof node !== 'object') throw new TypeError('Invalid AST node');

    const allowed = allowedVariables instanceof Set ? allowedVariables : DEFAULT_ALLOWED_VARIABLES;

    switch (node.type) {
        case 'number':
            if (!Number.isFinite(node.value)) {
                throw syntaxError('Invalid number literal', node.position ?? 0);
            }
            return;
        case 'identifier': {
            const name = node.name;
            if (allowed.has(name)) return;
            if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return;
            if (Object.prototype.hasOwnProperty.call(ALLOWED_FUNCTIONS, name)) {
                throw syntaxError(`Function "${name}" must be called with ()`, node.position ?? 0);
            }
            throw syntaxError(`Unknown identifier "${name}"`, node.position ?? 0);
        }
        case 'unary':
            if (!['+', '-', '!'].includes(node.op)) {
                throw syntaxError(`Unsupported operator "${node.op}"`, node.position ?? 0);
            }
            validateAst(node.expr, allowed);
            return;
        case 'binary':
            if (!(node.op in PRECEDENCE)) {
                throw syntaxError(`Unsupported operator "${node.op}"`, node.position ?? 0);
            }
            validateAst(node.left, allowed);
            validateAst(node.right, allowed);
            return;
        case 'ternary':
            validateAst(node.condition, allowed);
            validateAst(node.consequent, allowed);
            validateAst(node.alternate, allowed);
            return;
        case 'call': {
            if (node.callee?.type !== 'identifier') {
                throw syntaxError('Only simple function calls are allowed', node.position ?? 0);
            }
            const name = node.callee.name;
            if (!Object.prototype.hasOwnProperty.call(ALLOWED_FUNCTIONS, name)) {
                throw syntaxError(`Unknown function "${name}"`, node.position ?? 0);
            }
            for (const arg of node.args) validateAst(arg, allowed);
            return;
        }
        default:
            throw syntaxError(`Unknown AST node type "${node.type}"`, node.position ?? 0);
    }
}

function toNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return Number(value);
}

function evaluateAst(node, variables, allowedVariables = DEFAULT_ALLOWED_VARIABLES) {
    const allowed = allowedVariables instanceof Set ? allowedVariables : DEFAULT_ALLOWED_VARIABLES;
    switch (node.type) {
        case 'number':
            return node.value;
        case 'identifier': {
            if (allowed.has(node.name)) return toNumber(variables[node.name] ?? 0);
            if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, node.name)) return ALLOWED_CONSTANTS[node.name];
            throw syntaxError(`Unknown identifier "${node.name}"`, node.position ?? 0);
        }
        case 'unary': {
            const v = toNumber(evaluateAst(node.expr, variables, allowed));
            if (node.op === '+') return +v;
            if (node.op === '-') return -v;
            if (node.op === '!') return v === 0 ? 1 : 0;
            throw syntaxError(`Unsupported operator "${node.op}"`, node.position ?? 0);
        }
        case 'binary': {
            const op = node.op;
            if (op === '&&') {
                const left = toNumber(evaluateAst(node.left, variables, allowed));
                return left !== 0 ? toNumber(evaluateAst(node.right, variables, allowed)) : left;
            }
            if (op === '||') {
                const left = toNumber(evaluateAst(node.left, variables, allowed));
                return left !== 0 ? left : toNumber(evaluateAst(node.right, variables, allowed));
            }

            const left = toNumber(evaluateAst(node.left, variables, allowed));
            const right = toNumber(evaluateAst(node.right, variables, allowed));

            if (op === '+') return left + right;
            if (op === '-') return left - right;
            if (op === '*') return left * right;
            if (op === '/') return left / right;
            if (op === '%') return left % right;
            if (op === '**') return Math.pow(left, right);
            if (op === '<') return left < right ? 1 : 0;
            if (op === '<=') return left <= right ? 1 : 0;
            if (op === '>') return left > right ? 1 : 0;
            if (op === '>=') return left >= right ? 1 : 0;
            if (op === '==') return left === right ? 1 : 0;
            if (op === '!=') return left !== right ? 1 : 0;

            throw syntaxError(`Unsupported operator "${op}"`, node.position ?? 0);
        }
        case 'ternary': {
            const cond = toNumber(evaluateAst(node.condition, variables, allowed));
            return cond !== 0
                ? toNumber(evaluateAst(node.consequent, variables, allowed))
                : toNumber(evaluateAst(node.alternate, variables, allowed));
        }
        case 'call': {
            const fnName = node.callee.name;
            const fn = ALLOWED_FUNCTIONS[fnName];
            if (!fn) throw syntaxError(`Unknown function "${fnName}"`, node.position ?? 0);
            const args = node.args.map(arg => toNumber(evaluateAst(arg, variables, allowed)));
            return toNumber(fn(...args));
        }
        default:
            throw syntaxError(`Unknown AST node type "${node.type}"`, node.position ?? 0);
    }
}

function normalizeAllowedVariableNames(variableNames) {
    const set = new Set(DEFAULT_ALLOWED_VARIABLES);
    if (!Array.isArray(variableNames)) return set;
    for (const name of variableNames) {
        if (typeof name !== 'string') continue;
        const trimmed = name.trim();
        if (!trimmed) continue;
        if (!VARIABLE_NAME_RE.test(trimmed)) continue;
        set.add(trimmed);
    }
    return set;
}

export function compileSafeExpression(expression, allowedVariableNames = []) {
    const source = String(expression ?? '').trim();
    if (!source) return () => 0;

    const tokens = tokenize(source);
    const parser = new Parser(tokens);
    const ast = parser.parseExpression(0);
    parser.expectEof();
    const allowed = normalizeAllowedVariableNames(allowedVariableNames);
    validateAst(ast, allowed);

    return (variables = {}) => {
        const input = variables && typeof variables === 'object' ? variables : {};
        const safe = Object.create(null);
        for (const name of allowed) {
            safe[name] = input[name];
        }
        const value = evaluateAst(ast, safe, allowed);
        return Number.isFinite(value) ? value : 0;
    };
}

export function compileSafeMathExpression(expression) {
    const fn = compileSafeExpression(expression, ['t']);
    return (t) => fn({ t });
}
