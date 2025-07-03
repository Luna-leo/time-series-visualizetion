import * as Encoding from 'encoding-japanese';

export type SupportedEncoding = 'UTF8' | 'SJIS' | 'EUCJP' | 'JIS' | 'AUTO';

/**
 * ファイルのエンコーディングを検出する
 * @param buffer - ファイルのArrayBuffer
 * @returns 検出されたエンコーディング
 */
export function detectEncoding(buffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(buffer);
  const detectedEncoding = Encoding.detect(uint8Array);
  
  if (!detectedEncoding) {
    console.warn('エンコーディングを自動検出できませんでした。UTF-8として処理します。');
    return 'UTF8';
  }
  
  return detectedEncoding as string;
}

/**
 * バッファをUTF-8文字列に変換する
 * @param buffer - 変換するArrayBuffer
 * @param encoding - ソースエンコーディング（省略時は自動検出）
 * @returns UTF-8文字列
 */
export function convertToUTF8(buffer: ArrayBuffer, encoding?: SupportedEncoding): string {
  const uint8Array = new Uint8Array(buffer);
  
  try {
    // エンコーディングが指定されていない場合は自動検出
    const sourceEncoding = encoding || detectEncoding(buffer);
    
    // UTF-8に変換
    const unicodeArray = Encoding.convert(uint8Array, {
      to: 'UNICODE',
      from: sourceEncoding as any
    });
    
    // Unicode配列を文字列に変換
    return Encoding.codeToString(unicodeArray);
  } catch (error) {
    console.error('エンコーディング変換エラー:', error);
    // フォールバック: TextDecoderでUTF-8として読み込みを試みる
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(uint8Array);
  }
}

/**
 * 文字列が有効なUTF-8かどうかをチェックする
 * @param text - チェックする文字列
 * @returns 有効なUTF-8の場合true
 */
export function isValidUTF8(text: string): boolean {
  try {
    // 文字化けの一般的なパターンをチェック
    const invalidPatterns = [
      /[\ufffd]/g,      // 置換文字
      /[\x00-\x08]/g,   // 制御文字（タブとLF/CRを除く）
      /[\x0b-\x0c]/g,   // 制御文字
      /[\x0e-\x1f]/g,   // 制御文字
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(text)) {
        return false;
      }
    }
    
    // 日本語文字が含まれているかチェック（オプション）
    const hasJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(text);
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * ファイルを指定されたエンコーディングで読み込む
 * @param file - 読み込むファイル
 * @param encoding - エンコーディング（省略時は自動検出）
 * @returns Promise<string> UTF-8文字列
 */
export async function readFileWithEncoding(file: File, encoding?: SupportedEncoding): Promise<string> {
  const buffer = await file.arrayBuffer();
  return convertToUTF8(buffer, encoding);
}

/**
 * CSVファイル用の特別な読み込み関数
 * BOMの処理も含む
 * @param file - CSVファイル
 * @param encoding - エンコーディング（省略時は自動検出）
 * @returns Promise<string> UTF-8文字列（BOM除去済み）
 */
export async function readCSVFileWithEncoding(file: File, encoding?: SupportedEncoding): Promise<string> {
  const text = await readFileWithEncoding(file, encoding);
  
  // BOMを除去
  const bomRegex = /^\uFEFF/;
  return text.replace(bomRegex, '');
}

/**
 * エンコーディング名を人間が読みやすい形式に変換
 * @param encoding - エンコーディング名
 * @returns 表示用のエンコーディング名
 */
export function getEncodingDisplayName(encoding: string): string {
  const displayNames: Record<string, string> = {
    'UTF8': 'UTF-8',
    'SJIS': 'Shift-JIS',
    'EUCJP': 'EUC-JP',
    'JIS': 'ISO-2022-JP',
    'AUTO': '自動検出'
  };
  
  return displayNames[encoding] || encoding;
}