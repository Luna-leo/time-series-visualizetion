declare module 'encoding-japanese' {
  export type Encoding = 
    | 'UTF32'
    | 'UTF16'
    | 'UTF16BE'
    | 'UTF16LE'
    | 'UTF8'
    | 'BINARY'
    | 'ASCII'
    | 'JIS'
    | 'EUCJP'
    | 'SJIS'
    | 'UNICODE'
    | 'AUTO';

  export interface ConvertOptions {
    to: Encoding;
    from?: Encoding;
    type?: 'string' | 'arraybuffer' | 'array';
    bom?: boolean | string;
    fallback?: 'html-entity' | 'html-entity-hex' | 'ignore' | 'error';
  }

  export function detect(data: Uint8Array | number[] | string): Encoding | false;
  
  export function convert(
    data: Uint8Array | number[] | string,
    options: ConvertOptions | string
  ): number[];
  
  export function encode(
    data: string,
    encoding: Encoding
  ): number[];
  
  export function decode(
    data: Uint8Array | number[],
    encoding: Encoding
  ): string;
  
  export function urlEncode(data: Uint8Array | number[]): string;
  export function urlDecode(str: string): number[];
  export function base64Encode(data: Uint8Array | number[]): string;
  export function base64Decode(str: string): number[];
  export function codeToString(data: number[]): string;
  export function stringToCode(str: string): number[];
}