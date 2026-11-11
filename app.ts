import type { Answer, Result, Sources } from './app.contract.d.ts';

export const grants = '';

type Expense = { id: string; description: string };
let expenses: Expense[] = [];
let next = 1;

const sources: Sources = {
  expenses: (): Expense[] => expenses,
  addExpense: ([description]): Result<'addExpense'> => {
    expenses = [...expenses, { id: String(next++), description }];
    return { count: expenses.length };
  },
  removeExpense: ([id]): Result<'removeExpense'> => {
    expenses = expenses.filter((expense) => expense.id !== id);
    return { count: expenses.length };
  },
};
export const answer: Answer = (source, args, store, storage, native) =>
  sources[source](args, store, storage, native);
