import { ParserOptions, Value, ArrayExpression, ObjectExpression, Literal, Property, Identifier, Comment } from './interfaces';
export declare function parse(str: string, opts?: ParserOptions): Value;
export default class Parser {
    str: string;
    index: number;
    value: Value;
    onComment: (comment: Comment) => void;
    onValue: (value: Value) => void;
    constructor(str: string, opts?: ParserOptions);
    allowWhitespaceOrComment(): void;
    error(message: string, index?: number): void;
    eat(str: string, required?: boolean): string;
    peek(): string;
    read(pattern: RegExp): string;
    readUntil(pattern: RegExp): string;
    readArray(): ArrayExpression;
    readBoolean(): Literal;
    readNull(): Literal;
    readLiteral(): Literal;
    readNumber(): Literal;
    readObject(): ObjectExpression;
    readProperty(): Property;
    readIdentifier(): Identifier;
    readPropertyKey(): Identifier | Literal;
    readString(): Literal;
    readValue(): Value;
}
