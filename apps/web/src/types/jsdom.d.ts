declare module "jsdom" {
  export class VirtualConsole {
    forwardTo(
      destination: Console,
      options?: { jsdomErrors?: boolean | string[] },
    ): this;
  }

  export class JSDOM {
    constructor(html?: string, options?: { url?: string; virtualConsole?: VirtualConsole });
    window: Window & typeof globalThis;
  }
}
