import type { AppData, FinanceState } from './types';
import { today } from './utils';

const morango = 'ing-morango';
const chocolate = 'ing-chocolate';
const embalagem = 'ing-emb';
const product = 'prod-morango';

export const defaultFinance: FinanceState = {
  initialBalance: 0,
  initialBalanceSet: false,
  initialBalanceDate: undefined,
  baselineSourceIds: [],
  manualTransactions: [],
  profitShares: [
    { id: 'share-company', name: 'Empresa', percentage: 40 },
    { id: 'share-nicoly', name: 'Nicoly', percentage: 40 },
    { id: 'share-rick', name: 'Rick', percentage: 20 },
  ],
};

export const seedData: AppData = {
  ingredients: [
    { id: morango, name: 'Morango', unit: 'un', purchaseQuantity: 20, purchaseCost: 24, stock: 20, minStock: 8 },
    { id: chocolate, name: 'Chocolate', unit: 'g', purchaseQuantity: 1000, purchaseCost: 34.9, stock: 1000, minStock: 250 },
    { id: embalagem, name: 'Embalagem individual', unit: 'un', purchaseQuantity: 50, purchaseCost: 20, stock: 50, minStock: 10 },
  ],
  products: [
    {
      id: product,
      name: 'Morango Cravejado',
      salePrice: 15,
      yield: 20,
      packagingCost: 0.4,
      active: true,
      recipe: [
        { ingredientId: morango, quantity: 20 },
        { ingredientId: chocolate, quantity: 500 },
      ],
    },
  ],
  orders: [],
  batches: [],
  purchases: [],
  expenses: [
    { id: 'exp-ads', date: today(), category: 'Anúncios', description: 'Campanha Meta Ads - Morango', amount: 49.99, recurring: false, paymentMethod: 'Outro', payee: 'Meta Ads' },
  ],
  finance: defaultFinance,
  settings: {
    businessName: 'Sweet Dreams',
    monthlyMei: 0,
    monthlyFixedCosts: 0,
    defaultDeliveryFee: 5,
    cardFeePercent: 3.99,
  },
};

export function normalizeAppData(input: unknown): AppData {
  const raw = input && typeof input === 'object' ? input as Partial<AppData> : {};
  const finance = raw.finance && typeof raw.finance === 'object' ? raw.finance : defaultFinance;

  return {
    ingredients: Array.isArray(raw.ingredients) ? raw.ingredients : seedData.ingredients,
    products: Array.isArray(raw.products) ? raw.products : seedData.products,
    orders: Array.isArray(raw.orders) ? raw.orders.map(o => ({...o, paymentMethod:o.paymentMethod || 'Outro'})) : [],
    batches: Array.isArray(raw.batches) ? raw.batches : [],
    purchases: Array.isArray(raw.purchases) ? raw.purchases.map(p => ({...p, paymentMethod:p.paymentMethod || 'Outro'})) : [],
    expenses: Array.isArray(raw.expenses) ? raw.expenses.map(e => ({...e, paymentMethod:e.paymentMethod || 'Outro'})) : [],
    finance: {
      initialBalance: Number(finance.initialBalance) || 0,
      initialBalanceSet: Boolean(finance.initialBalanceSet),
      initialBalanceDate: finance.initialBalanceDate,
      baselineSourceIds: Array.isArray(finance.baselineSourceIds) ? finance.baselineSourceIds : [],
      manualTransactions: Array.isArray(finance.manualTransactions) ? finance.manualTransactions : [],
      profitShares: Array.isArray(finance.profitShares) && finance.profitShares.length
        ? finance.profitShares
        : defaultFinance.profitShares,
    },
    settings: {
      ...seedData.settings,
      ...(raw.settings || {}),
    },
  };
}
