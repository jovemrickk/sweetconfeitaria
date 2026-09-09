import type { AppData, FinanceState, Ingredient, Product, StockItemCategory, Unit } from './types';
import { today } from './utils';

const ids = {
  morango: 'ing-morango',
  chocolate: 'ing-chocolate',
  embalagem: 'ing-emb',
  leiteCondensado: 'ing-leite-condensado',
  cremeLeite: 'ing-creme-leite',
  leitePo: 'ing-leite-po',
  manteiga: 'ing-manteiga',
  acucar: 'ing-acucar',
  vinagre: 'ing-vinagre',
  corante: 'ing-corante',
  product: 'prod-morango',
};

const STOCK_MODEL_VERSION = 2;

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
    { id: ids.leiteCondensado, name: 'Leite condensado', unit: 'g', purchaseQuantity: 395, purchaseCost: 7.29, stock: 0, minStock: 395, packageLabel: 'caixa', defaultPurchasePackages: 1, packageNote: '1 caixa = 395 g' },
    { id: ids.cremeLeite, name: 'Creme de leite', unit: 'g', purchaseQuantity: 200, purchaseCost: 2.99, stock: 0, minStock: 200, packageLabel: 'caixa', defaultPurchasePackages: 1, packageNote: '1 caixa = 200 g' },
    { id: ids.leitePo, name: 'Leite em pó', unit: 'g', purchaseQuantity: 400, purchaseCost: 0, stock: 0, minStock: 50, packageLabel: 'pacote', defaultPurchasePackages: 1, packageNote: '1 pacote = 400 g' },
    { id: ids.manteiga, name: 'Manteiga', unit: 'g', purchaseQuantity: 200, purchaseCost: 0, stock: 0, minStock: 20, packageLabel: 'pote/tablete', defaultPurchasePackages: 1, packageNote: '1 pote/tablete = 200 g' },
    { id: ids.acucar, name: 'Açúcar', unit: 'g', purchaseQuantity: 1000, purchaseCost: 0, stock: 0, minStock: 360, packageLabel: 'pacote', defaultPurchasePackages: 1, packageNote: '1 pacote = 1 kg' },
    { id: ids.vinagre, name: 'Vinagre Branco', unit: 'ml', purchaseQuantity: 750, purchaseCost: 0, stock: 0, minStock: 30, packageLabel: 'garrafa', defaultPurchasePackages: 1, packageNote: '1 garrafa = 750 ml • duplo álcool' },
    { id: ids.corante, name: 'Corante vermelho', unit: 'g', purchaseQuantity: 25, purchaseCost: 0, stock: 0, minStock: 1, packageLabel: 'potinho', defaultPurchasePackages: 1, packageNote: '1 potinho = 25 g' },
    { id: ids.chocolate, name: 'Chocolate', unit: 'g', purchaseQuantity: 350, purchaseCost: 24.90, stock: 0, minStock: 350, packageLabel: 'pacote', defaultPurchasePackages: 1, packageNote: '1 pacote = 350 g • usa o pacote inteiro' },
    { id: ids.morango, name: 'Morango', unit: 'un', purchaseQuantity: 5, purchaseCost: 8, stock: 0, minStock: 10, packageLabel: 'bandeja', defaultPurchasePackages: 2, packageNote: '~4–6 morangos bons por bandeja • compra padrão: 2 bandejas • sobras ficam no estoque' },
    { id: ids.embalagem, name: 'Embalagem individual', unit: 'un', purchaseQuantity: 100, purchaseCost: 27.80, stock: 100, minStock: 10, packageLabel: 'pacote', defaultPurchasePackages: 1, packageNote: '1 pacote = 100 potinhos' },
  ],
  products: [
    {
      id: ids.product,
      name: 'Morango Cravejado',
      salePrice: 15,
      yield: 10,
      packagingCost: 0,
      active: true,
      recipe: [
        { ingredientId: ids.leiteCondensado, quantity: 395 },
        { ingredientId: ids.cremeLeite, quantity: 200 },
        { ingredientId: ids.leitePo, quantity: 50 },
        { ingredientId: ids.manteiga, quantity: 20 },
        { ingredientId: ids.acucar, quantity: 360 },
        { ingredientId: ids.vinagre, quantity: 30 },
        { ingredientId: ids.corante, quantity: 1 },
        { ingredientId: ids.chocolate, quantity: 350 },
        { ingredientId: ids.morango, quantity: 10 },
        { ingredientId: ids.embalagem, quantity: 10 },
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
    stockModelVersion: STOCK_MODEL_VERSION,
  },
};

const clean = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

const categoryForName = (name: string): StockItemCategory => {
  const n = clean(name);
  if (/(embal|pote|potinho|tampa|sacola|saquinho|adesivo|caixa para|forma|copinho|copo)/.test(n)) return 'Embalagem';
  if (/(palito|colher descart|guardanapo|fita|lac[rç]e|etiqueta)/.test(n)) return 'Insumo';
  return 'Ingrediente';
};

type IngredientPreset = {
  unit: Unit;
  purchaseQuantity: number;
  packageLabel: string;
  defaultPurchasePackages: number;
  packageNote: string;
  minStock: number;
  forcePurchaseCost?: number;
};

const presetFor = (name: string): IngredientPreset | null => {
  const n = clean(name);
  if (n === 'leite condensado') return { unit:'g', purchaseQuantity:395, packageLabel:'caixa', defaultPurchasePackages:1, packageNote:'1 caixa = 395 g', minStock:395 };
  if (n === 'creme de leite') return { unit:'g', purchaseQuantity:200, packageLabel:'caixa', defaultPurchasePackages:1, packageNote:'1 caixa = 200 g', minStock:200 };
  if (n === 'leite em po') return { unit:'g', purchaseQuantity:400, packageLabel:'pacote', defaultPurchasePackages:1, packageNote:'1 pacote = 400 g', minStock:50 };
  if (n === 'manteiga') return { unit:'g', purchaseQuantity:200, packageLabel:'pote/tablete', defaultPurchasePackages:1, packageNote:'1 pote/tablete = 200 g', minStock:20 };
  if (n === 'acucar') return { unit:'g', purchaseQuantity:1000, packageLabel:'pacote', defaultPurchasePackages:1, packageNote:'1 pacote = 1 kg', minStock:360 };
  if (n === 'vinagre branco') return { unit:'ml', purchaseQuantity:750, packageLabel:'garrafa', defaultPurchasePackages:1, packageNote:'1 garrafa = 750 ml • duplo álcool', minStock:30 };
  if (n === 'corante vermelho') return { unit:'g', purchaseQuantity:25, packageLabel:'potinho', defaultPurchasePackages:1, packageNote:'1 potinho = 25 g', minStock:1 };
  if (n === 'chocolate' || n === 'chocolate branco') return { unit:'g', purchaseQuantity:350, packageLabel:'pacote', defaultPurchasePackages:1, packageNote:'1 pacote = 350 g • usa o pacote inteiro', minStock:350, forcePurchaseCost:24.90 };
  if (n === 'morango') return { unit:'un', purchaseQuantity:5, packageLabel:'bandeja', defaultPurchasePackages:2, packageNote:'~4–6 morangos bons por bandeja • compra padrão: 2 bandejas • sobras ficam no estoque', minStock:10, forcePurchaseCost:8 };
  if (n === 'embalagem individual') return { unit:'un', purchaseQuantity:100, packageLabel:'pacote', defaultPurchasePackages:1, packageNote:'1 pacote = 100 potinhos', minStock:10, forcePurchaseCost:27.80 };
  return null;
};

function migrateIngredient(i: Ingredient): Ingredient {
  const preset = presetFor(i.name);
  if (!preset) return i;

  // Dados antigos de açúcar/manteiga/etc. usavam "1 un" para dizer "1 pacote".
  // Na migração, convertemos esse estoque para g/ml uma única vez.
  const shouldConvertPackageStock = i.unit === 'un' && preset.unit !== 'un';
  const stock = shouldConvertPackageStock ? Number(i.stock || 0) * preset.purchaseQuantity : Number(i.stock || 0);
  const minStock = shouldConvertPackageStock ? Number(i.minStock || 0) * preset.purchaseQuantity : Number(i.minStock || 0);

  return {
    ...i,
    unit: preset.unit,
    purchaseQuantity: preset.purchaseQuantity,
    purchaseCost: preset.forcePurchaseCost ?? Number(i.purchaseCost || 0),
    stock,
    minStock: minStock > 0 ? minStock : preset.minStock,
    packageLabel: preset.packageLabel,
    defaultPurchasePackages: preset.defaultPurchasePackages,
    packageNote: preset.packageNote,
  };
}

function migrateMainRecipe(products: Product[], ingredients: Ingredient[]): Product[] {
  const byName = new Map(ingredients.map(i => [clean(i.name), i.id]));
  const findId = (...names: string[]) => names.map(n => byName.get(clean(n))).find(Boolean);
  const recipeDefs: Array<[string | undefined, number]> = [
    [findId('Leite condensado'), 395],
    [findId('Creme de leite'), 200],
    [findId('Leite em pó'), 50],
    [findId('Manteiga'), 20],
    [findId('Açúcar'), 360],
    [findId('Vinagre Branco'), 30],
    [findId('Corante vermelho'), 1],
    [findId('Chocolate', 'Chocolate branco'), 350],
    [findId('Morango'), 10],
    [findId('Embalagem individual'), 10],
  ];

  const recipe = recipeDefs
    .filter((x): x is [string, number] => Boolean(x[0]))
    .map(([ingredientId, quantity]) => ({ingredientId, quantity}));

  return products.map((p, index) => {
    const isMain = clean(p.name).includes('morango cravejado') || (index === 0 && products.length === 1);
    if (!isMain || !recipe.length) return p;
    return {...p, yield:10, packagingCost:0, recipe};
  });
}

export function normalizeAppData(input: unknown): AppData {
  const raw = input && typeof input === 'object' ? input as Partial<AppData> : {};
  const finance = raw.finance && typeof raw.finance === 'object' ? raw.finance : defaultFinance;
  const oldVersion = Number(raw.settings?.stockModelVersion || 0);

  let ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : seedData.ingredients;
  let products = Array.isArray(raw.products) ? raw.products : seedData.products;

  if (oldVersion < STOCK_MODEL_VERSION) {
    ingredients = ingredients.map(migrateIngredient);
    products = migrateMainRecipe(products, ingredients);
  }

  ingredients = ingredients.map(i => ({...i, category: i.category || categoryForName(i.name)}));

  return {
    ingredients,
    products,
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
      stockModelVersion: STOCK_MODEL_VERSION,
    },
  };
}
