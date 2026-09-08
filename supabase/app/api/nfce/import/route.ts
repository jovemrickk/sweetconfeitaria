import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

const money = (value?: string | null) => {
  if (!value) return 0;
  const clean = value.replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
  const n = Number.parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
};

const qty = (value?: string | null) => {
  if (!value) return 1;
  const match = value.replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 1;
};

const cleanText = (value?: string | null) => (value || '').replace(/\s+/g, ' ').trim();

function accessKeyFromUrl(raw: string) {
  try {
    const url = new URL(raw);
    const p = url.searchParams.get('p');
    if (p) {
      const first = decodeURIComponent(p).split('|')[0].replace(/\D/g, '');
      if (first.length === 44) return first;
    }
  } catch {}
  const matches = raw.match(/\d{44}/g);
  return matches?.[0] || undefined;
}

function normalizeDate(text: string) {
  const m = text.match(/(\d{2})[\/-](\d{2})[\/-](\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : undefined;
}

function parseSpStyle($: cheerio.CheerioAPI) {
  const items: Array<{name:string;quantity:number;unit:string;unitPrice:number;total:number}> = [];
  $('[id^="Item"], #tabResult tbody tr, table#tabResult tr').each((_, el) => {
    const row = $(el);
    const name = cleanText(row.find('.txtTit, .txtTit2').first().text());
    if (!name) return;
    const qText = cleanText(row.find('.Rqtd').first().text());
    const uText = cleanText(row.find('.RUN').first().text());
    const vuText = cleanText(row.find('.RvlUnit').first().text());
    const totalText = cleanText(row.find('.valor').last().text()) || cleanText(row.find('td').last().text());
    items.push({
      name,
      quantity: qty(qText),
      unit: (uText.split(':').pop() || 'un').trim().toLowerCase(),
      unitPrice: money(vuText),
      total: money(totalText),
    });
  });
  return items;
}

function parseGenericTables($: cheerio.CheerioAPI) {
  const items: Array<{name:string;quantity:number;unit:string;unitPrice:number;total:number}> = [];
  $('table tr').each((_, el) => {
    const cells = $(el).find('td').map((__, td) => cleanText($(td).text())).get().filter(Boolean);
    if (cells.length < 2) return;
    const joined = cells.join(' ');
    if (/total|tribut|cnpj|cpf|chave|emiss/i.test(joined) && !/produto|descri/i.test(joined)) return;
    const last = money(cells[cells.length - 1]);
    if (!last) return;
    const name = cells[0].replace(/\b\d{8,14}\b/g, '').trim();
    if (name.length < 2) return;
    const qCell = cells.find(c => /qtde|qtd|quant/i.test(c)) || cells[1] || '1';
    const unitCell = cells.find(c => /\b(un|kg|g|l|ml|pct|pc)\b/i.test(c)) || 'un';
    items.push({name, quantity:qty(qCell), unit:(unitCell.match(/\b(un|kg|g|l|ml|pct|pc)\b/i)?.[1] || 'un').toLowerCase(), unitPrice:0, total:last});
  });
  return items;
}

export async function POST(req: NextRequest) {
  try {
    const { url: rawUrl } = await req.json();
    if (!rawUrl || typeof rawUrl !== 'string') return NextResponse.json({ error: 'Cole ou escaneie a URL da NFC-e.' }, { status: 400 });

    let url: URL;
    try { url = new URL(rawUrl.trim()); } catch { return NextResponse.json({ error: 'A URL lida do QR Code não é válida.' }, { status: 400 }); }
    if (url.protocol !== 'https:') return NextResponse.json({ error: 'Por segurança, a NFC-e precisa usar HTTPS.' }, { status: 400 });
    const host = url.hostname.toLowerCase();
    if (!(host.endsWith('.gov.br') || host === 'gov.br')) {
      return NextResponse.json({ error: 'O QR Code não aponta para um domínio oficial .gov.br. Confira se é a URL de consulta da NFC-e.' }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          'user-agent': 'Mozilla/5.0 (compatible; SweetDreamsNFCe/1.0; +https://vercel.app)',
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'pt-BR,pt;q=0.9',
        },
        redirect: 'follow',
        signal: controller.signal,
        cache: 'no-store',
      });
    } finally { clearTimeout(timeout); }

    if (!response.ok) return NextResponse.json({ error: `O portal da SEFAZ respondeu ${response.status}. Tente novamente ou cadastre a compra manualmente.` }, { status: 422 });
    const html = await response.text();
    if (html.length < 200) return NextResponse.json({ error: 'O portal retornou uma página vazia ou protegida.' }, { status: 422 });

    const $ = cheerio.load(html);
    let items = parseSpStyle($);
    let parser = 'Layout DANFE NFC-e';
    if (!items.length) { items = parseGenericTables($); parser = 'Leitor genérico de tabela'; }

    const bodyText = cleanText($('body').text());
    const store = cleanText($('.txtTopo').first().text()) || cleanText($('header h1, header h2, h4').first().text()) || cleanText($('title').text()).replace(/NFC.?e|Nota Fiscal.*/i, '').trim();
    const date = normalizeDate(bodyText);
    const accessKey = accessKeyFromUrl(rawUrl) || bodyText.match(/(?:\d[ .-]?){44}/)?.[0]?.replace(/\D/g, '');

    const totalSelectors = ['#linhaTotal .valor', '.totalNumb', '#totalNota', '.valorTotal', '[id*=Total] .valor'];
    let total = 0;
    for (const sel of totalSelectors) {
      const value = money(cleanText($(sel).last().text()));
      if (value > 0) { total = value; break; }
    }
    if (!total) {
      const m = bodyText.match(/(?:Valor\s+total|Total\s+a\s+pagar|TOTAL)[^0-9]{0,20}(?:R\$)?\s*([\d.,]+)/i);
      total = money(m?.[1]);
    }
    if (!total && items.length) total = items.reduce((sum, item) => sum + item.total, 0);

    if (!items.length) {
      return NextResponse.json({
        error: 'Consegui abrir a consulta, mas o portal não expôs os itens em HTML reconhecível. Isso varia por estado. Use “Compra manual” por enquanto; o QR Code e a chave foram lidos.',
        accessKey,
      }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      parser,
      store: store || 'Estabelecimento',
      date: date || new Date().toISOString().slice(0,10),
      accessKey,
      total,
      items,
    });
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? 'O portal da SEFAZ demorou demais para responder.' : 'Não foi possível importar a NFC-e automaticamente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
