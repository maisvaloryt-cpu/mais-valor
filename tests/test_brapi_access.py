"""Regressões de cobrança: não chamar recursos sem autorização nem repetir bloqueios."""
import contextlib
import importlib
import io
import os
import unittest
from unittest.mock import Mock, patch

import requests

import brapi_access as brapi


class BrapiAccessTests(unittest.TestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {}, clear=True)
        self.env.start()
        self.addCleanup(self.env.stop)
        self.output = contextlib.redirect_stdout(io.StringIO())
        self.output.__enter__()
        self.addCleanup(self.output.__exit__, None, None, None)
        brapi._blocked_tokens.clear()
        brapi._blocked_features.clear()
        brapi._notified.clear()

    def enable(self):
        os.environ.update(BRAPI_HISTORY_ENABLED="true", BRAPI_DIVIDENDS_ENABLED="true")

    def quote(self, feature="history", token="test-key"):
        return brapi.get_paid_quote("TEST3", token, feature, {"range": "10y"})

    @patch.object(brapi.requests, "get")
    def test_disabled_features_do_not_call_api_even_with_token(self, get):
        for feature in brapi.FEATURE_ENV:
            self.assertIsNone(self.quote(feature))
        get.assert_not_called()

    @patch.object(brapi.requests, "get")
    def test_collectors_skip_paid_endpoints_by_default(self, get):
        for name, function in (
            ("fetch_utils", "fetch_brapi_mensal"),
            ("fetch_historico_indices", "fetch_brapi_hist"),
            ("fetch_dividendos_historico", "fetch_brapi"),
            ("fetch_dividendos_bdr_etf_stock_reit", "fetch_brapi"),
        ):
            with self.subTest(collector=name):
                module = importlib.import_module(name)
                with patch.object(module, "BRAPI_TOKENS", ["test-key"]):
                    self.assertEqual(getattr(module, function)("TEST3"), [])
        get.assert_not_called()

    @patch.object(brapi.requests, "get")
    def test_enabled_request_uses_auth_header_and_keeps_parameters(self, get):
        self.enable()
        get.return_value = Mock(status_code=200)
        self.assertIs(self.quote(), get.return_value)
        args, kwargs = get.call_args
        self.assertEqual(args[0], "https://brapi.dev/api/quote/TEST3")
        self.assertEqual(kwargs["params"], {"range": "10y"})
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-key")

    @patch.object(brapi.requests, "get")
    def test_missing_token_does_not_send_anonymous_paid_request(self, get):
        self.enable()
        self.assertIsNone(self.quote(token=""))
        get.assert_not_called()

    @patch.object(brapi.requests, "get")
    def test_quota_or_invalid_key_stops_both_features(self, get):
        self.enable()
        for status in (401, 429):
            with self.subTest(status=status):
                brapi._blocked_tokens.clear()
                get.reset_mock()
                get.return_value = Mock(status_code=status)
                self.assertIsNone(self.quote())
                self.assertIsNone(self.quote())
                self.assertIsNone(self.quote("dividends"))
                self.assertEqual(get.call_count, 1)

    @patch.object(brapi.requests, "get")
    def test_forbidden_blocks_only_the_feature_for_that_key(self, get):
        self.enable()
        get.side_effect = [Mock(status_code=403), Mock(status_code=200), Mock(status_code=200)]
        self.assertIsNone(self.quote())
        self.assertIsNone(self.quote())
        self.assertIsNotNone(self.quote("dividends"))
        self.assertIsNotNone(self.quote(token="other-test-key"))
        self.assertEqual(get.call_count, 3)

    @patch.object(brapi.requests, "get")
    def test_missing_ticker_does_not_disable_other_requests(self, get):
        self.enable()
        get.side_effect = [Mock(status_code=404), Mock(status_code=200)]
        self.assertIsNone(self.quote())
        self.assertIsNotNone(self.quote())

    @patch.object(brapi.requests, "get", side_effect=requests.Timeout("timeout"))
    def test_network_failure_allows_other_sources(self, get):
        self.enable()
        self.assertIsNone(self.quote())


if __name__ == "__main__":
    unittest.main()
