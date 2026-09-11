// Math utilities for financial calculations
export function calculatePercentageAmount(total: number, percentage: number): number {
  return (total * percentage) / 100;
}

export function calculateSavings(income: number, expenses: number): number {
  return Math.max(0, income - expenses);
}

export function calculateSavingsRate(income: number, savings: number): number {
  return income > 0 ? (savings / income) * 100 : 0;
}

export function calculateMonthlyAverage(
  amounts: number[],
  months: number
): number {
  if (amounts.length === 0 || months === 0) return 0;
  const total = amounts.reduce((a, b) => a + b, 0);
  return total / months;
}

// Split calculations
export interface SplitResult {
  users: Record<string, number>;
  total: number;
}

export type SplitType = "50/50" | "percentage" | "fixed";

const SPLIT_TOLERANCE = 0.01;

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function sumValues(values: number[]): number {
  return roundMoney(values.reduce((acc, current) => acc + current, 0));
}

function assertValidUserIds(userIds: string[]) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new Error("Se requiere al menos un usuario para calcular el split");
  }

  const uniqueCount = new Set(userIds).size;
  if (uniqueCount !== userIds.length) {
    throw new Error("Hay IDs de usuario duplicados en el split");
  }
}

function distributeRoundingDiff(users: Record<string, number>, targetAmount: number): Record<string, number> {
  const keys = Object.keys(users);
  if (keys.length === 0) return users;

  const currentTotal = sumValues(Object.values(users));
  const diff = roundMoney(targetAmount - currentTotal);

  if (Math.abs(diff) >= SPLIT_TOLERANCE) {
    const firstKey = keys[0];
    users[firstKey] = roundMoney(users[firstKey] + diff);
  }

  return users;
}

export function calculateSplit(
  amount: number,
  splitType: SplitType,
  splitData: Record<string, number>,
  userIds: string[]
): SplitResult {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("El monto del split debe ser mayor a 0");
  }

  assertValidUserIds(userIds);

  const result: SplitResult = {
    users: {},
    total: 0,
  };

  if (splitType === "50/50") {
    const perPerson = roundMoney(amount / userIds.length);
    userIds.forEach((id) => {
      result.users[id] = perPerson;
    });
    result.users = distributeRoundingDiff(result.users, amount);
  } else if (splitType === "percentage") {
    const percentageTotal = sumValues(userIds.map((id) => splitData[id] || 0));

    if (Math.abs(percentageTotal - 100) >= SPLIT_TOLERANCE) {
      throw new Error("En split por porcentaje, la suma debe ser 100%");
    }

    userIds.forEach((id) => {
      const percentage = splitData[id] || 0;

      if (!Number.isFinite(percentage) || percentage < 0) {
        throw new Error("El porcentaje por usuario debe ser un número >= 0");
      }

      result.users[id] = roundMoney(calculatePercentageAmount(amount, percentage));
    });

    result.users = distributeRoundingDiff(result.users, amount);
  } else if (splitType === "fixed") {
    userIds.forEach((id) => {
      const fixedAmount = splitData[id] || 0;

      if (!Number.isFinite(fixedAmount) || fixedAmount < 0) {
        throw new Error("El monto fijo por usuario debe ser un número >= 0");
      }

      result.users[id] = roundMoney(fixedAmount);
    });

    const fixedTotal = sumValues(Object.values(result.users));
    if (Math.abs(fixedTotal - amount) >= SPLIT_TOLERANCE) {
      throw new Error("En split fijo, la suma de montos debe ser igual al monto total");
    }
  }

  result.total = sumValues(Object.values(result.users));
  return result;
}

// Compound interest / Goal projection
export function calculateMonthsToGoal(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number
): number {
  if (monthlyContribution <= 0) return Infinity;
  return Math.ceil((targetAmount - currentAmount) / monthlyContribution);
}

export function projectGoalDate(
  currentAmount: number,
  targetAmount: number,
  monthlyContribution: number,
  startDate: Date = new Date()
): Date {
  const months = calculateMonthsToGoal(
    currentAmount,
    targetAmount,
    monthlyContribution
  );
  if (months === Infinity) return new Date("2099-12-31");

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + months);
  return date;
}


