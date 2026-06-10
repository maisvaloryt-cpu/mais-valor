#!/bin/bash
# Gera data/tickers.json com todos os tickers que têm arquivo em data/historico/
# Execute na raiz do repositório: bash gerar_tickers_json.sh

OUT="data/tickers.json"
echo "Gerando $OUT..."

TICKERS=()
for f in data/historico/*.json; do
  [ -f "$f" ] || continue
  name=$(basename "$f" .json)
  TICKERS+=("\"$name\"")
done

printf '[\n' > "$OUT"
for i in "${!TICKERS[@]}"; do
  if [ $i -lt $((${#TICKERS[@]} - 1)) ]; then
    printf '  %s,\n' "${TICKERS[$i]}" >> "$OUT"
  else
    printf '  %s\n' "${TICKERS[$i]}" >> "$OUT"
  fi
done
printf ']\n' >> "$OUT"

echo "Pronto! $OUT gerado com ${#TICKERS[@]} tickers."
