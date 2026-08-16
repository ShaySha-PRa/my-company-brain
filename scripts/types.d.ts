declare module "bcryptjs" {
  const bcrypt: {
    hash(value: string, rounds: number): Promise<string>;
    compare(value: string, digest: string): Promise<boolean>;
  };
  export default bcrypt;
}

declare module "@playwright/test" {
  export type BrowserContextOptions = Record<string, unknown>;
  export const chromium: any;
}
