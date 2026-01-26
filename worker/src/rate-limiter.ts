import { sleep } from "./utils";

export class RateLimiter {
  private tokens: number;
  private lastRefill = Date.now();

  constructor(private readonly rps: number) {
    this.tokens = rps;
  }

  async acquire(): Promise<void> {
    if (this.rps <= 0) return;

    while (true) {
      const now = Date.now();
      const elapsed = (now - this.lastRefill) / 1000;
      const refill = Math.floor(elapsed * this.rps);

      if (refill > 0) {
        this.tokens = Math.min(this.rps, this.tokens + refill);
        this.lastRefill = now;
      }

      if (this.tokens > 0) {
        this.tokens--;
        return;
      }

      await sleep(50);
    }
  }
}
