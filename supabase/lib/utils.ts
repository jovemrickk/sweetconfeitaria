import type { AppData, Ingredient, Product } from './types';

export const brl = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(value) ? value : 0);

export const today = () => new Date().toISOString().slice(0, 10);
export const uid = () => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export function ingredientUnitCost(i: Ingredient) {
  return i.purchaseQuantity > 0 ? i.purchaseCost / i.purchaseQuantity : 0;
}

export function productBatchCost(product: Product, ingredients: Ingredient[]) {
  const recipe = product.recipe.reduce((sum, r) => {
    const ing = ingredients.find((i) => i.id === r.ingredientId);
    return sum + (ing ? ingredientUnitCost(ing) * r.quantity : 0);
  }, 0);
  return recipe + product.packagingCost * product.yield;
}

export function productUnitCost(product: Product, ingredients: Ingredient[]) {
  return product.yield > 0 ? productBatchCost(product, ingredients) / product.yield : 0;
}

export function orderTotal(order: AppData['orders'][number]) {
  return order.unitPrice * order.quantity + order.deliveryFee;
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthlyMetrics(data: AppData) {
  const key = monthKey();
  const validOrders = data.orders.filter((o) => o.createdAt.startsWith(key) && o.status !== 'Cancelado');
  const delivered = validOrders.filter((o) => o.status === 'Entregue');
  const revenue = validOrders.reduce((s, o) => s + orderTotal(o), 0);
  const productRevenue = validOrders.reduce((s, o) => s + o.unitPrice * o.quantity, 0);
  const deliveryRevenue = validOrders.reduce((s, o) => s + o.deliveryFee, 0);
  const cogs = validOrders.reduce((s, o) => {
    const p = data.products.find((p) => p.id === o.productId);
    return s + (p ? productUnitCost(p, data.ingredients) * o.quantity : 0);
  }, 0);
  const expenses = data.expenses.filter((e) => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
  const fixed = data.settings.monthlyMei + data.settings.monthlyFixedCosts;
  const profit = revenue - cogs - expenses - fixed;
  const ads = data.expenses.filter((e) => e.date.startsWith(key) && e.category === 'Anúncios').reduce((s, e) => s + e.amount, 0);
  const adOrders = validOrders.filter((o) => o.source === 'Facebook Ads');
  const adRevenue = adOrders.reduce((s, o) => s + orderTotal(o), 0);
  return {
    orders: validOrders.length,
    delivered: delivered.length,
    revenue,
    productRevenue,
    deliveryRevenue,
    cogs,
    expenses,
    fixed,
    profit,
    avgTicket: validOrders.length ? revenue / validOrders.length : 0,
    ads,
    adOrders: adOrders.length,
    adRevenue,
    cpa: adOrders.length ? ads / adOrders.length : 0,
    roas: ads > 0 ? adRevenue / ads : 0,
  };
}
