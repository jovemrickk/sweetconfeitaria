export type Unit = 'un' | 'g' | 'kg' | 'ml' | 'l' | 'pct';

export type Ingredient = {
  id: string;
  name: string;
  unit: Unit;
  purchaseQuantity: number;
  purchaseCost: number;
  stock: number;
  minStock: number;
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
};

export type AppSettings = {
  businessName: string;
  monthlyMei: number;
  monthlyFixedCosts: number;
  defaultDeliveryFee: number;
  cardFeePercent: number;
};

export type AppData = {
  ingredients: Ingredient[];
  products: Product[];
  orders: Order[];
  batches: Batch[];
  purchases: Purchase[];
  expenses: Expense[];
  settings: AppSettings;
};
