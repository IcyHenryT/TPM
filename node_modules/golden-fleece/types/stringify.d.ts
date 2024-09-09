import { StringifierOptions } from './interfaces';
export declare function stringify(value: any, options?: StringifierOptions): string;
export declare function stringifyString(str: string, quote: string): string;
export declare function stringifyProperty(key: string, value: any, quote: string, indentation: string, indentString: string, newlines: boolean): string;
export declare function stringifyValue(value: any, quote: string, indentation: string, indentString: string, newlines: boolean): string;
