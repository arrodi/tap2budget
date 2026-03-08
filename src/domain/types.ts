export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Salary'
  | 'Freelance'
  | 'Business'
  | 'Investment'
  | 'Gift'
  | 'Refund'
  | 'Bonus'
  | 'Interest'
  | 'Food'
  | 'Transport'
  | 'Housing'
  | 'Subscription'
  | 'Health'
  | 'Entertainment'
  | 'Shopping'
  | 'Education'
  | 'Other';

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  category: TransactionCategory;
  name: string;
  recurrence?: 'none' | 'weekly' | 'biweekly' | 'monthly';
  date: string; // ISO timestamp
  createdAt: string; // ISO
};

export type MonthlyTotals = {
  income: number;
  expense: number;
  net: number;
};

export type Budget = {
  id: string;
  category: TransactionCategory;
  amount: number;
  monthKey: string; // YYYY-MM
};

export type RecurringRule = {
  id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  dayOfMonth: number;
  frequency: 'monthly' | 'weekly' | 'biweekly';
  label: string;
  active: boolean;
};

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'RUB' | 'UAH';
