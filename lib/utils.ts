import type { AppData, FinanceTransaction, Ingredient, Product } from './types';

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

export function monthlyMetrics(data: AppData, key = monthKey()) {
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

export function autoFinanceSourceIds(data: AppData) {
  return [
    ...data.orders.filter(o => o.paid && o.status !== 'Cancelado').map(o => `order:${o.id}`),
    ...data.purchases.map(p => `purchase:${p.id}`),
    ...data.expenses.map(e => `expense:${e.id}`),
  ];
}

export function financeTransactions(data: AppData): FinanceTransaction[] {
  const baseline = new Set(data.finance?.baselineSourceIds || []);
  const auto: FinanceTransaction[] = [];

  data.orders
    .filter(o => o.paid && o.status !== 'Cancelado' && !baseline.has(`order:${o.id}`))
    .forEach(o => auto.push({
      id: `auto-order-${o.id}`,
      date: o.paidAt || o.createdAt,
      createdAt: `${o.paidAt || o.createdAt}T12:00:00`,
      type: 'Entrada',
      description: `Pedido • ${o.quantity}× ${data.products.find(p => p.id === o.productId)?.name || 'Produto'}`,
      person: o.customer,
      amount: orderTotal(o),
      paymentMethod: o.paymentMethod || 'Outro',
      source: 'Pedido',
      sourceId: o.id,
    }));

  data.purchases
    .filter(p => !baseline.has(`purchase:${p.id}`))
    .forEach(p => auto.push({
      id: `auto-purchase-${p.id}`,
      date: p.date,
      createdAt: `${p.date}T12:00:00`,
      type: 'Saída',
      description: p.source === 'NFC-e' ? 'Compra via NFC-e' : 'Compra de mercado',
      person: p.store,
      amount: Number(p.total) || 0,
      paymentMethod: p.paymentMethod || 'Outro',
      source: 'Compra',
      sourceId: p.id,
    }));

  data.expenses
    .filter(e => !baseline.has(`expense:${e.id}`))
    .forEach(e => auto.push({
      id: `auto-expense-${e.id}`,
      date: e.date,
      createdAt: `${e.date}T12:00:00`,
      type: 'Saída',
      description: e.description,
      person: e.payee || e.category,
      amount: Number(e.amount) || 0,
      paymentMethod: e.paymentMethod || 'Outro',
      source: 'Despesa',
      sourceId: e.id,
    }));

  return [...auto, ...(data.finance?.manualTransactions || [])]
    .sort((a,b) => `${b.date}|${b.createdAt}`.localeCompare(`${a.date}|${a.createdAt}`));
}

export function financeBalance(data: AppData) {
  if (!data.finance?.initialBalanceSet) return 0;
  return financeTransactions(data).reduce((balance, tx) => {
    if (tx.type === 'Entrada') return balance + Math.abs(tx.amount);
    if (tx.type === 'Saída') return balance - Math.abs(tx.amount);
    return balance + tx.amount;
  }, data.finance.initialBalance || 0);
}

export function financeMonthSummary(data: AppData, key = monthKey()) {
  const txs = financeTransactions(data).filter(t => t.date.startsWith(key));
  const entries = txs.filter(t => t.type === 'Entrada').reduce((s,t) => s + Math.abs(t.amount), 0);
  const exits = txs.filter(t => t.type === 'Saída').reduce((s,t) => s + Math.abs(t.amount), 0);
  const adjustments = txs.filter(t => t.type === 'Ajuste').reduce((s,t) => s + t.amount, 0);
  return { entries, exits, adjustments, net: entries - exits + adjustments, count: txs.length };
}
