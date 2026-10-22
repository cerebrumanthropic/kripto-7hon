# CoinGecko-гийн дуудлагын төсөв (SPEC §2): нэг ажиллалтад ≤5. Хэтрэх гэвэл алдаа.
# Сарын тооцоо: live цаг тутам 3 → ≈2,232/сар + weekly ≈5 → Demo-гийн 10,000-аас доош.
from collections.abc import Callable


class BudgetExceededError(Exception):
    pass


class CallBudget:
    def __init__(self, name: str, limit: int, log: Callable[[str], None] = print) -> None:
        self.name = name
        self.limit = limit
        self._log = log
        self._calls: list[str] = []

    def use(self, label: str) -> None:
        """Дуудлага хийхийн ӨМНӨ дуудна."""
        if len(self._calls) >= self.limit:
            raise BudgetExceededError(f"{self.name}: нэг ажиллалтын хязгаар {self.limit} хэтэрнэ ({label})")
        self._calls.append(label)
        self._log(f"[budget] {self.name} {len(self._calls)}/{self.limit}: {label}")

    @property
    def used(self) -> int:
        return len(self._calls)
