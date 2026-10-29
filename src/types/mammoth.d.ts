declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }

  export function extractRawText(input: { arrayBuffer?: ArrayBuffer; path?: string; buffer?: any }): Promise<MammothResult>;
  export function convertToHtml(input: { arrayBuffer?: ArrayBuffer; path?: string; buffer?: any }): Promise<MammothResult>;
}
