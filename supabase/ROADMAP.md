# Roadmap sem funções duplicadas

## Núcleo
- Pedidos = origem das vendas e agenda.
- Produção = origem do custo real por lote.
- Catálogo = produtos + ingredientes + ficha técnica.
- Compras/NFC-e = entrada de insumos e preços.
- Financeiro = despesas e leitura dos resultados; não recadastra vendas.
- Dashboard = somente resumo calculado.

## NFC-e 2.0
- mapear item da nota -> ingrediente existente;
- guardar aliases de mercado (ex.: “MORANGO BDJ” -> Morango);
- atualizar preço médio/último preço do ingrediente;
- incrementar estoque automaticamente;
- detectar nota duplicada pela chave de 44 dígitos;
- aceitar XML da NFC-e quando disponível.

## Estoque 2.0
- entrada: compra;
- saída: lote produzido;
- perda: desperdício do lote;
- ajuste manual auditável.

## Financeiro 2.0
- regime de competência x caixa;
- taxa de cartão por forma de pagamento;
- contas a pagar/receber;
- margem por produto e por lote;
- pró-labore/divisão de lucro sem misturar com despesa operacional.
