// CoinGecko-гийн дуудлагын төсөв (SPEC §2): нэг ажиллалтад ≤5. Хэтрэх гэвэл алдаа.
// Сарын тооцоо: live цаг тутам 3 → ≈2,232/сар + weekly ≈5 → Demo-гийн 10,000-аас доош.

export class BudgetExceededError extends Error {}

export class CallBudget {
  private calls: string[] = [];

  constructor(
    readonly name: string,
    readonly limit: number,
    private readonly log: (msg: string) => void = console.log,
  ) {}

  /** Дуудлага хийхийн ӨМНӨ дуудна. */
  use(label: string): void {
    if (this.calls.length >= this.limit) {
      throw new BudgetExceededError(`${this.name}: нэг ажиллалтын хязгаар ${this.limit} хэтэрнэ (${label})`);
    }
    this.calls.push(label);
    this.log(`[budget] ${this.name} ${this.calls.length}/${this.limit}: ${label}`);
  }

  get used(): number {
    return this.calls.length;
  }
}
