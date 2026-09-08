export type Unit = 'un' | 'g' | 'kg' | 'ml' | 'l' | 'pct';

export type Ingredient = {
  id: string;
  name: string;
  unit: Unit;
  purchaseQuantity: number;
  purchaseCost: number;
  stock: number;
  minStock: number;
  packageLabel?: string;
  defaultPurchasePackages?: number;
  packageNote?: string;
};

export type RecipeItem = {
  ingredientId: string;
  quantity: number;
};

export type Product = {
  id: string;
  name: string;
  salePrice: number;
  yield: number;
  packagingCost: number;
  recipe: RecipeItem[];
  active: boolean;
};

export type OrderStatus = 'Novo' | 'Confirmado' | 'Produção' | 'Pronto' | 'Saiu para entrega' | 'Entregue' | 'Cancelado';
export type PaymentMethod = 'Pix' | 'Dinheiro' | 'Cartão' | 'Outro';
export type OrderSource = 'Instagram' | 'Facebook Ads' | 'WhatsApp' | 'Indicação' | 'Cliente antigo' | 'Outro';

export type Order = {
  id: string;
  createdAt: string;
  deliveryDate: string;
  customer: string;
  phone: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  deliveryFee: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  source: OrderSource;
  paid: boolean;
  paidAt?: string;
  address?: string;
  notes?: string;
};

export type Batch = {
  id: string;
  date: string;
  productId: string;
  planned: number;
  produced: number;
  extraCost: number;
  wasteCost: number;
  notes?: string;
};

export type PurchaseItem = {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  total: number;
};

export type Purchase = {
  id: string;
  date: string;
  store: string;
  total: number;
  source: 'Manual' | 'NFC-e' | 'XML';
  paymentMethod?: PaymentMethod;
  accessKey?: string;
  qrUrl?: string;
  items: PurchaseItem[];
};

export type Expense = {
  id: string;
  date: string;
  category: 'Anúncios' | 'Entrega' | 'Utensílios' | 'Taxas' | 'MEI/DAS' | 'Sistema' | 'Outro';
  description: string;
  amount: number;
  recurring: boolean;
  paymentMethod?: PaymentMethod;
  payee?: string;
};

export type FinanceTransactionType = 'Entrada' | 'Saída' | 'Ajuste';
export type FinanceTransactionSource = 'Manual' | 'Pedido' | 'Compra' | 'Despesa' | 'Ajuste';

export type FinanceTransaction = {
  id: string;
  date: string;
  createdAt: string;
  type: FinanceTransactionType;
  description: string;
  person?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  source: FinanceTransactionSource;
  sourceId?: string;
};

export type ProfitShare = {
  id: string;
  name: string;
  percentage: number;
};

export type FinanceState = {
  initialBalance: number;
  initialBalanceSet: boolean;
  initialBalanceDate?: string;
  baselineSourceIds: string[];
  manualTransactions: FinanceTransaction[];
  profitShares: ProfitShare[];
};

export type AppSettings = {
  businessName: string;
  monthlyMei: number;
  monthlyFixedCosts: number;
  defaultDeliveryFee: number;
  cardFeePercent: number;
  stockModelVersion?: number;
};

export type AppData = {
  ingredients: Ingredient[];
  products: Product[];
  orders: Order[];
  batches: Batch[];
  purchases: Purchase[];
  expenses: Expense[];
  finance: FinanceState;
  settings: AppSettings;
};
