import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const runtime = 'nodejs';

const money = (value?: string | null) => {
  if (!value) return 0;

  // Portais de NFC-e às vezes misturam contador/índice com o valor no mesmo nó.
  // Ex.: "4 24,96". O parser antigo removia o espaço e virava 424,96.
  // Pegamos o ÚLTIMO token com aparência de valor monetário, sem colar números soltos.
  const text = String(value).replace(/\u00a0/g, ' ').trim();
  const tokens = text.match(/-?\d{1,3}(?:\.\d{3})*(?:,\d{2,4})|-?\d+(?:[.,]\d{2,4})/g);
  const token = tokens?.at(-1);

  if (token) {
    const normalized = token.includes(',')
      ? token.replace(/\./g, '').replace(',', '.')
      : token;
    const n = Number.parseFloat(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  // Fallback para valores simples sem casas decimais, como "5".
  const simple = text.match(/-?\d+(?:[.,]\d+)?/g)?.at(-1);
  if (!simple) return 0;
  const normalized = simple.includes(',')
    ? simple.replace(/\./g, '').replace(',', '.')
    : simple;
  const n = Number.parseFloat(normalized);
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


function extractInvoiceTotal($: cheerio.CheerioAPI, bodyText: string, itemsTotal: number) {
  const preferred: number[] = [];
  const secondary: number[] = [];

  // No DANFE/NFC-e usado em SP, #totalNota contém várias linhas com a mesma
  // classe/ID: uma é "Qtd. total de itens" e outra é "Valor a pagar R$".
  // Nunca podemos pegar .totalNumb solto, pois ele também representa quantidade
  // e outros valores da página.
  $('#totalNota #linhaTotal, #totalNota [id="linhaTotal"], #totalNota .linhaTotal').each((_, el) => {
    const rowText = cleanText($(el).text());
    if (!rowText) return;
    const value = money(rowText);
    if (!(value > 0)) return;
    if (/valor\s+a\s+pagar|total\s+a\s+pagar/i.test(rowText)) preferred.push(value);
    else if (/valor\s+total|total\s+da\s+nota/i.test(rowText)) secondary.push(value);
  });

  // Alguns layouts usam outro container, mas mantêm o texto do rótulo.
  if (!preferred.length) {
    $('[id*=total], [class*=total]').each((_, el) => {
      const rowText = cleanText($(el).text());
      if (!/valor\s+a\s+pagar|total\s+a\s+pagar/i.test(rowText)) return;
      const value = money(rowText);
      if (value > 0) preferred.push(value);
    });
  }

  // Fallback textual. Procuramos o rótulo e capturamos o valor imediatamente
  // depois dele, em vez de "qualquer total" perto do primeiro produto.
  const textPatterns = [
    /(?:Valor\s+a\s+pagar|Total\s+a\s+pagar)\s*(?:R\$)?\s*[:\-]?\s*([\d.]+,\d{2})/i,
    /(?:Valor\s+total(?:\s+da\s+nota)?|Total\s+da\s+nota)\s*(?:R\$)?\s*[:\-]?\s*([\d.]+,\d{2})/i,
  ];
  for (const pattern of textPatterns) {
    const match = bodyText.match(pattern);
    const value = money(match?.[1]);
    if (value > 0) {
      if (/pagar/i.test(pattern.source)) preferred.push(value);
      else secondary.push(value);
    }
  }

  const unique = [...new Set([...preferred, ...secondary].map(v => Math.round(v * 100) / 100))];
  if (unique.length) {
    // Se temos itens, entre candidatos plausíveis preferimos o que mais se
    // aproxima da soma dos produtos. Isso também evita escolher "Qtd. itens".
    if (itemsTotal > 0) {
      return unique.sort((a, b) => Math.abs(a - itemsTotal) - Math.abs(b - itemsTotal))[0];
    }
    return unique[0];
  }

  return itemsTotal > 0 ? itemsTotal : 0;
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

function decodeEmbeddedHtml(value: string) {
  return value
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/\\\//g, '/')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\r|\\n|\\t/g, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&');
}

// Alguns portais da SEFAZ não colocam todos os itens no DOM inicial.
// Eles entregam o DANFE inteiro dentro de uma string Javascript (new DanfeNFCe(...)).
// Nesse caso o Cheerio enxergava só parte da nota e o total não batia com os itens.
function parseEmbeddedDanfe($: cheerio.CheerioAPI) {
  let best: Array<{name:string;quantity:number;unit:string;unitPrice:number;total:number}> = [];
  $('script').each((_, el) => {
    const raw = $(el).html() || $(el).text() || '';
    if (!/tabResult|txtTit|DanfeNFCe/i.test(raw)) return;
    const decoded = decodeEmbeddedHtml(raw);
    const tables = decoded.match(/<table\b[\s\S]*?id=["']tabResult["'][\s\S]*?<\/table>/gi) || [];
    for (const table of tables) {
      const parsed = parseSpStyle(cheerio.load(table));
      if (parsed.length > best.length) best = parsed;
    }
  });
  return best;
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
    const directItems = parseSpStyle($);
    const embeddedItems = parseEmbeddedDanfe($);
    let items = embeddedItems.length > directItems.length ? embeddedItems : directItems;
    let parser = embeddedItems.length > directItems.length ? 'Layout DANFE NFC-e (conteúdo completo)' : 'Layout DANFE NFC-e';
    if (!items.length) { items = parseGenericTables($); parser = 'Leitor genérico de tabela'; }

    const bodyText = cleanText($('body').text());
    const store = cleanText($('.txtTopo').first().text()) || cleanText($('header h1, header h2, h4').first().text()) || cleanText($('title').text()).replace(/NFC.?e|Nota Fiscal.*/i, '').trim();
    const date = normalizeDate(bodyText);
    const accessKey = accessKeyFromUrl(rawUrl) || bodyText.match(/(?:\d[ .-]?){44}/)?.[0]?.replace(/\D/g, '');

    const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const total = extractInvoiceTotal($, bodyText, itemsTotal);
    const totalDifference = total > 0 ? Math.abs(total - itemsTotal) : 0;
    const incompleteItems = Boolean(total > 0 && items.length && totalDifference > Math.max(2, total * 0.08));

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
      itemsTotal,
      incompleteItems,
      warning: incompleteItems ? 'A soma dos itens encontrados não bate com o total da nota. O portal pode ter escondido parte dos produtos; confira antes de importar.' : undefined,
      items,
    });
  } catch (error: any) {
    const message = error?.name === 'AbortError' ? 'O portal da SEFAZ demorou demais para responder.' : 'Não foi possível importar a NFC-e automaticamente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
