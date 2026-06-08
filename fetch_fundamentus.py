"""
fetch_fundamentus.py — Baixa dados do Fundamentus automaticamente
Salva em data/fundamentus.json com todos os indicadores de 403 ações
Roda todo dia junto com o fetch_data.py
"""
import json, datetime, os, requests

def fetch_fundamentus():
    """Baixa a planilha do Fundamentus e extrai os dados"""
    url = "https://www.fundamentus.com.br/resultado.php"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Accept": "text/html,application/xhtml+xml",
        "Referer": "https://www.fundamentus.com.br/",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        resp.raise_for_status()
        # Extrai tabela HTML
        from html.parser import HTMLParser
        
        class TableParser(HTMLParser):
            def __init__(self):
                super().__init__()
                self.in_table = False
                self.in_td = False
                self.rows = []
                self.current_row = []
                self.current_cell = ""
                
            def handle_starttag(self, tag, attrs):
                if tag == "table":
                    self.in_table = True
                elif tag == "tr":
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
        
        parser = TableParser()
        parser.feed(resp.text)
        
        if not parser.rows:
            return None
            
        # Primeira linha é o header
        header = parser.rows[0]
        print(f"  Colunas: {header}")
        
        dados = {}
        for row in parser.rows[1:]:
            if not row or not row[0]:
                continue
            ticker = row[0].strip()
            if not ticker or len(ticker) < 4:
                continue
            
            def parse_num(v):
                if not v or v == '-':
                    return None
                v = v.replace('.', '').replace(',', '.').replace('%', '').strip()
                try:
                    return float(v)
                except:
                    return None
            
            dados[ticker] = {
                "ticker": ticker,
                "preco": parse_num(row[1]) if len(row) > 1 else None,
                "pl": parse_num(row[2]) if len(row) > 2 else None,
                "pvp": parse_num(row[3]) if len(row) > 3 else None,
                "psr": parse_num(row[4]) if len(row) > 4 else None,
                "dy": parse_num(row[5]) if len(row) > 5 else None,
                "roic": parse_num(row[16]) if len(row) > 16 else None,
                "roe": parse_num(row[17]) if len(row) > 17 else None,
                "liq": parse_num(row[18]) if len(row) > 18 else None,
                "patrim": parse_num(row[19]) if len(row) > 19 else None,
                "mrg_liq": parse_num(row[14]) if len(row) > 14 else None,
                "cresc5a": parse_num(row[21]) if len(row) > 21 else None,
            }
        
        print(f"  {len(dados)} ações extraídas do Fundamentus")
        return dados
        
    except Exception as e:
        print(f"  Erro ao buscar Fundamentus: {e}")
        return None

def main():
    os.makedirs("data", exist_ok=True)
    now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3)))
    now_str = now.strftime("%d/%m/%Y %H:%M")
    
    print("Buscando dados do Fundamentus...")
    dados = fetch_fundamentus()
    
    if dados:
        output = {
            "updated_at": now_str,
            "acoes": dados
        }
        with open("data/fundamentus.json", "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"Salvo! {len(dados)} ações em data/fundamentus.json")
    else:
        print("Falhou — usando dados anteriores se existirem")

if __name__ == "__main__":
    main()
