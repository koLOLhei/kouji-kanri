/**
 * Type stubs for pdfjs-dist deep imports.
 *
 * pdfjs-dist 4.x ships only `.mjs` ESM modules without per-file `.d.ts` files
 * for the `build/` subpath. Next.js / Webpack 5 supports both `module.mjs`
 * and `module?url` import suffixes, so we declare those module ids here.
 */

declare module "pdfjs-dist/build/pdf.min.mjs" {
  export interface GlobalWorkerOptionsType {
    workerSrc: string;
  }
  export const GlobalWorkerOptions: GlobalWorkerOptionsType;
  export function getDocument(
    src: string | { url: string; httpHeaders?: Record<string, string> },
  ): { promise: Promise<unknown> };
}
