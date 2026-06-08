"""
fetch_fiis_fundamentus.py — Baixa dados de FIIs do Fundamentus
Salva em data/fiis_fundamentus.json
Roda todo dia junto com o fetch_data.py
"""
import json, datetime, os, requests
from html.parser import HTMLParser

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "text/html,application/xhtml+xml",
    "Referer": "https://www.fundamentus.com.br/",
}

class TableParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.rows = []
        self.current_row = []
        self.current_cell = ""

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.current_row = []
        elif tag in ("td", "th"):
            self.in_td = True
            self.current_cell = ""

    def handle_endtag(self, tag):
        if tag in ("td", "th"):
            self.current_row.append(self.current_cell.strip())
            self.in_td = False
        elif tag == "tr":
            if self.current_row:
                self.rows.append(self.current_row)

    def handle_data(self, data):
        if self.in_td:
            self.current_cell += data

def parse_num(v):
    if not v or v == '-': return None
    v = str(v).replace('.','').replace(',','.').replace('%','').strip()
    try: return float(v)
    except: return None

def fetch_fiis():
    url = "https://www.fundamentus.com.br/fii_resultado.php"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()

        parser = TableParser()
        parser.feed(resp.text)

        if not parser.rows:
            print("  Nenhuma linha encontrada")
            return None

        # Primeira linha = header
        header = parser.rows[0]
        print(f"  Colunas: {header}")
        print(f"  Total linhas: {len(parser.rows)-1}")

        dados = {}
        for row in parser.rows[1:]:
            if not row or not row[0] or len(row[0]) < 4:
                continue
            ticker = row[0].strip()
            # FIIs terminam em 11
            if not ticker[-2:].isdigit():
                continue

            dados[ticker] = {
                "ticker": ticker,
                "preco": parse_num(row[1]) if len(row) > 1 else None,
                "ffo_yield": parse_num(row[2]) if len(row) > 2 else None,
                "dy": parse_num(row[3]) if len(row) > 3 else None,
                "pvp": parse_num(row[4]) if len(row) > 4 else None,
                "valor_mercado": parse_num(row[5]) if len(row) > 5 else None,
                "liq": parse_num(row[6]) if len(row) > 6 else None,
                "qtd_imoveis": parse_num(row[7]) if len(row) > 7 else None,
                "preco_m2": parse_num(row[8]) if len(row) > 8 else None,
                "aluguel_m2": parse_num(row[9]) if len(row) > 9 else None,
                "cap_rate": parse_num(row[10]) if len(row) > 10 else None,
                "vacancia": parse_num(row[11]) if len(row) > 11 else None,
            }

        print(f"  {len(dados)} FIIs extraídos")
        return dados

    except Exception as e:
        print(f"  Erro: {e}")
        return None

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")

    print("Buscando FIIs do Fundamentus...")
    dados = fetch_fiis()

    if dados:
        output = {"updated_at": now_str, "fiis": dados}
        with open("data/fiis_fundamentus.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Salvo! {len(dados)} FIIs em data/fiis_fundamentus.json")
    else:
        print("Falhou — mantendo dados anteriores")

if __name__ == "__main__":
    main()
