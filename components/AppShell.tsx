'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import {
  BarChart3, ClipboardList, Factory, PackageOpen, ReceiptText, WalletCards, Settings,
  Plus, Search, CheckCircle2, Clock3, Truck, Trash2, Pencil, Camera, Upload, Download,
  ShoppingBasket, BadgeDollarSign, Boxes, TrendingUp, Users, Megaphone, X, Save, QrCode,
  ChevronRight, AlertTriangle, CircleDollarSign, RotateCcw, Menu, Cloud, LogOut
} from 'lucide-react';
import { useAppData } from '@/lib/useAppData';
import type { AppData, Batch, Expense, Ingredient, Order, OrderSource, OrderStatus, PaymentMethod, Product, Purchase, PurchaseItem, Unit } from '@/lib/types';
import { brl, ingredientUnitCost, monthlyMetrics, orderTotal, productBatchCost, productUnitCost, today, uid } from '@/lib/utils';
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
        </div>)}</div> : <Empty icon={Boxes} title="Estoque tranquilo" text="Nenhum ingrediente abaixo do mínimo."/>}
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
      source:(draft.source as OrderSource)||'WhatsApp', paid:!!draft.paid, address:draft.address, notes:draft.notes
    };
    setData(d=>({...d,orders:[order,...d.orders]})); setForm(false);
    setDraft({...draft,customer:'',phone:'',quantity:1,address:'',notes:''});
  };
  const updateStatus=(id:string, s:OrderStatus)=>setData(d=>({...d,orders:d.orders.map(o=>o.id===id?{...o,status:s}:o)}));
  const remove=(id:string)=>confirm('Excluir este pedido?')&&setData(d=>({...d,orders:d.orders.filter(o=>o.id!==id)}));

  return <section className="content">
    <div className="toolbar">
      <div className="search"><Search size={18}/><input placeholder="Buscar cliente ou telefone..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <button className="primary" onClick={()=>setForm(true)}><Plus size={18}/> Novo pedido</button>
    </div>
    <div className="filterPills">{(['Todos','Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue'] as const).map(s=><button key={s} className={status===s?'active':''} onClick={()=>setStatus(s)}>{s}</button>)}</div>
    <div className="card tableCard">
      <div className="tableWrap"><table><thead><tr><th>Cliente</th><th>Pedido</th><th>Entrega</th><th>Origem</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map(o=><tr key={o.id}><td><strong>{o.customer}</strong><small>{o.phone||'sem telefone'}</small></td><td>{o.quantity}× {data.products.find(p=>p.id===o.productId)?.name||'Produto'}<small>{o.paid?'Pago':'Pendente'}</small></td><td>{new Date(`${o.deliveryDate}T12:00`).toLocaleDateString('pt-BR')}<small>{o.address||'Retirada / combinar'}</small></td><td>{o.source}</td><td><strong>{brl(orderTotal(o))}</strong><small>frete {brl(o.deliveryFee)}</small></td><td><select className="statusSelect" value={o.status} onChange={e=>updateStatus(o.id,e.target.value as OrderStatus)}>{['Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue','Cancelado'].map(s=><option key={s}>{s}</option>)}</select></td><td><button className="iconBtn danger" onClick={()=>remove(o.id)}><Trash2 size={16}/></button></td></tr>)}
        {!filtered.length&&<tr><td colSpan={7}><Empty icon={ClipboardList} title="Nenhum pedido aqui" text="Cadastre o primeiro pedido da confeitaria."/></td></tr>}
      </tbody></table></div>
    </div>
    {form&&<Modal title="Novo pedido" onClose={()=>setForm(false)} footer={<><button className="secondary" onClick={()=>setForm(false)}>Cancelar</button><button className="primary" onClick={save}><Save size={17}/> Salvar pedido</button></>}>
      <div className="formGrid">
        <Field label="Cliente"><input value={draft.customer||''} onChange={e=>setDraft({...draft,customer:e.target.value})}/></Field>
        <Field label="WhatsApp"><input placeholder="(19) 99999-9999" value={draft.phone||''} onChange={e=>setDraft({...draft,phone:e.target.value})}/></Field>
        <Field label="Produto"><select value={draft.productId} onChange={e=>{const p=data.products.find(p=>p.id===e.target.value);setDraft({...draft,productId:e.target.value,unitPrice:p?.salePrice||0})}}>{data.products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select></Field>
        <Field label="Quantidade"><input type="number" min="1" value={draft.quantity||1} onChange={e=>setDraft({...draft,quantity:Number(e.target.value)})}/></Field>
        <Field label="Preço unitário"><MoneyInput value={Number(draft.unitPrice)||0} onChange={v=>setDraft({...draft,unitPrice:v})}/></Field>
        <Field label="Taxa de entrega"><MoneyInput value={Number(draft.deliveryFee)||0} onChange={v=>setDraft({...draft,deliveryFee:v})}/></Field>
        <Field label="Data da entrega"><input type="date" value={draft.deliveryDate||today()} onChange={e=>setDraft({...draft,deliveryDate:e.target.value})}/></Field>
        <Field label="Pagamento"><select value={draft.paymentMethod} onChange={e=>setDraft({...draft,paymentMethod:e.target.value as PaymentMethod})}>{['Pix','Dinheiro','Cartão','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Origem"><select value={draft.source} onChange={e=>setDraft({...draft,source:e.target.value as OrderSource})}>{['Instagram','Facebook Ads','WhatsApp','Indicação','Cliente antigo','Outro'].map(x=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Status"><select value={draft.status} onChange={e=>setDraft({...draft,status:e.target.value as OrderStatus})}>{['Novo','Confirmado','Produção','Pronto','Saiu para entrega','Entregue'].map(x=><option key={x}>{x}</option>)}</select></Field>
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
  const baseCost = p ? productBatchCost(p,data.ingredients) * ((Number(draft.planned)||p.yield)/p.yield) : 0;
  const realCost = baseCost + (Number(draft.extraCost)||0) + (Number(draft.wasteCost)||0);
  const unit = (Number(draft.produced)||0)>0? realCost/Number(draft.produced):0;
  const save=()=>{
    if(!draft.productId||!draft.produced)return;
    const batch:Batch={id:uid(),date:draft.date||today(),productId:draft.productId,planned:Number(draft.planned)||0,produced:Number(draft.produced)||0,extraCost:Number(draft.extraCost)||0,wasteCost:Number(draft.wasteCost)||0,notes:draft.notes};
    setData(d=>({...d,batches:[batch,...d.batches]}));
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
          <Field label="Observações"><textarea placeholder="Ex.: 2 morangos machucados, sobrou chocolate..." value={draft.notes||''} onChange={e=>setDraft({...draft,notes:e.target.value})}/></Field>
        </div>
        <div className="lotResult">
          <div><span>Custo estimado da receita</span><strong>{brl(baseCost)}</strong></div>
          <div><span>Custo real do lote</span><strong>{brl(realCost)}</strong></div>
          <div className="highlight"><span>Custo por unidade</span><strong>{brl(unit)}</strong></div>
          <div><span>Margem unitária no preço atual</span><strong>{p&&p.salePrice?`${(((p.salePrice-unit)/p.salePrice)*100).toFixed(1)}%`:'—'}</strong></div>
        </div>
        <button className="primary full" onClick={save}><Save size={17}/> Registrar lote</button>
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
  const [sub,setSub]=useState<'products'|'ingredients'>('products');
  const [prodModal,setProdModal]=useState(false); const [ingModal,setIngModal]=useState(false);
  const [ing,setIng]=useState<Partial<Ingredient>>({name:'',unit:'un',purchaseQuantity:1,purchaseCost:0,stock:0,minStock:0});
  const [prod,setProd]=useState<Partial<Product>>({name:'',salePrice:0,yield:1,packagingCost:0,recipe:[],active:true});
  const addIng=()=>{if(!ing.name)return;setData(d=>({...d,ingredients:[...d.ingredients,{id:uid(),name:ing.name!,unit:(ing.unit as Unit)||'un',purchaseQuantity:Number(ing.purchaseQuantity)||1,purchaseCost:Number(ing.purchaseCost)||0,stock:Number(ing.stock)||0,minStock:Number(ing.minStock)||0}]}));setIngModal(false)};
  const addProd=()=>{if(!prod.name)return;setData(d=>({...d,products:[...d.products,{id:uid(),name:prod.name!,salePrice:Number(prod.salePrice)||0,yield:Number(prod.yield)||1,packagingCost:Number(prod.packagingCost)||0,recipe:prod.recipe||[],active:true}]}));setProdModal(false)};
  const addRecipeItem=()=>setProd({...prod,recipe:[...(prod.recipe||[]),{ingredientId:data.ingredients[0]?.id||'',quantity:1}]});
  return <section className="content">
    <div className="toolbar"><div className="segmented"><button className={sub==='products'?'active':''} onClick={()=>setSub('products')}>Produtos</button><button className={sub==='ingredients'?'active':''} onClick={()=>setSub('ingredients')}>Ingredientes e insumos</button></div><button className="primary" onClick={()=>sub==='products'?setProdModal(true):setIngModal(true)}><Plus size={18}/> {sub==='products'?'Novo produto':'Novo ingrediente'}</button></div>
    {sub==='products'?<div className="productGrid">{data.products.map(p=>{const cost=productUnitCost(p,data.ingredients);return <div className="card productCard" key={p.id}><div className="productTop"><div className="productEmoji">🍓</div><span className={`softTag ${p.active?'':'muted'}`}>{p.active?'Ativo':'Pausado'}</span></div><h3>{p.name}</h3><div className="priceLine"><strong>{brl(p.salePrice)}</strong><span>venda</span></div><div className="miniStats"><div><span>Custo/un.</span><b>{brl(cost)}</b></div><div><span>Margem</span><b>{p.salePrice?`${(((p.salePrice-cost)/p.salePrice)*100).toFixed(1)}%`:'0%'}</b></div><div><span>Rendimento</span><b>{p.yield} un.</b></div></div><div className="recipePreview"><span>Receita padrão</span>{p.recipe.map(r=><small key={r.ingredientId}>{data.ingredients.find(i=>i.id===r.ingredientId)?.name||'Ingrediente'} • {r.quantity} {data.ingredients.find(i=>i.id===r.ingredientId)?.unit}</small>)}</div></div>})}</div>:
    <div className="card tableCard"><div className="tableWrap"><table><thead><tr><th>Ingrediente</th><th>Última compra</th><th>Custo por unidade</th><th>Estoque</th><th>Mínimo</th></tr></thead><tbody>{data.ingredients.map(i=><tr key={i.id}><td><strong>{i.name}</strong><small>unidade: {i.unit}</small></td><td>{brl(i.purchaseCost)}<small>{i.purchaseQuantity} {i.unit}</small></td><td><strong>{brl(ingredientUnitCost(i))}</strong><small>por {i.unit}</small></td><td><strong>{i.stock} {i.unit}</strong></td><td><span className={i.stock<=i.minStock?'dangerText':''}>{i.minStock} {i.unit}</span></td></tr>)}</tbody></table></div></div>}
    {ingModal&&<Modal title="Novo ingrediente" onClose={()=>setIngModal(false)} footer={<button className="primary" onClick={addIng}><Save size={17}/> Salvar</button>}><div className="formGrid"><Field label="Nome" wide><input value={ing.name||''} onChange={e=>setIng({...ing,name:e.target.value})}/></Field><Field label="Unidade"><select value={ing.unit} onChange={e=>setIng({...ing,unit:e.target.value as Unit})}>{['un','g','kg','ml','l','pct'].map(u=><option key={u}>{u}</option>)}</select></Field><Field label="Quantidade comprada"><input type="number" value={ing.purchaseQuantity||0} onChange={e=>setIng({...ing,purchaseQuantity:Number(e.target.value)})}/></Field><Field label="Valor pago"><MoneyInput value={Number(ing.purchaseCost)||0} onChange={v=>setIng({...ing,purchaseCost:v})}/></Field><Field label="Estoque atual"><input type="number" value={ing.stock||0} onChange={e=>setIng({...ing,stock:Number(e.target.value)})}/></Field><Field label="Alerta de estoque"><input type="number" value={ing.minStock||0} onChange={e=>setIng({...ing,minStock:Number(e.target.value)})}/></Field></div></Modal>}
    {prodModal&&<Modal title="Novo produto e ficha técnica" onClose={()=>setProdModal(false)} footer={<button className="primary" onClick={addProd}><Save size={17}/> Salvar produto</button>}><div className="formGrid"><Field label="Nome" wide><input value={prod.name||''} onChange={e=>setProd({...prod,name:e.target.value})}/></Field><Field label="Preço de venda"><MoneyInput value={Number(prod.salePrice)||0} onChange={v=>setProd({...prod,salePrice:v})}/></Field><Field label="Rendimento da receita"><input type="number" value={prod.yield||1} onChange={e=>setProd({...prod,yield:Number(e.target.value)})}/></Field><Field label="Embalagem por unidade"><MoneyInput value={Number(prod.packagingCost)||0} onChange={v=>setProd({...prod,packagingCost:v})}/></Field></div><div className="recipeBuilder"><div className="sectionTitle"><div><p className="eyebrow">FICHA TÉCNICA</p><h3>Ingredientes por receita</h3></div><button className="ghost" onClick={addRecipeItem}><Plus size={16}/> ingrediente</button></div>{(prod.recipe||[]).map((r,idx)=><div className="recipeLine" key={idx}><select value={r.ingredientId} onChange={e=>{const recipe=[...(prod.recipe||[])];recipe[idx]={...r,ingredientId:e.target.value};setProd({...prod,recipe})}}>{data.ingredients.map(i=><option value={i.id} key={i.id}>{i.name} ({i.unit})</option>)}</select><input type="number" value={r.quantity} onChange={e=>{const recipe=[...(prod.recipe||[])];recipe[idx]={...r,quantity:Number(e.target.value)};setProd({...prod,recipe})}}/><button className="iconBtn danger" onClick={()=>setProd({...prod,recipe:(prod.recipe||[]).filter((_,i)=>i!==idx)})}><Trash2 size={16}/></button></div>)}</div></Modal>}
  </section>
}

function Purchases({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const [mode,setMode]=useState<'list'|'nfce'>('list'); const [manual,setManual]=useState(false);
  const [qrUrl,setQrUrl]=useState(''); const [loading,setLoading]=useState(false); const [error,setError]=useState(''); const [preview,setPreview]=useState<any>(null);
  const [purchase,setPurchase]=useState<Partial<Purchase>>({date:today(),store:'',source:'Manual',items:[],total:0});
  const importNfce=async(url=qrUrl)=>{setLoading(true);setError('');setPreview(null);try{const r=await fetch('/api/nfce/import',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Falha ao importar nota');setPreview(j);setQrUrl(url)}catch(e:any){setError(e.message)}finally{setLoading(false)}};
  const confirmNfce=()=>{if(!preview)return;const items:PurchaseItem[]=(preview.items||[]).map((x:any)=>({id:uid(),name:x.name||'Item',quantity:Number(x.quantity)||1,unit:(x.unit||'un') as Unit,total:Number(x.total)||0}));const total=Number(preview.total)||items.reduce((s,i)=>s+i.total,0);const p:Purchase={id:uid(),date:preview.date||today(),store:preview.store||'Mercado',source:'NFC-e',accessKey:preview.accessKey,qrUrl,items,total};setData(d=>({...d,purchases:[p,...d.purchases]}));setPreview(null);setMode('list')};
  const addManualItem=()=>setPurchase({...purchase,items:[...(purchase.items||[]),{id:uid(),name:'',quantity:1,unit:'un',total:0}]});
  const saveManual=()=>{const items=purchase.items||[];const p:Purchase={id:uid(),date:purchase.date||today(),store:purchase.store||'Mercado',source:'Manual',items,total:items.reduce((s,i)=>s+Number(i.total),0)};setData(d=>({...d,purchases:[p,...d.purchases]}));setManual(false)};
  return <section className="content">
    <div className="toolbar"><div className="segmented"><button className={mode==='list'?'active':''} onClick={()=>setMode('list')}>Histórico</button><button className={mode==='nfce'?'active':''} onClick={()=>setMode('nfce')}>Importar NFC-e</button></div>{mode==='list'&&<button className="primary" onClick={()=>setManual(true)}><Plus size={18}/> Compra manual</button>}</div>
    {mode==='list'?<>
      <div className="metricsGrid three"><Metric icon={ReceiptText} label="Notas importadas" value={`${data.purchases.filter(p=>p.source==='NFC-e').length}`} note="via QR Code NFC-e"/><Metric icon={ShoppingBasket} label="Compras registradas" value={`${data.purchases.length}`} note="manual + NFC-e"/><Metric icon={BadgeDollarSign} label="Total em compras" value={brl(data.purchases.reduce((s,p)=>s+p.total,0))} note="histórico completo"/></div>
      <div className="card tableCard"><div className="tableWrap"><table><thead><tr><th>Data</th><th>Mercado</th><th>Origem</th><th>Itens</th><th>Total</th></tr></thead><tbody>{data.purchases.map(p=><tr key={p.id}><td>{new Date(`${p.date}T12:00`).toLocaleDateString('pt-BR')}</td><td><strong>{p.store}</strong>{p.accessKey&&<small>chave …{p.accessKey.slice(-8)}</small>}</td><td><span className="softTag">{p.source}</span></td><td>{p.items.length}</td><td><strong>{brl(p.total)}</strong></td></tr>)}{!data.purchases.length&&<tr><td colSpan={5}><Empty icon={ReceiptText} title="Nenhuma compra registrada" text="Escaneie o QR Code da NFC-e ou cadastre manualmente."/></td></tr>}</tbody></table></div></div>
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
        {preview?<><div className="receiptHead"><div><strong>{preview.store||'Estabelecimento'}</strong><span>{preview.date?new Date(`${preview.date}T12:00`).toLocaleDateString('pt-BR'):'Data não identificada'}</span></div><span className="softTag">{preview.parser||'NFC-e'}</span></div><div className="receiptItems">{(preview.items||[]).map((i:any,idx:number)=><div key={idx}><span>{i.name}<small>{i.quantity||1} {i.unit||'un'}</small></span><strong>{brl(Number(i.total)||0)}</strong></div>)}</div><div className="receiptTotal"><span>Total</span><strong>{brl(Number(preview.total)||0)}</strong></div><button className="primary full" onClick={confirmNfce}><CheckCircle2 size={18}/> Importar compra</button></>:<Empty icon={ReceiptText} title="A nota aparece aqui" text="Escaneie ou cole o QR Code para importar os itens."/>}
      </div>
    </div>}
    {manual&&<Modal title="Registrar compra" onClose={()=>setManual(false)} footer={<button className="primary" onClick={saveManual}><Save size={17}/> Salvar compra</button>}><div className="formGrid"><Field label="Mercado"><input value={purchase.store||''} onChange={e=>setPurchase({...purchase,store:e.target.value})}/></Field><Field label="Data"><input type="date" value={purchase.date} onChange={e=>setPurchase({...purchase,date:e.target.value})}/></Field></div><div className="recipeBuilder"><div className="sectionTitle"><div><p className="eyebrow">ITENS</p><h3>O que foi comprado</h3></div><button className="ghost" onClick={addManualItem}><Plus size={16}/> item</button></div>{(purchase.items||[]).map((i,idx)=><div className="purchaseLine" key={i.id}><input placeholder="Produto" value={i.name} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,name:e.target.value};setPurchase({...purchase,items:a})}}/><input type="number" value={i.quantity} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,quantity:Number(e.target.value)};setPurchase({...purchase,items:a})}}/><select value={i.unit} onChange={e=>{const a=[...(purchase.items||[])];a[idx]={...i,unit:e.target.value as Unit};setPurchase({...purchase,items:a})}}>{['un','g','kg','ml','l','pct'].map(u=><option key={u}>{u}</option>)}</select><MoneyInput value={i.total} onChange={v=>{const a=[...(purchase.items||[])];a[idx]={...i,total:v};setPurchase({...purchase,items:a})}}/><button className="iconBtn danger" onClick={()=>setPurchase({...purchase,items:(purchase.items||[]).filter((_,x)=>x!==idx)})}><Trash2 size={16}/></button></div>)}</div></Modal>}
  </section>
}

function Finance({data,setData}:{data:AppData;setData:React.Dispatch<React.SetStateAction<AppData>>}) {
  const m = monthlyMetrics(data);
  const emptyExpense: Partial<Expense> = {
    date: today(),
    category: 'Outro',
    description: '',
    amount: 0,
    recurring: false
  };

  const [modal,setModal] = useState(false);
  const [editingId,setEditingId] = useState<string | null>(null);
  const [exp,setExp] = useState<Partial<Expense>>(emptyExpense);

  const openNew = () => {
    setEditingId(null);
    setExp({...emptyExpense, date: today()});
    setModal(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setExp({...expense});
    setModal(true);
  };

  const closeModal = () => {
    setModal(false);
    setEditingId(null);
    setExp({...emptyExpense, date: today()});
  };

  const save = () => {
    if(!exp.description?.trim()) return;

    const expense: Expense = {
      id: editingId || uid(),
      date: exp.date || today(),
      category: (exp.category as Expense['category']) || 'Outro',
      description: exp.description.trim(),
      amount: Number(exp.amount) || 0,
      recurring: !!exp.recurring
    };

    setData(d => ({
      ...d,
      expenses: editingId
        ? d.expenses.map(e => e.id === editingId ? expense : e)
        : [expense, ...d.expenses]
    }));

    closeModal();
  };

  const remove = (id:string) => {
    if(!confirm('Excluir esta despesa? Essa ação não pode ser desfeita.')) return;
    setData(d => ({
      ...d,
      expenses: d.expenses.filter(e => e.id !== id)
    }));
  };

  return <section className="content">
    <div className="toolbar">
      <div>
        <p className="mutedText noMargin">Resultado calculado a partir dos pedidos, custos e despesas.</p>
      </div>
      <button className="primary" onClick={openNew}>
        <Plus size={18}/> Nova despesa
      </button>
    </div>

    <div className="metricsGrid">
      <Metric icon={CircleDollarSign} label="Faturamento" value={brl(m.revenue)} note="produto + entrega"/>
      <Metric icon={PackageOpen} label="CMV estimado" value={brl(m.cogs)} note="custo dos produtos vendidos"/>
      <Metric icon={WalletCards} label="Despesas do mês" value={brl(m.expenses+m.fixed)} note={`inclui ${brl(m.fixed)} fixos`}/>
      <Metric icon={TrendingUp} label="Lucro estimado" value={brl(m.profit)} note={m.revenue?`${((m.profit/m.revenue)*100).toFixed(1)}% de margem líquida`:'sem vendas'} positive={m.profit>=0}/>
    </div>

    <div className="twoCols">
      <div className="card">
        <div className="sectionTitle">
          <div><p className="eyebrow">MARKETING</p><h3>Retorno dos anúncios</h3></div>
          <Megaphone size={20}/>
        </div>
        <div className="adMetrics">
          <div><span>Gasto Meta Ads</span><strong>{brl(m.ads)}</strong></div>
          <div><span>Pedidos atribuídos</span><strong>{m.adOrders}</strong></div>
          <div><span>CPA</span><strong>{m.adOrders?brl(m.cpa):'—'}</strong></div>
          <div><span>ROAS</span><strong>{m.ads?`${m.roas.toFixed(2)}x`:'—'}</strong></div>
        </div>
        <small className="helper">Para atribuir, selecione “Facebook Ads” na origem do pedido.</small>
      </div>

      <div className="card">
        <div className="sectionTitle">
          <div><p className="eyebrow">RESULTADO</p><h3>De onde sai o lucro</h3></div>
        </div>
        <div className="waterfall">
          <div><span>Faturamento</span><b>{brl(m.revenue)}</b></div>
          <div><span>− custo dos produtos</span><b>{brl(m.cogs)}</b></div>
          <div><span>− despesas variáveis</span><b>{brl(m.expenses)}</b></div>
          <div><span>− MEI + fixos</span><b>{brl(m.fixed)}</b></div>
          <div className="total"><span>= lucro estimado</span><b>{brl(m.profit)}</b></div>
        </div>
      </div>
    </div>

    <div className="card tableCard">
      <div className="sectionTitle padded">
        <div><p className="eyebrow">SAÍDAS</p><h3>Despesas</h3></div>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Recorrente</th>
              <th>Valor</th>
              <th>Ações</th>
            </tr>
          </thead>

          <tbody>
            {data.expenses.map(e => (
              <tr key={e.id}>
                <td>{new Date(`${e.date}T12:00`).toLocaleDateString('pt-BR')}</td>
                <td><span className="softTag">{e.category}</span></td>
                <td>{e.description}</td>
                <td>{e.recurring?'Sim':'Não'}</td>
                <td><strong>{brl(e.amount)}</strong></td>
                <td>
                  <div style={{display:'flex',gap:8}}>
                    <button
                      className="iconBtn"
                      title="Editar despesa"
                      onClick={()=>openEdit(e)}
                    >
                      <Pencil size={16}/>
                    </button>
                    <button
                      className="iconBtn danger"
                      title="Excluir despesa"
                      onClick={()=>remove(e.id)}
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!data.expenses.length && (
              <tr>
                <td colSpan={6}>
                  <Empty icon={WalletCards} title="Nenhuma despesa registrada" text="Cadastre os gastos da confeitaria por aqui."/>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {modal&&<Modal
      title={editingId ? 'Editar despesa' : 'Nova despesa'}
      onClose={closeModal}
      footer={
        <>
          <button className="secondary" onClick={closeModal}>Cancelar</button>
          <button className="primary" onClick={save}>
            <Save size={17}/> {editingId ? 'Salvar alterações' : 'Salvar'}
          </button>
        </>
      }
    >
      <div className="formGrid">
        <Field label="Data">
          <input type="date" value={exp.date||today()} onChange={e=>setExp({...exp,date:e.target.value})}/>
        </Field>

        <Field label="Categoria">
          <select value={exp.category} onChange={e=>setExp({...exp,category:e.target.value as Expense['category']})}>
            {['Anúncios','Entrega','Utensílios','Taxas','MEI/DAS','Sistema','Outro'].map(x=><option key={x}>{x}</option>)}
          </select>
        </Field>

        <Field label="Descrição" wide>
          <input value={exp.description||''} onChange={e=>setExp({...exp,description:e.target.value})}/>
        </Field>

        <Field label="Valor">
          <MoneyInput value={Number(exp.amount)||0} onChange={v=>setExp({...exp,amount:v})}/>
        </Field>

        <Field label="Recorrente">
          <label className="check">
            <input type="checkbox" checked={!!exp.recurring} onChange={e=>setExp({...exp,recurring:e.target.checked})}/>
            Repetir mensalmente
          </label>
        </Field>
      </div>
    </Modal>}
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
