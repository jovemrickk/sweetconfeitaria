'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  BarChart3, ClipboardList, Factory, PackageOpen, ReceiptText, WalletCards, Settings,
  Plus, Search, CheckCircle2, Clock3, Truck, Trash2, Pencil, Camera, Upload, Download,
  ShoppingBasket, BadgeDollarSign, Boxes, TrendingUp, Users, Megaphone, X, Save, QrCode,
  ChevronRight, AlertTriangle, CircleDollarSign, RotateCcw, Menu, Cloud, LogOut,
  ArrowDownLeft, ArrowUpRight, Landmark, LockKeyhole, Scale
} from 'lucide-react';
import { useAppData } from '@/lib/useAppData';
import type { AppData, Batch, Expense, FinanceTransaction, Ingredient, Order, OrderSource, OrderStatus, PaymentMethod, Product, Purchase, PurchaseItem, StockItemCategory, Unit } from '@/lib/types';
import { autoFinanceSourceIds, brl, financeBalance, financeMonthSummary, financeTransactions, ingredientUnitCost, monthKey, monthlyMetrics, orderTotal, productBatchCost, productUnitCost, today, uid } from '@/lib/utils';
import QrScanner from './QrScanner';
import LoginPanel from './LoginPanel';
import InstallPwaButton from './InstallPwaButton';

const tabs = [
  ['dashboard', 'Resumo', BarChart3],
  ['orders', 'Pedidos', ClipboardList],
  ['production', 'Produção', Factory],
  ['catalog', 'Catálogo', PackageOpen],
  ['purchases', 'Compras / NFC-e', ReceiptText],
  ['finance', 'Financeiro', WalletCards],
  ['settings', 'Configurações', Settings],
] as const;

type Tab = typeof tabs[number][0];

export default function AppShell() {
  const {
    data, setData, loaded, reset, exportJson, importJson,
    user, authLoading, cloudEnabled, cloudReady, cloudStatus, cloudError,
    signIn, signUp, signOut,
  } = useAppData();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [mobileNav, setMobileNav] = useState(false);

  if (!loaded || authLoading) return <div className="loading"><div className="spinner" />Carregando Confeitaria Sweet...</div>;

  if (cloudEnabled && !user) {
    return <LoginPanel onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <div className="app">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <div className="brand">
          <Image src="/logo.png" width={92} height={92} alt="Sweet Dreams" priority />
          <div><strong>Confeitaria Sweet</strong><span>gestão da confeitaria</span></div>
          <button className="iconBtn mobileOnly" onClick={() => setMobileNav(false)}><X size={20}/></button>
        </div>
        <nav>
          {tabs.map(([id, label, Icon]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => {setTab(id); setMobileNav(false);}}>
              <Icon size={19}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebarNote">
          <span className={`dot ${cloudStatus === 'error' ? 'error' : 'live'}`} />
          <div>
            <strong>{cloudEnabled ? (cloudStatus === 'saving' ? 'Salvando na nuvem' : cloudStatus === 'connecting' ? 'Conectando...' : cloudStatus === 'error' ? 'Erro na nuvem' : 'Nuvem conectada') : 'Modo local'}</strong>
            <small>{cloudEnabled ? (cloudError || (cloudReady ? 'Dados sincronizados entre seus aparelhos.' : 'Preparando sincronização...')) : 'Configure o Supabase para sincronizar.'}</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="iconBtn mobileOnly" onClick={() => setMobileNav(true)}><Menu size={22}/></button>
          <div>
            <p className="eyebrow">CONFEITARIA SWEET • PAINEL</p>
            <h1>{tabs.find(t => t[0] === tab)?.[1]}</h1>
          </div>
          <div className="topActions">
            <InstallPwaButton />
            {user && <button className="iconBtn" title="Sair da conta" onClick={signOut}><LogOut size={18}/></button>}
            <span className="datePill">{new Date().toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'})}</span>
          </div>
        </header>

        {tab === 'dashboard' && <Dashboard data={data} setTab={setTab}/>} 
        {tab === 'orders' && <Orders data={data} setData={setData}/>} 
        {tab === 'production' && <Production data={data} setData={setData}/>} 
        {tab === 'catalog' && <Catalog data={data} setData={setData}/>} 
        {tab === 'purchases' && <Purchases data={data} setData={setData}/>} 
        {tab === 'finance' && <Finance data={data} setData={setData}/>} 
        {tab === 'settings' && <SettingsPanel data={data} setData={setData} reset={reset} exportJson={exportJson} importJson={importJson}/>} 
      </main>
      {mobileNav && <div className="overlay" onClick={() => setMobileNav(false)} />}
    </div>
  );
}

function Dashboard({data, setTab}:{data:AppData; setTab:(t:Tab)=>void}) {
  const m = monthlyMetrics(data);
  const pending = data.orders.filter(o => !['Entregue','Cancelado'].includes(o.status));
  const low = data.ingredients.filter(i => i.stock <= i.minStock);
  const topProduct = useMemo(() => {
    const map = new Map<string, number>();
    data.orders.filter(o=>o.status!=='Cancelado').forEach(o => map.set(o.productId, (map.get(o.productId)||0)+o.quantity));
    const best = [...map.entries()].sort((a,b)=>b[1]-a[1])[0];
    return best ? {name:data.products.find(p=>p.id===best[0])?.name || 'Produto', qty:best[1]} : null;
  }, [data.orders, data.products]);

  return <section className="content">
    <div className="heroCard">
      <div>
        <span className="softTag">Visão do mês</span>
        <h2>O caixa da confeitaria, sem chute.</h2>
        <p>Pedidos, produção, compras e custos conectados no mesmo lugar.</p>
      </div>
      <button className="primary" onClick={()=>setTab('orders')}><Plus size={18}/> Novo pedido</button>
    </div>

    <div className="metricsGrid">
      <Metric icon={CircleDollarSign} label="Faturamento" value={brl(m.revenue)} note={`${m.orders} pedidos no mês`}/>
      <Metric icon={TrendingUp} label="Lucro estimado" value={brl(m.profit)} note={`Custos + despesas: ${brl(m.cogs+m.expenses+m.fixed)}`} positive={m.profit>=0}/>
      <Metric icon={ShoppingBasket} label="Ticket médio" value={brl(m.avgTicket)} note={`${m.delivered} entregues`}/>
      <Metric icon={Megaphone} label="Meta Ads" value={m.ads ? `${m.roas.toFixed(2)}x ROAS` : 'Sem dados'} note={m.ads ? `${m.adOrders} pedidos • CPA ${brl(m.cpa)}` : 'Cadastre anúncio em despesas'}/>
    </div>

    <div className="twoCols">
      <div className="card">
        <div className="sectionTitle"><div><p className="eyebrow">OPERAÇÃO</p><h3>Pedidos em andamento</h3></div><button className="ghost" onClick={()=>setTab('orders')}>Ver todos <ChevronRight size={16}/></button></div>
        {pending.length ? <div className="compactList">{pending.slice(0,5).map(o=><div className="compactRow" key={o.id}>
          <div className="avatar">{o.customer.slice(0,1).toUpperCase()}</div>
          <div className="grow"><strong>{o.customer}</strong><span>{o.quantity}× {data.products.find(p=>p.id===o.productId)?.name}</span></div>
          <Status status={o.status}/><strong>{brl(orderTotal(o))}</strong>
        </div>)}</div> : <Empty icon={ClipboardList} title="Nenhum pedido aberto" text="Cadastre os pedidos e acompanhe até a entrega."/>}
      </div>
      <div className="card">
        <div className="sectionTitle"><div><p className="eyebrow">ESTOQUE</p><h3>O que pede atenção</h3></div><button className="ghost" onClick={()=>setTab('catalog')}>Catálogo <ChevronRight size={16}/></button></div>
        {low.length ? <div className="compactList">{low.map(i=><div className="compactRow" key={i.id}>
          <div className="warningIcon"><AlertTriangle size={17}/></div>
          <div className="grow"><strong>{i.name}</strong><span>Estoque: {i.stock} {i.unit}</span></div><span className="dangerText">mín. {i.minStock}</span>
        </div>)}</div> : <Empty icon={Boxes} title="Estoque tranquilo" text="Nenhum item abaixo do mínimo."/>}
        <div className="insightBox"><strong>Mais vendido</strong><span>{topProduct ? `${topProduct.name} • ${topProduct.qty} un.` : 'Ainda sem vendas registradas'}</span></div>
      </div>
    </div>

    <div className="metricsStrip">
      <div><span>Produtos</span><strong>{brl(m.productRevenue)}</strong></div>
      <div><span>Entregas cobradas</span><strong>{brl(m.deliveryRevenue)}</strong></div>
      <div><span>Custo de produtos</span><strong>{brl(m.cogs)}</strong></div>
      <div><span>Despesas</span><strong>{brl(m.expenses)}</strong></div>
      <div><span>Fixos/MEI</span><strong>{brl(m.fixed)}</strong></div>
    </div>
  </section>
}

function Metric({icon:Icon,label,value,note,positive}:{icon:any;label:string;value:string;note:string;positive?:boolean}){
  return <div className="metric"><div className="metricIcon"><Icon size={20}/></div><span>{label}</span><strong className={positive===false?'negative':''}>{value}</strong><small>{note}</small></div>
}

function Orders({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [form, setForm] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'Todos'|OrderStatus>('Todos');
  const product = data.products.find(p=>p.active) || data.products[0];
  const [draft, setDraft] = useState<Partial<Order>>({
    customer:'', phone:'', productId:product?.id, quantity:1, unitPrice:product?.salePrice||0,
    deliveryFee:data.settings.defaultDeliveryFee, status:'Novo', paymentMethod:'Pix', source:'WhatsApp', paid:false,
    createdAt:today(), deliveryDate:today(), address:'', notes:''
  });
  const filtered = data.orders.filter(o => (status==='Todos'||o.status===status) && `${o.customer} ${o.phone}`.toLowerCase().includes(query.toLowerCase()));
  const save = () => {
    if(!draft.customer || !draft.productId || !draft.quantity) return;
    const order:Order = {
      id:uid(), createdAt:draft.createdAt||today(), deliveryDate:draft.deliveryDate||today(), customer:draft.customer,
      phone:draft.phone||'', productId:draft.productId, quantity:Number(draft.quantity), unitPrice:Number(draft.unitPrice)||0,
      deliveryFee:Number(draft.deliveryFee)||0, status:(draft.status as OrderStatus)||'Novo', paymentMethod:(draft.paymentMethod as PaymentMethod)||'Pix',
      source:(draft.source as OrderSource)||'WhatsApp', paid:!!draft.paid, paidAt:draft.paid ? today() : undefined, address:draft.address, notes:draft.notes
    };
    setData(d=>({...d,orders:[order,...d.orders]})); setForm(false);
    setDraft({...draft,customer:'',phone:'',quantity:1,address:'',notes:'',paid:false,paidAt:undefined});
  };
  const updateStatus=(id:string, status:OrderStatus)=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,status}:o)}));
  const togglePaid=(id:string)=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,paid:!o.paid,paidAt:!o.paid?today():undefined}:o)}));
  const remove=(id:string)=>confirm('Excluir este pedido?')&&setData(d=>({...d,orders:d.orders.filter(o=>o.id!==id)}));

  return <section className="content">
    <div className="toolbar">
      <div className="search"><Search size={18}/><input placeholder="Buscar cliente ou telefone..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <button className="primary" onClick={()=>setForm(true)}><Plus size={18}/> Novo pedido</button>
    </div>
    <div className="filterPills">{(['Todos','Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue'] as const).map(st=><button key={st} className={status===st?'active':''} onClick={()=>setStatus(st)}>{st}</button>)}</div>
    <div className="card tableCard">
      <div className="tableWrap"><table><thead><tr><th>Cliente</th><th>Pedido</th><th>Entrega</th><th>Origem</th><th>Total</th><th>Pagamento</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map(o=><tr key={o.id}><td><strong>{o.customer}</strong><small>{o.phone||'sem telefone'}</small></td><td>{o.quantity}× {data.products.find(p=>p.id===o.productId)?.name||'Produto'}<small>{o.paymentMethod}</small></td><td>{new Date(`${o.deliveryDate}T12:00`).toLocaleDateString('pt-BR')}<small>{o.address||'Retirada / combinar'}</small></td><td>{o.source}</td><td><strong>{brl(orderTotal(o))}</strong><small>frete {brl(o.deliveryFee)}</small></td><td><button className={`paymentToggle ${o.paid?'paid':''}`} onClick={()=>togglePaid(o.id)}>{o.paid?'✓ Pago':'Pendente'}</button></td><td><select className="statusSelect" value={o.status} onChange={e=>updateStatus(o.id,e.target.value as OrderStatus)}>{['Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue','Cancelado'].map(st=><option key={st}>{st}</option>)}</select></td><td><button className="iconBtn danger" onClick={()=>remove(o.id)}><Trash2 size={16}/></button></td></tr>)}
        {!filtered.length&&<tr><td colSpan={8}><Empty icon={ClipboardList} title="Nenhum pedido aqui" text="Cadastre o primeiro pedido da confeitaria."/></td></tr>}
      </tbody></table></div>
    </div>
    {form&&<Modal title="Novo pedido" onClose={()=>setForm(false)} footer={<><button className="secondary" onClick={()=>setForm(false)}>Cancelar</button><button className="primary" onClick={save}><Save size={17}/> Salvar pedido</button></>}>
      <div className="formGrid">
        <Field label="Cliente"><input value={draft.customer||''} onChange={e=>setDraft({...draft,customer:e.target.value})}/></Field>
        <Field label="WhatsApp"><input placeholder="(19) 99999-9999" value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field>
        <Field label="Produto"><select value={draft.productId} onChange={e=>{const pr=data.products.find(p=>p.id===e.target.value);setDraft({...draft,productId:e.target.value,unitPrice:pr?.salePrice||0})}}>{data.products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Quantidade"><input type="number" min="1" value={draft.quantity||1} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/></Field>
        <Field label="Preço unitário"><MoneyInput value={Number(draft.unitPrice)||0} onChange={v=>setDraft({...draft,unitPrice:v})}/></Field>
        <Field label="Taxa de entrega"><MoneyInput value={Number(draft.deliveryFee)||0} onChange={v=>setDraft({...draft,deliveryFee:v})}/></Field>
        <Field label="Data da entrega"><input type="date" value={draft.deliveryDate||today()} onChange={e=>setDraft({...draft,deliveryDate:e.target.value})}/></Field>
        <Field label="Pagamento"><select value={draft.paymentMethod} onChange={e=>setDraft({...draft,paymentMethod:e.target.value as PaymentMethod})}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Origem"><select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value as OrderSource})}>{['Instagram','Facebook Ads','WhatsApp','Indicação','Cliente antigo','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Status"><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as OrderStatus})}>{['Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Pagamento recebido"><label className="check"><input type="checkbox" checked={!!draft.paid} onChange={e=>setDraft({...draft,paid:e.target.checked})}/> Marcar como pago</label></Field>
        <Field label="Endereço" wide><input value={draft.address||''} onChange={e=>setDraft({...draft,address:e.target.value})}/></Field>
        <Field label="Observações" wide><textarea value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></Field>
      </div>
      <div className="totalPreview"><span>Total do pedido</span><strong>{brl((Number(draft.unitPrice)||0)*(Number(draft.quantity)||0)+(Number(draft.deliveryFee)||0))}</strong></div>
    </Modal>}
  </section>
}

function Production({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const first = data.products[0];
  const [draft,setDraft]=useState<Partial<Batch>>({date:today(),productId:first?.id,planned:first?.yield||1,produced:first?.yield||1,extraCost:0,wasteCost:0,notes:''});
  const p = data.products.find(p=>p.id===draft.productId);
  const scale = p && p.yield > 0 ? ((Number(draft.planned)||p.yield)/p.yield) : 1;
  const baseCost = p ? productBatchCost(p,data.ingredients) * scale : 0;
  const realCost = baseCost + (Number(draft.extraCost)||0) + (Number(draft.wasteCost)||0);
  const unit = (Number(draft.produced)||0)>0? realCost/Number(draft.produced):0;

  const usage = p ? p.recipe.map(r=>{
    const ing=data.ingredients.find(i=>i.id===r.ingredientId);
    return {ingredientId:r.ingredientId,name:ing?.name||'Ingrediente',unit:ing?.unit||'un',needed:r.quantity*scale,stock:ing?.stock||0};
  }) : [];
  const shortages=usage.filter(x=>x.stock+0.0001<x.needed);

  const save=()=>{
    if(!draft.productId||!draft.produced||!p)return;
    if(shortages.length){
      const names=shortages.map(x=>`${x.name}: precisa ${Number(x.needed.toFixed(2))} ${x.unit}, tem ${Number(x.stock.toFixed(2))} ${x.unit}`).join('\n');
      if(!confirm(`Estoque insuficiente para alguns itens:\n\n${names}\n\nRegistrar a produção mesmo assim?`)) return;
    }

    const batch:Batch={id:uid(),date:draft.date||today(),productId:draft.productId,planned:Number(draft.planned)||0,produced:Number(draft.produced)||0,extraCost:Number(draft.extraCost)||0,wasteCost:Number(draft.wasteCost)||0,notes:draft.notes};
    const usageMap=new Map(p.recipe.map(r=>[r.ingredientId,r.quantity*scale]));

    setData(d=>({
      ...d,
      batches:[batch,...d.batches],
      ingredients:d.ingredients.map(i=>{
        const used=usageMap.get(i.id)||0;
        return used?{...i,stock:Math.max(0,Number(i.stock||0)-used)}:i;
      })
    }));
  };

  const demand=useMemo(()=>{
    const map=new Map<string,number>();
    data.orders.filter(o=>!['Entregue','Cancelado'].includes(o.status)).forEach(o=>map.set(o.productId,(map.get(o.productId)||0)+o.quantity)); return map;
  },[data.orders]);

  return <section className="content">
    <div className="twoCols productionGrid">
      <div className="card">
        <div className="sectionTitle"><div><p className="eyebrow">CALCULADORA DE LOTE</p><h3>Quanto custou produzir hoje?</h3></div><div className="metricIcon"><Factory size={20}/></div></div>
        <div className="formGrid oneCol">
          <Field label="Produto"><select value={draft.productId} onChange={e=>{const np=data.products.find(p=>p.id===e.target.value);setDraft({...draft,productId:e.target.value,planned:np?.yield||1,produced:np?.yield||1})}}>{data.products.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
          <div className="inlineFields"><Field label="Data"><input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></Field><Field label="Planejado"><input type="number" value={draft.planned||0} onChange={e=>setDraft({...draft,planned:Number(e.target.value)})}/></Field><Field label="Produzido"><input type="number" value={draft.produced||0} onChange={e=>setDraft({...draft,produced:Number(e.target.value)})}/></Field></div>
          <div className="inlineFields"><Field label="Custo extra"><MoneyInput value={Number(draft.extraCost)||0} onChange={v=>setDraft({...draft,extraCost:v})}/></Field><Field label="Perdas / desperdício"><MoneyInput value={Number(draft.wasteCost)||0} onChange={v=>setDraft({...draft,wasteCost:v})}/></Field></div>
          <Field label="Observações"><textarea placeholder="Ex.: sobraram 2 morangos para outro produto..." value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></Field>
        </div>

        <div className="insightBox" style={{marginTop:16}}>
          <strong>O que vai sair do estoque</strong>
          <span>Ao registrar o lote, o sistema desconta automaticamente os ingredientes, embalagens e insumos abaixo.</span>
        </div>
        <div className="compactList" style={{marginTop:10}}>
          {usage.map(x=><div className="compactRow" key={x.ingredientId}>
            <div className="grow"><strong>{x.name}</strong><span>vai usar {Number(x.needed.toFixed(2))} {x.unit}</span></div>
            <div className="right"><strong className={x.stock<x.needed?'dangerText':''}>{Number(x.stock.toFixed(2))} {x.unit}</strong><span>em estoque</span></div>
          </div>)}
        </div>

        <div className="lotResult">
          <div><span>Custo estimado da receita</span><strong>{brl(baseCost)}</strong></div>
          <div><span>Custo real do lote</span><strong>{brl(realCost)}</strong></div>
          <div className="highlight"><span>Custo por unidade</span><strong>{brl(unit)}</strong></div>
          <div><span>Margem unitária no preço atual</span><strong>{p&&p.salePrice?`${(((p.salePrice-unit)/p.salePrice)*100).toFixed(1)}%`:'—'}</strong></div>
        </div>
        <button className="primary full" onClick={save}><Save size={17}/> Registrar lote e baixar estoque</button>
      </div>
      <div className="stack">
        <div className="card">
          <div className="sectionTitle"><div><p className="eyebrow">DEMANDA</p><h3>Quanto precisa produzir</h3></div></div>
          {data.products.map(p=><div className="demandRow" key={p.id}><div><strong>{p.name}</strong><span>Pedidos ainda não finalizados</span></div><b>{demand.get(p.id)||0} un.</b></div>)}
        </div>
        <div className="card">
          <div className="sectionTitle"><div><p className="eyebrow">HISTÓRICO</p><h3>Últimos lotes</h3></div></div>
          {data.batches.length?data.batches.slice(0,5).map(b=>{const pr=data.products.find(p=>p.id===b.productId);const cost=pr?productBatchCost(pr,data.ingredients)*(b.planned/pr.yield)+b.extraCost+b.wasteCost:0; return <div className="compactRow" key={b.id}><div className="metricIcon small"><Factory size={16}/></div><div className="grow"><strong>{pr?.name}</strong><span>{new Date(`${b.date}T12:00`).toLocaleDateString('pt-BR')} • {b.produced} un.</span></div><div className="right"><strong>{brl(cost)}</strong><span>{brl(b.produced?cost/b.produced:0)}/un.</span></div></div>}) : <Empty icon={Factory} title="Nenhum lote registrado" text="Use a calculadora ao lado na próxima produção."/>}
        </div>
      </div>
    </div>
  </section>
}

function Catalog({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  type RecipeDraftRow = {
    key:string;
    ingredientId?:string;
    name:string;
    quantity:number;
    unit:Unit;
    category:StockItemCategory;
  };

  const [sub,setSub]=useState<'products'|'ingredients'>('products');
  const [prodModal,setProdModal]=useState(false);
  const [ingModal,setIngModal]=useState(false);
  const [editingProdId,setEditingProdId]=useState<string|null>(null);
  const [editingIngId,setEditingIngId]=useState<string|null>(null);
  const [importOpen,setImportOpen]=useState(false);
  const [importText,setImportText]=useState('');
  const [recipeDraft,setRecipeDraft]=useState<RecipeDraftRow[]>([]);

  const cleanName=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  const inferCategory=(name:string):StockItemCategory=>{
    const n=cleanName(name);
    if(/(embal|pote|potinho|tampa|sacola|saquinho|adesivo|caixa para|forma|copinho|copo)/.test(n)) return 'Embalagem';
    if(/(palito|colher descart|guardanapo|fita|lacre|etiqueta)/.test(n)) return 'Insumo';
    return 'Ingrediente';
  };
  const itemCategory=(i:Ingredient):StockItemCategory=>i.category||inferCategory(i.name);
  const fmt=(n:number)=>Number.isInteger(n)?String(n):Number(n.toFixed(2)).toString();
  const purchasePackages=(i:Ingredient)=>Math.max(1,Number(i.defaultPurchasePackages)||1);
  const purchaseTotal=(i:Ingredient)=>purchasePackages(i)*Number(i.purchaseCost||0);
  const contentTotal=(i:Ingredient)=>purchasePackages(i)*Number(i.purchaseQuantity||0);
  const packageText=(i:Ingredient)=>`${purchasePackages(i)} × ${i.packageLabel||'embalagem'}`;

  const emptyIng:Partial<Ingredient>={
    name:'',category:'Ingrediente',unit:'un',purchaseQuantity:1,purchaseCost:0,stock:0,minStock:0,
    packageLabel:'pacote',defaultPurchasePackages:1,packageNote:''
  };
  const emptyProd:Partial<Product>={name:'',salePrice:0,yield:1,packagingCost:0,recipe:[],preparation:'',active:true};
  const [ing,setIng]=useState<Partial<Ingredient>>(emptyIng);
  const [prod,setProd]=useState<Partial<Product>>(emptyProd);

  const convertQuantity=(value:number,from:Unit,to:Unit)=>{
    if(from===to) return value;
    if(from==='kg'&&to==='g') return value*1000;
    if(from==='g'&&to==='kg') return value/1000;
    if(from==='l'&&to==='ml') return value*1000;
    if(from==='ml'&&to==='l') return value/1000;
    return value;
  };

  const openNewIng=()=>{
    setEditingIngId(null);
    setIng({...emptyIng});
    setIngModal(true);
  };

  const openEditIng=(ingredient:Ingredient)=>{
    setEditingIngId(ingredient.id);
    setIng({...ingredient,category:itemCategory(ingredient)});
    setIngModal(true);
  };

  const closeIng=()=>{
    setIngModal(false);
    setEditingIngId(null);
    setIng({...emptyIng});
  };

  const saveIng=()=>{
    if(!ing.name?.trim()) return;
    const id=editingIngId||uid();
    const ingredient:Ingredient={
      id,
      name:ing.name.trim(),
      category:(ing.category as StockItemCategory)||inferCategory(ing.name),
      unit:(ing.unit as Unit)||'un',
      purchaseQuantity:Number(ing.purchaseQuantity)||1,
      purchaseCost:Number(ing.purchaseCost)||0,
      stock:Number(ing.stock)||0,
      minStock:Number(ing.minStock)||0,
      packageLabel:ing.packageLabel?.trim()||'embalagem',
      defaultPurchasePackages:Math.max(1,Number(ing.defaultPurchasePackages)||1),
      packageNote:ing.packageNote?.trim()||undefined,
    };

    setData(d=>({
      ...d,
      ingredients:editingIngId?d.ingredients.map(i=>i.id===editingIngId?ingredient:i):[...d.ingredients,ingredient],
    }));
    closeIng();
  };

  const removeIng=(id:string)=>{
    const usedBy=data.products.filter(p=>p.recipe.some(r=>r.ingredientId===id));
    if(usedBy.length){
      alert(`Este item está sendo usado em: ${usedBy.map(p=>p.name).join(', ')}. Remova-o dessas receitas antes de excluir do estoque.`);
      return;
    }
    if(!confirm('Excluir este item do estoque?')) return;
    setData(d=>({...d,ingredients:d.ingredients.filter(i=>i.id!==id)}));
  };

  const rowsFromProduct=(product:Product):RecipeDraftRow[]=>product.recipe.map(r=>{
    const item=data.ingredients.find(i=>i.id===r.ingredientId);
    return {
      key:uid(),
      ingredientId:r.ingredientId,
      name:item?.name||'',
      quantity:r.quantity,
      unit:item?.unit||'un',
      category:item?itemCategory(item):'Ingrediente',
    };
  });

  const openNewProd=()=>{
    setEditingProdId(null);
    setProd({...emptyProd,recipe:[],preparation:''});
    setRecipeDraft([]);
    setImportText('');
    setImportOpen(false);
    setProdModal(true);
  };

  const openEditProd=(product:Product)=>{
    setEditingProdId(product.id);
    setProd({...product,recipe:product.recipe.map(r=>({...r}))});
    setRecipeDraft(rowsFromProduct(product));
    setImportText('');
    setImportOpen(false);
    setProdModal(true);
  };

  const closeProd=()=>{
    setProdModal(false);
    setEditingProdId(null);
    setProd({...emptyProd,recipe:[],preparation:''});
    setRecipeDraft([]);
    setImportText('');
    setImportOpen(false);
  };

  const addRecipeItem=()=>setRecipeDraft(rows=>[...rows,{key:uid(),name:'',quantity:1,unit:'un',category:'Ingrediente'}]);

  const updateRecipeName=(idx:number,name:string)=>{
    setRecipeDraft(rows=>rows.map((row,i)=>{
      if(i!==idx) return row;
      const existing=data.ingredients.find(item=>cleanName(item.name)===cleanName(name));
      if(!existing) return {...row,name,ingredientId:undefined,category:inferCategory(name)};
      return {
        ...row,
        name:existing.name,
        ingredientId:existing.id,
        quantity:convertQuantity(Number(row.quantity)||0,row.unit,existing.unit),
        unit:existing.unit,
        category:itemCategory(existing),
      };
    }));
  };

  const unitFromText=(raw?:string):Unit=>{
    const u=(raw||'').toLowerCase().replace('.','').trim();
    if(u==='kg') return 'kg';
    if(u==='g'||u==='gr'||u==='gramas'||u==='grama') return 'g';
    if(u==='ml') return 'ml';
    if(u==='l'||u==='lt'||u==='litro'||u==='litros') return 'l';
    if(u==='pct'||u==='pacote'||u==='pacotes') return 'pct';
    return 'un';
  };

  const parseRecipeText=(text:string)=>{
    let section:StockItemCategory='Ingrediente';
    let detectedYield:number|undefined;
    const parsed:RecipeDraftRow[]=[];
    const packageWords=/^(pct|pacotes?|potes?|potinhos?|caixas?|bandejas?|sacos?|sacolas?|adesivos?|copos?|copinhos?|tampas?)$/i;

    for(const raw of text.split(/\r?\n/)){
      const line=raw.replace(/^[-•*]\s*/,'').trim();
      if(!line) continue;
      if(/^ingredientes?\s*:?$/i.test(line)){section='Ingrediente';continue;}
      if(/^(embalagens?|materiais?)\s*:?$/i.test(line)){section='Embalagem';continue;}
      if(/^insumos?\s*:?$/i.test(line)){section='Insumo';continue;}
      const y=line.match(/^rendimento\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i);
      if(y){detectedYield=Number(y[1].replace(',','.'));continue;}
      if(/^(modo de preparo|preparo|observa[cç][oõ]es?)\s*:?/i.test(line)) continue;

      const compact=line.replace(/\s+/g,' ');
      const unitToken='kg|g|gr|gramas?|ml|l|lt|litros?|un|unid(?:ade)?s?|unidades?|pct|pacotes?|potes?|potinhos?|caixas?|bandejas?|sacos?|sacolas?|adesivos?|copos?|copinhos?|tampas?';
      let name='';
      let qty=0;
      let rawUnit='';

      let m=compact.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${unitToken})?\\s+(?:de\\s+)?(.+)$`,'i'));
      if(m){qty=Number(m[1].replace(',','.'));rawUnit=m[2]||'';name=m[3].trim();}
      else {
        m=compact.match(new RegExp(`^(.+?)\\s*(?:-|–|:|=)\\s*(\\d+(?:[.,]\\d+)?)\\s*(${unitToken})?$`,'i'));
        if(m){name=m[1].trim();qty=Number(m[2].replace(',','.'));rawUnit=m[3]||'';}
      }

      if(!name||!qty){
        const fallback=compact.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
        if(fallback){qty=Number(fallback[1].replace(',','.'));name=fallback[2].trim();rawUnit='';}
      }
      if(!name||!qty) continue;

      let category=section;
      if(section==='Ingrediente') category=inferCategory(name);
      if(packageWords.test(rawUnit)) category='Embalagem';
      let unit=unitFromText(rawUnit);
      const existing=data.ingredients.find(item=>cleanName(item.name)===cleanName(name));
      let ingredientId=existing?.id;

      if(existing){
        if(packageWords.test(rawUnit)) qty*=Number(existing.purchaseQuantity)||1;
        else qty=convertQuantity(qty,unit,existing.unit);
        unit=existing.unit;
        category=itemCategory(existing);
        name=existing.name;
      }

      parsed.push({key:uid(),ingredientId,name,quantity:qty,unit,category});
    }
    return {rows:parsed,detectedYield};
  };

  const importRecipe=()=>{
    const parsed=parseRecipeText(importText);
    if(parsed.detectedYield) setProd(p=>({...p,yield:Math.max(1,parsed.detectedYield||1)}));
    if(!parsed.rows.length){alert('Não encontrei itens com quantidade nesse texto. Ex.: 395 g leite condensado ou Morango - 20 un.');return;}
    setRecipeDraft(current=>{
      const merged=[...current];
      parsed.rows.forEach(row=>{
        const idx=merged.findIndex(x=>(row.ingredientId&&x.ingredientId===row.ingredientId)||(!row.ingredientId&&cleanName(x.name)===cleanName(row.name)));
        if(idx>=0) merged[idx]={...merged[idx],quantity:Number(merged[idx].quantity||0)+Number(row.quantity||0)};
        else merged.push(row);
      });
      return merged;
    });
    setImportOpen(false);
    setImportText('');
  };

  const saveProd=()=>{
    if(!prod.name?.trim()) return;
    const id=editingProdId||uid();
    const created:Ingredient[]=[];
    const recipeMap=new Map<string,number>();

    recipeDraft.filter(r=>r.name.trim()&&Number(r.quantity)>0).forEach(row=>{
      let item=data.ingredients.find(i=>i.id===row.ingredientId)
        || data.ingredients.find(i=>cleanName(i.name)===cleanName(row.name))
        || created.find(i=>cleanName(i.name)===cleanName(row.name));

      if(!item){
        item={
          id:uid(),
          name:row.name.trim(),
          category:row.category||inferCategory(row.name),
          unit:row.unit||'un',
          purchaseQuantity:1,
          purchaseCost:0,
          stock:0,
          minStock:0,
          packageLabel:row.category==='Embalagem'?'pacote':'embalagem',
          defaultPurchasePackages:1,
          packageNote:'Criado automaticamente pela receita. Complete preço e formato de compra no estoque.',
        };
        created.push(item);
      }

      const q=convertQuantity(Number(row.quantity)||0,row.unit,item.unit);
      recipeMap.set(item.id,(recipeMap.get(item.id)||0)+q);
    });

    const product:Product={
      id,
      name:prod.name.trim(),
      salePrice:Number(prod.salePrice)||0,
      yield:Math.max(1,Number(prod.yield)||1),
      packagingCost:Number(prod.packagingCost)||0,
      recipe:[...recipeMap.entries()].map(([ingredientId,quantity])=>({ingredientId,quantity})),
      preparation:prod.preparation?.trim()||undefined,
      active:prod.active!==false,
    };

    setData(d=>({
      ...d,
      ingredients:created.length?[...d.ingredients,...created]:d.ingredients,
      products:editingProdId?d.products.map(p=>p.id===editingProdId?product:p):[...d.products,product],
    }));
    closeProd();
  };

  const removeProd=(id:string)=>{
    const orders=data.orders.filter(o=>o.productId===id).length;
    const batches=data.batches.filter(b=>b.productId===id).length;
    if(orders||batches){
      alert(`Este produto já possui histórico (${orders} pedido${orders===1?'':'s'} e ${batches} lote${batches===1?'':'s'}). Para não quebrar seus relatórios, edite o produto e desmarque “Produto ativo” em vez de excluir.`);
      return;
    }
    if(!confirm('Excluir este produto/receita? Essa ação não pode ser desfeita.')) return;
    setData(d=>({...d,products:d.products.filter(p=>p.id!==id)}));
  };

  return <section className="content">
    <div className="toolbar">
      <div className="segmented"><button className={sub==='products'?'active':''} onClick={()=>setSub('products')}>Produtos e receitas</button><button className={sub==='ingredients'?'active':''} onClick={()=>setSub('ingredients')}>Estoque</button></div>
      <button className="primary" onClick={()=>sub==='products'?openNewProd():openNewIng()}><Plus size={18}/> {sub==='products'?'Nova receita / produto':'Novo item no estoque'}</button>
    </div>

    {sub==='products'?<>
      <div className="heroCard" style={{marginBottom:16}}>
        <div><span className="softTag">RECEITA LIVRE</span><h2>Cadastre a receita do seu jeito.</h2><p>Digite qualquer ingrediente, pote, adesivo ou insumo. Se o item ainda não existir, ele será criado no estoque automaticamente. Na produção, tudo que estiver na ficha técnica é baixado do estoque.</p></div>
      </div>
      <div className="productGrid">{data.products.map(p=>{const cost=productUnitCost(p,data.ingredients);const packCount=p.recipe.filter(r=>{const item=data.ingredients.find(i=>i.id===r.ingredientId);return item&&itemCategory(item)!=='Ingrediente'}).length;return <div className="card productCard" key={p.id}><div className="productTop"><div className="productEmoji">🍓</div><div style={{display:'flex',alignItems:'center',gap:8}}><span className={`softTag ${p.active?'':'muted'}`}>{p.active?'Ativo':'Pausado'}</span><div className="rowActions"><button className="iconBtn" title="Editar produto" onClick={()=>openEditProd(p)}><Pencil size={16}/></button><button className="iconBtn danger" title="Excluir produto" onClick={()=>removeProd(p.id)}><Trash2 size={16}/></button></div></div></div><h3>{p.name}</h3><div className="priceLine"><strong>{brl(p.salePrice)}</strong><span>venda</span></div><div className="miniStats"><div><span>Custo/un.</span><b>{brl(cost)}</b></div><div><span>Margem</span><b>{p.salePrice?`${(((p.salePrice-cost)/p.salePrice)*100).toFixed(1)}%`:'0%'}</b></div><div><span>Rendimento</span><b>{p.yield} un.</b></div></div><div className="recipePreview"><span>Ficha técnica • {p.recipe.length} itens{packCount?` • ${packCount} embalagem/insumo`:''}</span>{p.recipe.slice(0,7).map(r=>{const item=data.ingredients.find(i=>i.id===r.ingredientId);return <small key={r.ingredientId}>{item?.name||'Item'} • {fmt(r.quantity)} {item?.unit}</small>})}{p.recipe.length>7&&<small>+ {p.recipe.length-7} itens...</small>}</div></div>})}</div>
    </>:
    <>
      <div className="heroCard" style={{marginBottom:16}}>
        <div><span className="softTag">ESTOQUE CONECTADO ÀS RECEITAS</span><h2>Ingredientes, embalagens e insumos no mesmo lugar.</h2><p>O custo usa o preço e a quantidade de compra. A produção usa g, ml, kg, litros ou unidades e desconta automaticamente tudo o que estiver ligado à receita.</p></div>
      </div>

      <div className="card tableCard"><div className="tableWrap"><table>
        <thead><tr><th>Item</th><th>Tipo</th><th>Como compro</th><th>Tenho agora</th><th>Usado em</th><th>Ações</th></tr></thead>
        <tbody>{data.ingredients.map(i=>{
          const usedBy=data.products.filter(p=>p.recipe.some(r=>r.ingredientId===i.id));
          return <tr key={i.id}>
            <td><strong>{i.name}</strong><small>{i.packageNote||`1 ${i.packageLabel||'embalagem'} = ${fmt(i.purchaseQuantity)} ${i.unit}`}</small></td>
            <td><span className={`stockType stockType-${itemCategory(i).toLowerCase()}`}>{itemCategory(i)}</span></td>
            <td><strong>{packageText(i)}</strong><small>{fmt(contentTotal(i))} {i.unit} no total • {purchasePackages(i)>1?`${brl(i.purchaseCost)} cada • `:''}{brl(purchaseTotal(i))}</small></td>
            <td><strong className={i.stock<=i.minStock?'dangerText':''}>{fmt(Number(i.stock)||0)} {i.unit}</strong><small>{i.purchaseQuantity>0?`≈ ${(Number(i.stock||0)/i.purchaseQuantity).toFixed(1)} ${i.packageLabel||'emb.'}`:''}</small></td>
            <td>{usedBy.length?<><strong>{usedBy.length} {usedBy.length===1?'receita':'receitas'}</strong><small>{usedBy.slice(0,2).map(p=>p.name).join(' • ')}{usedBy.length>2?'…':''}</small></>:<span className="mutedText">não usado</span>}</td>
            <td><div className="rowActions"><button className="iconBtn" title="Editar item" onClick={()=>openEditIng(i)}><Pencil size={16}/></button><button className="iconBtn danger" title="Excluir item" onClick={()=>removeIng(i.id)}><Trash2 size={16}/></button></div></td>
          </tr>
        })}</tbody>
      </table></div></div>
    </>}

    {ingModal&&<Modal title={editingIngId?'Editar item do estoque':'Novo item no estoque'} onClose={closeIng} footer={<><button className="secondary" onClick={closeIng}>Cancelar</button><button className="primary" onClick={saveIng}><Save size={17}/> {editingIngId?'Salvar alterações':'Salvar item'}</button></>}>
      <div className="insightBox" style={{marginBottom:16}}><strong>Um único estoque</strong><span>Cadastre ingrediente, embalagem ou insumo. O valor por g/ml/unidade é calculado automaticamente pelo preço e conteúdo da embalagem de compra.</span></div>
      <div className="formGrid">
        <Field label="Nome" wide><input value={ing.name||''} onChange={e=>setIng({...ing,name:e.target.value})}/></Field>
        <Field label="Tipo"><select value={ing.category||'Ingrediente'} onChange={e=>setIng({...ing,category:e.target.value as StockItemCategory})}>{['Ingrediente','Embalagem','Insumo'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Unidade controlada"><select value={ing.unit} onChange={e=>setIng({...ing,unit:e.target.value as Unit})}>{['un','g','kg','ml','l','pct'].map(u=><option key={u}>{u}</option>)}</select></Field>
        <Field label="Embalagem de compra"><input placeholder="caixa, pacote, bandeja..." value={ing.packageLabel||''} onChange={e=>setIng({...ing,packageLabel:e.target.value})}/></Field>
        <Field label="Quantas embalagens costuma comprar"><input type="number" min="1" value={ing.defaultPurchasePackages||1} onChange={e=>setIng({...ing,defaultPurchasePackages:Number(e.target.value)})}/></Field>
        <Field label="Quanto vem em CADA embalagem"><input type="number" min="0" step="0.01" value={ing.purchaseQuantity||0} onChange={e=>setIng({...ing,purchaseQuantity:Number(e.target.value)})}/></Field>
        <Field label="Preço por embalagem"><MoneyInput value={Number(ing.purchaseCost)||0} onChange={v=>setIng({...ing,purchaseCost:v})}/></Field>
        <Field label={`Estoque atual (${ing.unit||'un'})`}><input type="number" min="0" step="0.01" value={ing.stock||0} onChange={e=>setIng({...ing,stock:Number(e.target.value)})}/></Field>
        <Field label={`Alerta mínimo (${ing.unit||'un'})`}><input type="number" min="0" step="0.01" value={ing.minStock||0} onChange={e=>setIng({...ing,minStock:Number(e.target.value)})}/></Field>
        <Field label="Observação" wide><input placeholder="Ex.: 1 pacote = 100 potes" value={ing.packageNote||''} onChange={e=>setIng({...ing,packageNote:e.target.value})}/></Field>
      </div>
      <div className="totalPreview"><span>Compra normal</span><strong>{Math.max(1,Number(ing.defaultPurchasePackages)||1)} × {ing.packageLabel||'embalagem'} = {fmt(Math.max(1,Number(ing.defaultPurchasePackages)||1)*(Number(ing.purchaseQuantity)||0))} {ing.unit} • {brl(Math.max(1,Number(ing.defaultPurchasePackages)||1)*(Number(ing.purchaseCost)||0))}</strong></div>
    </Modal>}

    {prodModal&&<Modal title={editingProdId?'Editar receita / produto':'Nova receita / produto'} onClose={closeProd} footer={<><button className="secondary" onClick={closeProd}>Cancelar</button><button className="primary" onClick={saveProd}><Save size={17}/> {editingProdId?'Salvar alterações':'Salvar receita'}</button></>}>
      <div className="formGrid">
        <Field label="Nome" wide><input placeholder="Ex.: Morango do Amor" value={prod.name||''} onChange={e=>setProd({...prod,name:e.target.value})}/></Field>
        <Field label="Preço de venda"><MoneyInput value={Number(prod.salePrice)||0} onChange={v=>setProd({...prod,salePrice:v})}/></Field>
        <Field label="Rendimento da receita"><input type="number" min="1" value={prod.yield||1} onChange={e=>setProd({...prod,yield:Number(e.target.value)})}/></Field>
        <Field label="Custo extra por unidade"><MoneyInput value={Number(prod.packagingCost)||0} onChange={v=>setProd({...prod,packagingCost:v})}/></Field>
        <Field label="Status"><label className="check"><input type="checkbox" checked={prod.active!==false} onChange={e=>setProd({...prod,active:e.target.checked})}/> Produto ativo</label></Field>
        <Field label="Modo de preparo / observações" wide><textarea placeholder="Opcional: preparo, validade, conservação..." value={prod.preparation||''} onChange={e=>setProd({...prod,preparation:e.target.value})}/></Field>
      </div>

      <div className="recipeBuilder">
        <div className="sectionTitle"><div><p className="eyebrow">FICHA TÉCNICA LIVRE</p><h3>O que vai nessa receita?</h3></div><div className="rowActions"><button className="ghost" onClick={()=>setImportOpen(v=>!v)}><Upload size={16}/> importar TXT</button><button className="ghost" onClick={addRecipeItem}><Plus size={16}/> item</button></div></div>
        <p className="mutedText">Pode digitar um item que já existe ou um nome totalmente novo. Item novo entra no estoque automaticamente ao salvar.</p>

        {importOpen&&<div className="recipeImportBox">
          <div className="recipeImportTop"><strong>Colar ou carregar receita</strong><label className="secondary fileButton"><Upload size={15}/> Abrir .txt<input type="file" accept="text/plain,.txt" onChange={async e=>{const f=e.target.files?.[0];if(f)setImportText(await f.text())}}/></label></div>
          <textarea placeholder={'Exemplo:\nRendimento: 20\nIngredientes:\n395 g leite condensado\n80 g leite em pó\n20 un morango\n\nEmbalagens:\n20 un pote\n20 un adesivo'} value={importText} onChange={e=>setImportText(e.target.value)}/>
          <div className="recipeImportActions"><button className="secondary" onClick={()=>{setImportOpen(false);setImportText('')}}>Fechar</button><button className="primary" onClick={importRecipe}>Importar itens</button></div>
        </div>}

        <datalist id="stock-item-options">{data.ingredients.map(i=><option key={i.id} value={i.name}/>)}</datalist>
        {recipeDraft.length===0?<div className="recipeEmpty"><strong>Receita vazia</strong><span>Adicione um item ou importe um TXT para começar.</span></div>:recipeDraft.map((r,idx)=>{
          const existing=r.ingredientId?data.ingredients.find(i=>i.id===r.ingredientId):data.ingredients.find(i=>cleanName(i.name)===cleanName(r.name));
          return <div className="recipeLine smart" key={r.key}>
            <div className="recipeNameCell"><input list="stock-item-options" placeholder="Digite o ingrediente, pote, adesivo..." value={r.name} onChange={e=>updateRecipeName(idx,e.target.value)}/><small className={existing?'exists':'new'}>{existing?'✓ já existe no estoque':'novo • será criado no estoque'}</small></div>
            <input aria-label="Quantidade" type="number" min="0" step="0.01" value={r.quantity} onChange={e=>setRecipeDraft(rows=>rows.map((x,i)=>i===idx?{...x,quantity:Number(e.target.value)}:x))}/>
            <select aria-label="Unidade" value={r.unit} disabled={Boolean(existing)} onChange={e=>setRecipeDraft(rows=>rows.map((x,i)=>i===idx?{...x,unit:e.target.value as Unit}:x))}>{['un','g','kg','ml','l','pct'].map(u=><option key={u}>{u}</option>)}</select>
            <select aria-label="Tipo" value={r.category} disabled={Boolean(existing)} onChange={e=>setRecipeDraft(rows=>rows.map((x,i)=>i===idx?{...x,category:e.target.value as StockItemCategory}:x))}>{['Ingrediente','Embalagem','Insumo'].map(x=><option key={x}>{x}</option>)}</select>
            <button className="iconBtn danger" title="Remover item da receita" onClick={()=>setRecipeDraft(rows=>rows.filter((_,i)=>i!==idx))}><Trash2 size={16}/></button>
          </div>
        })}
        <div className="recipeLegend"><span>Quantidade</span><span>Unidade</span><span>Tipo</span></div>
      </div>
    </Modal>}
  </section>
}

function Purchases({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [mode,setMode]=useState<'list'|'nfce'>('list'); const [manual,setManual]=useState(false);
  const [qrUrl,setQrUrl]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [preview,setPreview]=useState<any>(null);
  const [nfcePaymentMethod,setNfcePaymentMethod]=useState<PaymentMethod>('Pix');
  const [purchase,setPurchase]=useState<Partial<Purchase>>({date:today(),store:'',source:'Manual',items:[],total:0,paymentMethod:'Pix'});
  const importNfce=async(url=qrUrl)=>{setLoading(true);setError('');setPreview(null);try{const r=await fetch('/api/nfce/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao importar nota');setPreview(j);setQrUrl(url)}catch(e:any){setError(e.message)}finally{setLoading(false)}};
  const confirmNfce=()=>{if(!preview)return;const items:PurchaseItem[]=(preview.items||[]).map((x:any)=>({id:uid(),name:x.name||'Item',quantity:Number(x.quantity)||1,unit:(x.unit||'un') as Unit,total:Number(x.total)||0}));const total=Number(preview.total)||items.reduce((sum,i)=>sum+i.total,0);const p:Purchase={id:uid(),date:preview.date||today(),store:preview.store||'Mercado',source:'NFC-e',paymentMethod:nfcePaymentMethod,accessKey:preview.accessKey,qrUrl,items,total};setData(d=>({...d,purchases:[p,...d.purchases]}));setPreview(null);setMode('list')};
  const addManualItem=()=>setPurchase({...purchase,items:[...(purchase.items||[]),{id:uid(),name:'',quantity:1,unit:'un',total:0}]});
  const saveManual=()=>{const items=purchase.items||[];const p:Purchase={id:uid(),date:purchase.date||today(),store:purchase.store||'Mercado',source:'Manual',paymentMethod:purchase.paymentMethod||'Outro',items,total:items.reduce((sum,i)=>sum+Number(i.total),0)};setData(d=>({...d,purchases:[p,...d.purchases]}));setManual(false);setPurchase({date:today(),store:'',source:'Manual',items:[],total:0,paymentMethod:'Pix'})};
  return <section className="content">
    <div className="toolbar"><div className="segmented"><button className={mode==='list'?'active':''} onClick={()=>setMode('list')}>Histórico</button><button className={mode==='nfce'?'active':''} onClick={()=>setMode('nfce')}>Importar NFC-e</button></div>{mode==='list'&&<button className="primary" onClick={()=>setManual(true)}><Plus size={18}/> Compra manual</button>}</div>
    {mode==='list'?<>
      <div className="metricsGrid three"><Metric icon={ReceiptText} label="Notas importadas" value={`${data.purchases.filter(p=>p.source==='NFC-e').length}`} note="via QR Code NFC-e"/><Metric icon={ShoppingBasket} label="Compras registradas" value={`${data.purchases.length}`} note="manual + NFC-e"/><Metric icon={BadgeDollarSign} label="Total em compras" value={brl(data.purchases.reduce((sum,p)=>sum+p.total,0))} note="histórico completo"/></div>
      <div className="card tableCard"><div className="tableWrap"><table><thead><tr><th>Data</th><th>Mercado</th><th>Origem</th><th>Pagamento</th><th>Itens</th><th>Total</th></tr></thead><tbody>{data.purchases.map(p=><tr key={p.id}><td>{new Date(`${p.date}T12:00`).toLocaleDateString('pt-BR')}</td><td><strong>{p.store}</strong>{p.accessKey&&<small>chave …{p.accessKey.slice(-8)}</small>}</td><td><span className="softTag">{p.source}</span></td><td>{p.paymentMethod||'Outro'}</td><td>{p.items.length}</td><td><strong>{brl(p.total)}</strong></td></tr>)}{!data.purchases.length&&<tr><td colSpan={6}><Empty icon={ReceiptText} title="Nenhuma compra registrada" text="Escaneie o QR Code da NFC-e ou cadastre manualmente."/></td></tr>}</tbody></table></div></div>
    </>:<div className="twoCols nfceGrid">
      <div className="card">
        <div className="sectionTitle"><div><p className="eyebrow">LEITOR NFC-e</p><h3>Escaneie o QR Code da nota</h3></div><div className="metricIcon"><QrCode size={20}/></div></div>
        <p className="mutedText">A câmera lê o link da NFC-e. Depois o servidor tenta buscar os itens da nota automaticamente.</p>
        <QrScanner onResult={(value)=>{setQrUrl(value);importNfce(value)}}/>
        <div className="divider"><span>ou cole o link</span></div>
        <Field label="URL da NFC-e"><textarea className="urlInput" placeholder="https://...fazenda.../qrcode?..." value={qrUrl} onChange={e=>setQrUrl(e.target.value)}/></Field>
        <button className="primary full" disabled={!qrUrl||loading} onClick={()=>importNfce()}>{loading?<><span className="tinySpinner"/> Lendo nota...</>:<><ReceiptText size={18}/> Buscar itens da nota</>}</button>
        {error&&<div className="errorBox"><AlertTriangle size={18}/><div><strong>Não consegui ler automaticamente</strong><span>{error}</span><small>Alguns portais da SEFAZ bloqueiam robôs. Você ainda pode abrir a nota e cadastrar manualmente.</small></div></div>}
      </div>
      <div className="card">
        <div className="sectionTitle"><div><p className="eyebrow">PRÉVIA</p><h3>Itens encontrados</h3></div></div>
        {preview?<><div className="receiptHead"><div><strong>{preview.store||'Estabelecimento'}</strong><span>{preview.date?new Date(`${preview.date}T12:00`).toLocaleDateString('pt-BR'):'Data não identificada'}</span></div><span className="softTag">{preview.parser||'NFC-e'}</span></div><div className="receiptItems">{(preview.items||[]).map((i:any,idx:number)=><div key={idx}><span>{i.name}<small>{i.quantity||1} {i.unit||'un'}</small></span><strong>{brl(Number(i.total)||0)}</strong></div>)}</div><div className="receiptTotal"><span>Total</span><strong>{brl(Number(preview.total)||0)}</strong></div>{preview.warning&&<div className="importWarning"><AlertTriangle size={18}/><div><strong>Confira antes de importar</strong><span>{preview.warning}</span><small>{(preview.items||[]).length} itens encontrados somam {brl(Number(preview.itemsTotal)||0)}, enquanto a nota informa {brl(Number(preview.total)||0)}.</small></div></div>}<Field label="Pago com"><select value={nfcePaymentMethod} onChange={e=>setNfcePaymentMethod(e.target.value as PaymentMethod)}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field><button className="primary full" onClick={confirmNfce}><CheckCircle2 size={18}/> {preview.incompleteItems?'Importar mesmo assim':'Importar compra e descontar do saldo'}</button></>:<Empty icon={ReceiptText} title="A nota aparece aqui" text="Escaneie ou cole o QR Code para importar os itens."/>}
      </div>
    </div>}
    {manual&&<Modal title="Registrar compra" onClose={()=>setManual(false)} footer={<button className="primary" onClick={saveManual}><Save size={17}/> Salvar compra</button>}><div className="formGrid"><Field label="Mercado"><input value={purchase.store||''} onChange={e=>setPurchase({...purchase,store:e.target.value})}/></Field><Field label="Data"><input type="date" value={purchase.date} onChange={e=>setPurchase({...purchase,date:e.target.value})}/></Field><Field label="Pagamento"><select value={purchase.paymentMethod||'Outro'} onChange={e=>setPurchase({...purchase,paymentMethod:e.target.value as PaymentMethod})}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field></div><div className="recipeBuilder"><div className="sectionTitle"><div><p className="eyebrow">ITENS</p><h3>O que foi comprado</h3></div><button className="ghost" onClick={addManualItem}><Plus size={16}/> item</button></div>{(purchase.items||[]).map((i,idx)=><div className="purchaseLine" key={i.id}><input placeholder="Produto" value={i.name} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,name:e.target.value};setPurchase({...purchase,items:a})}}/><input type="number" value={i.quantity} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,quantity:Number(e.target.value)};setPurchase({...purchase,items:a})}}/><select value={i.unit} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,unit:e.target.value as Unit};setPurchase({...purchase,items:a})}}>{['un','g','kg','ml','l','pct'].map(u=><option key={u}>{u}</option>)}</select><MoneyInput value={i.total} onChange={v=>{const a=[...(purchase.items||[])];a[idx]={...i,total:v};setPurchase({...purchase,items:a})}}/><button className="iconBtn danger" onClick={()=>setPurchase({...purchase,items:(purchase.items||[]).filter((_,x)=>x!==idx)})}><Trash2 size={16}/></button></div>)}</div></Modal>}
  </section>
}

function Finance({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const m = monthlyMetrics(data);
  const ledger = financeTransactions(data);
  const balance = financeBalance(data);
  const monthCash = financeMonthSummary(data);

  const emptyExpense: Partial<Expense> = {date:today(),category:'Outro',description:'',amount:0,recurring:false,paymentMethod:'Pix',payee:''};
  const [expenseModal,setExpenseModal] = useState(false);
  const [editingExpenseId,setEditingExpenseId] = useState<string | null>(null);
  const [exp,setExp] = useState<Partial<Expense>>(emptyExpense);

  const [movementModal,setMovementModal] = useState(false);
  const [movementType,setMovementType] = useState<'Entrada'|'Saída'>('Entrada');
  const [movement,setMovement] = useState({date:today(),description:'',person:'',amount:0,paymentMethod:'Pix' as PaymentMethod});

  const [initialBalance,setInitialBalance] = useState(0);
  const [reconcileModal,setReconcileModal] = useState(false);
  const [realBalance,setRealBalance] = useState(balance);
  const [reconcileNote,setReconcileNote] = useState('Conciliação de saldo');

  const [profitMonth,setProfitMonth] = useState(monthKey());
  const profitMetrics = monthlyMetrics(data, profitMonth);
  const distributableProfit = Math.max(0, profitMetrics.profit);
  const shareTotal = data.finance.profitShares.reduce((sum,s)=>sum+Number(s.percentage||0),0);
  const monthOptions = useMemo(()=>{
    const keys = new Set<string>([monthKey()]);
    data.orders.forEach(o=>keys.add(o.createdAt.slice(0,7)));
    data.expenses.forEach(e=>keys.add(e.date.slice(0,7)));
    data.purchases.forEach(p=>keys.add(p.date.slice(0,7)));
    data.finance.manualTransactions.forEach(t=>keys.add(t.date.slice(0,7)));
    return [...keys].filter(k=>/^\d{4}-\d{2}$/.test(k)).sort().reverse();
  },[data.orders,data.expenses,data.purchases,data.finance.manualTransactions]);

  const monthLabel=(key:string)=>new Date(`${key}-01T12:00:00`).toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  const defineInitialBalance=()=>{
    setData(d=>({...d,finance:{
      ...d.finance,
      initialBalance:Number(initialBalance)||0,
      initialBalanceSet:true,
      initialBalanceDate:today(),
      baselineSourceIds:autoFinanceSourceIds(d),
    }}));
  };

  const openMovement=(type:'Entrada'|'Saída')=>{
    setMovementType(type);
    setMovement({date:today(),description:type==='Entrada'?'Recebimento':'Pagamento',person:'',amount:0,paymentMethod:'Pix'});
    setMovementModal(true);
  };

  const saveMovement=()=>{
    if(!movement.description.trim() || Number(movement.amount)<=0) return;
    const tx:FinanceTransaction={
      id:uid(),date:movement.date||today(),createdAt:new Date().toISOString(),type:movementType,
      description:movement.description.trim(),person:movement.person.trim(),amount:Math.abs(Number(movement.amount)||0),
      paymentMethod:movement.paymentMethod,source:'Manual'
    };
    setData(d=>({...d,finance:{...d.finance,manualTransactions:[tx,...d.finance.manualTransactions]}}));
    setMovementModal(false);
  };

  const saveReconciliation=()=>{
    const difference=Number(realBalance)-balance;
    if(Math.abs(difference)<0.005){setReconcileModal(false);return;}
    const tx:FinanceTransaction={
      id:uid(),date:today(),createdAt:new Date().toISOString(),type:'Ajuste',description:reconcileNote.trim()||'Conciliação de saldo',
      person:'Ajuste interno',amount:difference,paymentMethod:'Outro',source:'Ajuste'
    };
    setData(d=>({...d,finance:{...d.finance,manualTransactions:[tx,...d.finance.manualTransactions]}}));
    setReconcileModal(false);
  };

  const removeManualTransaction=(id:string)=>{
    if(!confirm('Excluir esta movimentação manual?')) return;
    setData(d=>({...d,finance:{...d.finance,manualTransactions:d.finance.manualTransactions.filter(t=>t.id!==id)}}));
  };

  const openNewExpense=()=>{setEditingExpenseId(null);setExp({...emptyExpense,date:today()});setExpenseModal(true)};
  const openEditExpense=(expense:Expense)=>{setEditingExpenseId(expense.id);setExp({...expense});setExpenseModal(true)};
  const closeExpenseModal=()=>{setExpenseModal(false);setEditingExpenseId(null);setExp({...emptyExpense,date:today()})};
  const saveExpense=()=>{
    if(!exp.description?.trim()) return;
    const expense:Expense={
      id:editingExpenseId||uid(),date:exp.date||today(),category:(exp.category as Expense['category'])||'Outro',
      description:exp.description.trim(),amount:Number(exp.amount)||0,recurring:!!exp.recurring,
      paymentMethod:exp.paymentMethod||'Outro',payee:exp.payee?.trim()||undefined
    };
    setData(d=>({...d,expenses:editingExpenseId?d.expenses.map(e=>e.id===editingExpenseId?expense:e):[expense,...d.expenses]}));
    closeExpenseModal();
  };
  const removeExpense=(id:string)=>confirm('Excluir esta despesa? Essa saída também será removida do saldo.')&&setData(d=>({...d,expenses:d.expenses.filter(e=>e.id!==id)}));

  const updateShare=(id:string,field:'name'|'percentage',value:string|number)=>{
    setData(d=>({...d,finance:{...d.finance,profitShares:d.finance.profitShares.map(s=>{
      if(s.id!==id) return s;
      return field==='percentage' ? {...s,percentage:Number(value)} : {...s,name:String(value)};
    })}}));
  };

  return <section className="content">
    {!data.finance.initialBalanceSet ? <div className="balanceSetup card">
      <div className="balanceSetupIcon"><Landmark size={26}/></div>
      <div className="grow"><p className="eyebrow">PRIMEIRA CONFIGURAÇÃO</p><h2>Quanto a empresa tem agora?</h2><p className="mutedText">Informe o saldo atual uma única vez. O que já está cadastrado no sistema será considerado parte desse saldo e não será descontado de novo.</p></div>
      <div className="balanceSetupAction"><MoneyInput value={initialBalance} onChange={setInitialBalance}/><button className="primary" onClick={defineInitialBalance}><LockKeyhole size={17}/> Definir saldo inicial</button></div>
    </div> : <>
      <div className="bankHero">
        <div><p className="eyebrow light">CAIXA DA CONFEITARIA</p><span>Saldo da empresa</span><strong>{brl(balance)}</strong><small><LockKeyhole size={12}/> saldo inicial definido em {data.finance.initialBalanceDate?new Date(`${data.finance.initialBalanceDate}T12:00`).toLocaleDateString('pt-BR'):'—'} • {brl(data.finance.initialBalance)}</small></div>
        <div className="bankActions"><button onClick={()=>openMovement('Entrada')}><ArrowDownLeft size={18}/> Receber Pix</button><button onClick={()=>openMovement('Saída')}><ArrowUpRight size={18}/> Registrar pagamento</button><button onClick={()=>{setRealBalance(balance);setReconcileModal(true)}}><Scale size={18}/> Conciliar</button></div>
      </div>

      <div className="metricsGrid">
        <Metric icon={ArrowDownLeft} label="Entradas do mês" value={brl(monthCash.entries)} note="recebimentos registrados" positive/>
        <Metric icon={ArrowUpRight} label="Saídas do mês" value={brl(monthCash.exits)} note="compras + despesas + pagamentos"/>
        <Metric icon={WalletCards} label="Movimentação líquida" value={brl(monthCash.net)} note={`${monthCash.count} movimentos no mês`} positive={monthCash.net>=0}/>
        <Metric icon={TrendingUp} label="Lucro estimado" value={brl(m.profit)} note="resultado contábil do mês" positive={m.profit>=0}/>
      </div>

      <div className="card tableCard financeLedger">
        <div className="sectionTitle padded"><div><p className="eyebrow">CONTA DA EMPRESA</p><h3>Extrato</h3></div><span className="softTag">automático + manual</span></div>
        <div className="tableWrap"><table><thead><tr><th>Data</th><th>Movimento</th><th>Descrição</th><th>Para / de quem</th><th>Forma</th><th>Origem</th><th>Valor</th><th></th></tr></thead><tbody>
          {ledger.map(t=><tr key={t.id}><td>{new Date(`${t.date}T12:00`).toLocaleDateString('pt-BR')}</td><td><span className={`movementTag ${t.type==='Entrada'?'in':t.type==='Saída'?'out':'adjust'}`}>{t.type}</span></td><td><strong>{t.description}</strong></td><td>{t.person||'—'}</td><td>{t.paymentMethod}</td><td><span className="softTag">{t.source}</span></td><td><strong className={t.type==='Entrada'||(t.type==='Ajuste'&&t.amount>0)?'moneyIn':t.type==='Saída'||t.amount<0?'moneyOut':''}>{t.type==='Entrada'?'+':t.type==='Saída'?'-':t.amount>=0?'+':''}{brl(Math.abs(t.amount))}</strong></td><td>{(t.source==='Manual'||t.source==='Ajuste')&&<button className="iconBtn danger" onClick={()=>removeManualTransaction(t.id)}><Trash2 size={15}/></button>}</td></tr>)}
          {!ledger.length&&<tr><td colSpan={8}><Empty icon={WalletCards} title="Sem movimentações ainda" text="Recebimentos, compras e despesas novas aparecerão aqui automaticamente."/></td></tr>}
        </tbody></table></div>
      </div>
    </>}

    <div className="profitCard card">
      <div className="sectionTitle"><div><p className="eyebrow">FECHAMENTO MENSAL</p><h3>Divisão de lucros</h3></div><select className="monthSelect" value={profitMonth} onChange={e=>setProfitMonth(e.target.value)}>{monthOptions.map(k=><option key={k} value={k}>{monthLabel(k)}</option>)}</select></div>
      <div className="profitSummary"><div><span>Faturamento</span><strong>{brl(profitMetrics.revenue)}</strong></div><div><span>Custos + despesas</span><strong>{brl(profitMetrics.cogs+profitMetrics.expenses+profitMetrics.fixed)}</strong></div><div className="profitResult"><span>Lucro para dividir</span><strong>{brl(distributableProfit)}</strong></div></div>
      <div className="profitShares">
        {data.finance.profitShares.map(share=><div className="profitShare" key={share.id}><input className="shareName" value={share.name} onChange={e=>updateShare(share.id,'name',e.target.value)}/><div className="sharePercent"><input type="number" min="0" max="100" step="1" value={share.percentage} onChange={e=>updateShare(share.id,'percentage',e.target.value)}/><span>%</span></div><strong>{brl(distributableProfit*(Number(share.percentage)||0)/100)}</strong></div>)}
      </div>
      <div className={`shareCheck ${Math.abs(shareTotal-100)<0.01?'ok':'bad'}`}><span>Total da divisão</span><strong>{shareTotal.toFixed(0)}%</strong><small>{Math.abs(shareTotal-100)<0.01?'✓ Fechou 100%':'Ajuste as porcentagens até fechar 100%'}</small></div>
      <p className="mutedText noMargin">A divisão é calculada no fim de cada mês e não mexe no saldo automaticamente. Quando vocês realmente retirarem o dinheiro, use “Registrar pagamento”.</p>
    </div>

    <div className="twoCols">
      <div className="card"><div className="sectionTitle"><div><p className="eyebrow">MARKETING</p><h3>Retorno dos anúncios</h3></div><Megaphone size={20}/></div><div className="adMetrics"><div><span>Gasto Meta Ads</span><strong>{brl(m.ads)}</strong></div><div><span>Pedidos atribuídos</span><strong>{m.adOrders}</strong></div><div><span>CPA</span><strong>{m.adOrders?brl(m.cpa):'—'}</strong></div><div><span>ROAS</span><strong>{m.ads?`${m.roas.toFixed(2)}x`:'—'}</strong></div></div><small className="helper">Para atribuir, selecione “Facebook Ads” na origem do pedido.</small></div>
      <div className="card"><div className="sectionTitle"><div><p className="eyebrow">RESULTADO</p><h3>De onde sai o lucro</h3></div></div><div className="waterfall"><div><span>Faturamento</span><b>{brl(m.revenue)}</b></div><div><span>− custo dos produtos</span><b>{brl(m.cogs)}</b></div><div><span>− despesas variáveis</span><b>{brl(m.expenses)}</b></div><div><span>− MEI + fixos</span><b>{brl(m.fixed)}</b></div><div className="total"><span>= lucro estimado</span><b>{brl(m.profit)}</b></div></div></div>
    </div>

    <div className="card tableCard"><div className="sectionTitle padded"><div><p className="eyebrow">SAÍDAS</p><h3>Despesas</h3></div><button className="primary" onClick={openNewExpense}><Plus size={17}/> Nova despesa</button></div><div className="tableWrap"><table><thead><tr><th>Data</th><th>Categoria</th><th>Descrição</th><th>Pago para</th><th>Forma</th><th>Recorrente</th><th>Valor</th><th>Ações</th></tr></thead><tbody>{data.expenses.map(e=><tr key={e.id}><td>{new Date(`${e.date}T12:00`).toLocaleDateString('pt-BR')}</td><td><span className="softTag">{e.category}</span></td><td>{e.description}</td><td>{e.payee||'—'}</td><td>{e.paymentMethod||'Outro'}</td><td>{e.recurring?'Sim':'Não'}</td><td><strong>{brl(e.amount)}</strong></td><td><div className="rowActions"><button className="iconBtn" title="Editar despesa" onClick={()=>openEditExpense(e)}><Pencil size={16}/></button><button className="iconBtn danger" title="Excluir despesa" onClick={()=>removeExpense(e.id)}><Trash2 size={16}/></button></div></td></tr>)}{!data.expenses.length&&<tr><td colSpan={8}><Empty icon={WalletCards} title="Nenhuma despesa registrada" text="Cadastre os gastos da confeitaria por aqui."/></td></tr>}</tbody></table></div></div>

    {movementModal&&<Modal title={movementType==='Entrada'?'Receber / registrar entrada':'Registrar pagamento'} onClose={()=>setMovementModal(false)} footer={<><button className="secondary" onClick={()=>setMovementModal(false)}>Cancelar</button><button className="primary" onClick={saveMovement}><Save size={17}/> Registrar</button></>}><p className="mutedText">{movementType==='Entrada'?'Pedidos entram automaticamente quando você marca “Pago”. Use esta opção para entradas avulsas, para não duplicar recebimentos.':'Compras e despesas cadastradas já saem do saldo automaticamente. Use esta opção para pagamentos/retiradas que não estejam registrados em outro lugar.'}</p><div className="formGrid"><Field label="Data"><input type="date" value={movement.date} onChange={e=>setMovement({...movement,date:e.target.value})}/></Field><Field label={movementType==='Entrada'?'Recebido de':'Pago para'}><input placeholder={movementType==='Entrada'?'Nome do cliente / pessoa':'Mercado / pessoa / empresa'} value={movement.person} onChange={e=>setMovement({...movement,person:e.target.value})}/></Field><Field label="Descrição" wide><input value={movement.description} onChange={e=>setMovement({...movement,description:e.target.value})}/></Field><Field label="Valor"><MoneyInput value={movement.amount} onChange={v=>setMovement({...movement,amount:v})}/></Field><Field label="Forma"><select value={movement.paymentMethod} onChange={e=>setMovement({...movement,paymentMethod:e.target.value as PaymentMethod})}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field></div></Modal>}

    {reconcileModal&&<Modal title="Conciliar saldo" onClose={()=>setReconcileModal(false)} footer={<><button className="secondary" onClick={()=>setReconcileModal(false)}>Cancelar</button><button className="primary" onClick={saveReconciliation}><Scale size={17}/> Registrar ajuste</button></>}><p className="mutedText">O sistema calcula {brl(balance)}. Digite quanto realmente aparece na conta/caixa. A diferença vira um ajuste registrado no extrato, sem editar o saldo inicial.</p><div className="formGrid"><Field label="Saldo real"><MoneyInput value={realBalance} onChange={setRealBalance}/></Field><Field label="Diferença"><div className={`readOnlyMoney ${realBalance-balance>=0?'moneyIn':'moneyOut'}`}>{realBalance-balance>=0?'+':''}{brl(realBalance-balance)}</div></Field><Field label="Motivo" wide><input value={reconcileNote} onChange={e=>setReconcileNote(e.target.value)}/></Field></div></Modal>}

    {expenseModal&&<Modal title={editingExpenseId?'Editar despesa':'Nova despesa'} onClose={closeExpenseModal} footer={<><button className="secondary" onClick={closeExpenseModal}>Cancelar</button><button className="primary" onClick={saveExpense}><Save size={17}/> {editingExpenseId?'Salvar alterações':'Salvar'}</button></>}><div className="formGrid"><Field label="Data"><input type="date" value={exp.date||today()} onChange={e=>setExp({...exp,date:e.target.value})}/></Field><Field label="Categoria"><select value={exp.category} onChange={e=>setExp({...exp,category:e.target.value as Expense['category']})}>{['Anúncios','Entrega','Utensílios','Taxas','MEI/DAS','Sistema','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Descrição" wide><input value={exp.description||''} onChange={e=>setExp({...exp,description:e.target.value})}/></Field><Field label="Pago para"><input placeholder="Ex.: Meta, mercado, motoboy..." value={exp.payee||''} onChange={e=>setExp({...exp,payee:e.target.value})}/></Field><Field label="Forma"><select value={exp.paymentMethod||'Outro'} onChange={e=>setExp({...exp,paymentMethod:e.target.value as PaymentMethod})}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Valor"><MoneyInput value={Number(exp.amount)||0} onChange={v=>setExp({...exp,amount:v})}/></Field><Field label="Recorrente"><label className="check"><input type="checkbox" checked={!!exp.recurring} onChange={e=>setExp({...exp,recurring:e.target.checked})}/> Repetir mensalmente</label></Field></div></Modal>}
  </section>
}

function SettingsPanel({data,setData,reset,exportJson,importJson}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>;reset:()=>void;exportJson:()=>void;importJson:(f:File)=>Promise<void>}) {
  return <section className="content settingsGrid">
    <div className="card"><div className="sectionTitle"><div><p className="eyebrow">NEGÓCIO</p><h3>Custos e padrões</h3></div></div><div className="formGrid oneCol"><Field label="Nome do negócio"><input value={data.settings.businessName} onChange={e=>setData(d=>({...d,settings:{...d.settings,businessName:e.target.value}}))}/></Field><Field label="DAS MEI mensal"><MoneyInput value={data.settings.monthlyMei} onChange={v=>setData(d=>({...d,settings:{...d.settings,monthlyMei:v}}))}/></Field><Field label="Outros custos fixos mensais"><MoneyInput value={data.settings.monthlyFixedCosts} onChange={v=>setData(d=>({...d,settings:{...d.settings,monthlyFixedCosts:v}}))}/></Field><Field label="Taxa padrão de entrega"><MoneyInput value={data.settings.defaultDeliveryFee} onChange={v=>setData(d=>({...d,settings:{...d.settings,defaultDeliveryFee:v}}))}/></Field><Field label="Taxa de cartão (%)"><input type="number" step="0.01" value={data.settings.cardFeePercent} onChange={e=>setData(d=>({...d,settings:{...d.settings,cardFeePercent:Number(e.target.value)}}))}/></Field></div></div>
    <div className="stack">
      <div className="card"><div className="sectionTitle"><div><p className="eyebrow">BACKUP</p><h3>Seus dados</h3></div></div><p className="mutedText">Os dados ficam salvos na nuvem quando você está conectado. O backup JSON continua disponível como segurança extra.</p><div className="buttonStack"><button className="secondary full" onClick={exportJson}><Download size={17}/> Exportar backup JSON</button><label className="secondary full fileButton"><Upload size={17}/> Importar backup<input type="file" accept="application/json" onChange={e=>e.target.files?.[0]&&importJson(e.target.files[0])}/></label></div></div>
      <div className="card cloudCard"><div className="sectionTitle"><div><p className="eyebrow">NUVEM</p><h3>Sincronização Supabase</h3></div><span className="softTag"><Cloud size={13}/> ativa</span></div><p>Use a mesma conta no PC e nos celulares para manter pedidos, estoque, produção e financeiro sincronizados.</p><code>sweet_app_state • realtime</code></div>
      <div className="card dangerZone"><div><div className="sectionTitle"><div><p className="eyebrow">MANUTENÇÃO</p><h3>Dados de demonstração</h3></div></div><p className="mutedText">Volta o app para os dados de exemplo iniciais.</p></div><button className="dangerButton" onClick={()=>confirm('Resetar todos os dados locais?')&&reset()}><RotateCcw size={17}/> Resetar</button></div>
    </div>
  </section>
}

function Status({status}:{status:OrderStatus}) {
  const icon = status==='Entregue'?<CheckCircle2 size={14}/>:status==='Saiu para entrega'?<Truck size={14}/>:<Clock3 size={14}/>;
  return <span className={`status status-${status.toLowerCase().replaceAll(' ','-').replace('ç','c')}`}>{icon}{status}</span>
}

function Empty({icon:Icon,title,text}:{icon:any;title:string;text:string}) {return <div className="empty"><div><Icon size={24}/></div><strong>{title}</strong><span>{text}</span></div>}
function Field({label,children,wide}:{label:string;children:React.ReactNode;wide?:boolean}) {return <label className={`field ${wide?'wide':''}`}><span>{label}</span>{children}</label>}
function MoneyInput({value,onChange}:{value:number;onChange:(v:number)=>void}) {return <div className="moneyInput"><span>R$</span><input type="number" step="0.01" value={value} onChange={e=>onChange(Number(e.target.value))}/></div>}
function Modal({title,onClose,children,footer}:{title:string;onClose:()=>void;children:React.ReactNode;footer?:React.ReactNode}) {return <div className="modalBack" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><div className="modal"><div className="modalHead"><div><p className="eyebrow">SWEET DREAMS</p><h2>{title}</h2></div><button className="iconBtn" onClick={onClose}><X size={20}/></button></div><div className="modalBody">{children}</div>{footer&&<div className="modalFoot">{footer}</div>}</div></div>}
