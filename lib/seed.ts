import type { AppData } from './types';
import { today } from './utils';

const morango = 'ing-morango';
const chocolate = 'ing-chocolate';
const embalagem = 'ing-emb';
const product = 'prod-morango';

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
    { id: 'exp-ads', date: today(), category: 'Anúncios', description: 'Campanha Meta Ads - Morango', amount: 49.99, recurring: false },
  ],
  settings: {
    businessName: 'Sweet Dreams',
    monthlyMei: 0,
    monthlyFixedCosts: 0,
    defaultDeliveryFee: 5,
    cardFeePercent: 3.99,
  },
};
