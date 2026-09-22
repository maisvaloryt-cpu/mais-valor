"""Acesso opt-in aos recursos pagos da brapi, com bloqueio após erros de plano/cota."""
import os

import requests


FEATURE_ENV = {
    "history": "BRAPI_HISTORY_ENABLED",
    "dividends": "BRAPI_DIVIDENDS_ENABLED",
}
_blocked_tokens = set()
_blocked_features = set()
_notified = set()


def feature_enabled(feature):
    """Ter um token não significa ter acesso a histórico longo ou dividendos."""
    variable = FEATURE_ENV[feature]
    enabled = os.environ.get(variable, "").strip().lower() in ("1", "true", "yes")
    if not enabled and feature not in _notified:
        print(f"[brapi] {feature}: desativado; usando as outras fontes. "
              f"Habilite {variable} apenas se o plano permitir.")
        _notified.add(feature)
    return enabled


def get_paid_quote(ticker, token, feature, params, headers=None, timeout=20):
    """Retorna resposta 200 ou None; nunca repete uma cota bloqueada neste processo.

    401/429 suspendem a chave; 403 suspende o recurso dessa chave. Falhas por
    ativo (por exemplo, 404) não impedem a consulta de outros ativos.
    """
    if not feature_enabled(feature) or not token:
        return None
    if token in _blocked_tokens or (token, feature) in _blocked_features:
        return None
    request_headers = dict(headers or {})
    request_headers["Authorization"] = f"Bearer {token}"
    try:
        response = requests.get(
            f"https://brapi.dev/api/quote/{ticker}",
            params=params, headers=request_headers, timeout=timeout,
        )
    except requests.RequestException:
        # Não imprimir exceções: URLs/cabeçalhos de terceiros podem conter chaves.
        return None
    if response.status_code in (401, 429):
        _blocked_tokens.add(token)
    elif response.status_code == 403:
        _blocked_features.add((token, feature))
    if response.status_code in (401, 403, 429):
        print(f"[brapi] {feature}: HTTP {response.status_code}; "
              "novas tentativas desta chave bloqueadas nesta execução.")
    return response if response.status_code == 200 else None
