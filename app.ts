import type { Answer, Result, Sources } from './app.contract.d.ts';

export const grants = '';

type Expense = { id: string; title: string; amount: number; date: string };
type Summary = { total: number; count: number };
let expenses: Expense[] = [];
let next = 1;
let lastDeleted: Expense[] = [];

const sources: Sources = {
  expenses: (): Expense[] => expenses,
  expenseSummary: ([start, end]): Summary => {
    const visible = expenses.filter(
      (expense) => (!start || expense.date >= start) && (!end || expense.date <= end),
    );
    return {
      total: visible.reduce((sum, expense) => sum + expense.amount, 0),
      count: visible.length,
    };
  },
  addExpense: ([title, amount, date]): Result<'addExpense'> => {
    const parsedAmount = Number(amount);
    if (!title || !date || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return { count: expenses.length };
    }
    expenses = [...expenses, { id: String(next++), title, amount: parsedAmount, date }];
    return { count: expenses.length };
  },
  removeExpenses: ([ids]): Result<'removeExpenses'> => {
    lastDeleted = expenses.filter((expense) => ids.includes(expense.id));
    expenses = expenses.filter((expense) => !ids.includes(expense.id));
    return { count: expenses.length };
  },
  removeAll: (): Result<'removeAll'> => {
    lastDeleted = expenses;
    expenses = [];
    return { count: expenses.length };
  },
  undoDelete: (): Result<'undoDelete'> => {
    if (lastDeleted.length > 0) {
      expenses = [...expenses, ...lastDeleted];
      lastDeleted = [];
    }
    return { count: expenses.length };
  },
  updateExpense: ([id, title, amount, date]): Result<'updateExpense'> => {
    const parsedAmount = Number(amount);
    if (!title || !date || !Number.isFinite(parsedAmount) || parsedAmount < 0) {
      return { count: expenses.length };
    }
    expenses = expenses.map((expense) =>
      expense.id === id ? { ...expense, title, amount: parsedAmount, date } : expense,
    );
    return { count: expenses.length };
  },
};
export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
