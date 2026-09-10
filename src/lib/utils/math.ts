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

export function calculateSplit(
  amount: number,
  splitType: "50/50" | "percentage" | "fixed",
  splitData: Record<string, number>,
  userIds: string[]
): SplitResult {
  const result: SplitResult = {
    users: {},
    total: 0,
  };

  if (splitType === "50/50") {
    const perPerson = amount / userIds.length;
    userIds.forEach((id) => {
      result.users[id] = perPerson;
    });
  } else if (splitType === "percentage") {
    userIds.forEach((id) => {
      const percentage = splitData[id] || 0;
      result.users[id] = calculatePercentageAmount(amount, percentage);
    });
  } else if (splitType === "fixed") {
    userIds.forEach((id) => {
      result.users[id] = splitData[id] || 0;
    });
  }

  result.total = Object.values(result.users).reduce((a, b) => a + b, 0);
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

