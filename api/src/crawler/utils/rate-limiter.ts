export class RateLimiter {
  private timestamps: number[] = [];

  constructor(private maxCallsPerMinute: number) {}

  async limit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // 移除一分鐘前的記錄
    this.timestamps = this.timestamps.filter(
      (timestamp) => timestamp > oneMinuteAgo,
    );

    if (this.timestamps.length >= this.maxCallsPerMinute) {
      const earliest = this.timestamps[0];
      const waitTime = earliest + 60_000 - now;
      await this.sleep(waitTime);
    }

    this.timestamps.push(Date.now());
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
