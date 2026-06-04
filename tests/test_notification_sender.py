# -*- coding: utf-8 -*-
"""
Unit tests for Feishu sender only.
"""
import base64
import hashlib
import hmac
import os
from pathlib import Path
import sys
import types
import unittest
from importlib.util import module_from_spec, spec_from_file_location
from unittest import mock

from dotenv import dotenv_values

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.config import Config


def _config(**overrides):
    """Minimal Config for Feishu sender tests."""
    return Config(stock_list=[], **overrides)


def _response(status_code: int, json_body=None):
    resp = mock.MagicMock()
    resp.status_code = status_code
    resp.text = "ok" if status_code == 200 else "error"
    if json_body is not None:
        resp.json.return_value = json_body
    return resp


def _load_email_sender_class():
    """Load EmailSender directly from its source file without package-side imports."""
    return _load_email_sender_module().EmailSender


def _load_email_sender_module():
    """Load the email sender module directly from source."""
    module_name = "tests._email_sender_under_test"
    if module_name in sys.modules:
        return sys.modules[module_name]

    data_provider_stub = types.ModuleType("data_provider")
    data_provider_base_stub = types.ModuleType("data_provider.base")
    data_provider_base_stub.normalize_stock_code = lambda code: code
    data_provider_stub.base = data_provider_base_stub
    sys.modules.setdefault("data_provider", data_provider_stub)
    sys.modules.setdefault("data_provider.base", data_provider_base_stub)

    module_path = Path(__file__).resolve().parents[1] / "src" / "notification_sender" / "email_sender.py"
    spec = spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load EmailSender from {module_path}")
    module = module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _load_feishu_sender_class():
    """Load FeishuSender directly from its source file without package-side imports."""
    return _load_feishu_sender_module().FeishuSender


def _load_feishu_sender_module():
    """Load the feishu sender module directly from source."""
    module_name = "tests._feishu_sender_under_test"
    if module_name in sys.modules:
        return sys.modules[module_name]

    module_path = Path(__file__).resolve().parents[1] / "src" / "notification_sender" / "feishu_sender.py"
    spec = spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load FeishuSender from {module_path}")
    module = module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _email_config_from_env():
    """Build an email sender config from loaded environment variables."""
    env_file = Path(__file__).resolve().parents[1] / ".env"
    env_values = dotenv_values(env_file) if env_file.exists() else {}

    email_sender = os.getenv("EMAIL_SENDER") or env_values.get("EMAIL_SENDER")
    email_sender_name = os.getenv("EMAIL_SENDER_NAME") or env_values.get(
        "EMAIL_SENDER_NAME", "daily_stock_analysis股票分析助手"
    )
    email_password = os.getenv("EMAIL_PASSWORD") or env_values.get("EMAIL_PASSWORD")
    email_receivers_raw = os.getenv("EMAIL_RECEIVERS") or env_values.get("EMAIL_RECEIVERS", "")
    email_receivers = [
        receiver.strip()
        for receiver in email_receivers_raw.split(",")
        if receiver.strip() and not receiver.strip().startswith("#")
    ]

    return Config(
        stock_list=[],
        email_sender=email_sender,
        email_sender_name=email_sender_name,
        email_password=email_password,
        email_receivers=email_receivers,
    )


class TestFeishuSender(unittest.TestCase):
    """Unit tests for FeishuSender."""

    def test_send_returns_false_when_no_webhook_url(self):
        FeishuSender = _load_feishu_sender_class()
        cfg = _config()
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("hello")

        self.assertFalse(result)

    def test_send_success_returns_true(self):
        feishu_module = _load_feishu_sender_module()
        mock_post = mock.MagicMock()
        feishu_module.requests.post = mock_post
        FeishuSender = _load_feishu_sender_class()
        mock_post.return_value = _response(200, {"code": 0})
        cfg = _config(feishu_webhook_url="https://feishu.example/hook")
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("hello")

        self.assertTrue(result)

    def test_send_http_error_returns_false(self):
        feishu_module = _load_feishu_sender_module()
        mock_post = mock.MagicMock()
        feishu_module.requests.post = mock_post
        FeishuSender = _load_feishu_sender_class()
        mock_post.return_value = _response(400)
        cfg = _config(feishu_webhook_url="https://feishu.example/hook")
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("hello")

        self.assertFalse(result)

    def test_send_with_secret_and_keyword_builds_signed_payload(self):
        feishu_module = _load_feishu_sender_module()
        mock_post = mock.MagicMock()
        feishu_module.requests.post = mock_post
        feishu_module.time.time = mock.MagicMock(return_value=1700000000)
        FeishuSender = _load_feishu_sender_class()
        mock_post.return_value = _response(200, {"code": 0})
        cfg = _config(
            feishu_webhook_url="https://feishu.example/hook",
            feishu_webhook_secret="secret-token",
            feishu_webhook_keyword="股票日报",
        )
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("hello")

        self.assertTrue(result)
        mock_post.assert_called_once()
        payload = mock_post.call_args.kwargs["json"]
        self.assertEqual(payload["timestamp"], "1700000000")
        expected_sign = base64.b64encode(
            hmac.new(
                b"1700000000\nsecret-token",
                digestmod=hashlib.sha256,
            ).digest()
        ).decode("utf-8")
        self.assertEqual(payload["sign"], expected_sign)
        self.assertEqual(
            payload["card"]["elements"][0]["text"]["content"],
            "股票日报\nhello",
        )

    def test_send_error_response_returns_false(self):
        feishu_module = _load_feishu_sender_module()
        mock_post = mock.MagicMock()
        feishu_module.requests.post = mock_post
        FeishuSender = _load_feishu_sender_class()
        mock_post.return_value = _response(200, {"code": 19024, "msg": "keyword not found"})
        cfg = _config(feishu_webhook_url="https://feishu.example/hook")
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("hello")

        self.assertFalse(result)
        self.assertEqual(mock_post.call_count, 2)

    def test_send_with_keyword_that_leaves_too_little_chunk_budget_returns_false(self):
        feishu_module = _load_feishu_sender_module()
        mock_post = mock.MagicMock()
        feishu_module.requests.post = mock_post
        FeishuSender = _load_feishu_sender_class()
        cfg = _config(
            feishu_webhook_url="https://feishu.example/hook",
            feishu_webhook_keyword="abcd",
            feishu_max_bytes=60,
        )
        sender = FeishuSender(cfg)

        result = sender.send_to_feishu("x" * 100)

        self.assertFalse(result)
        mock_post.assert_not_called()


class TestEmailSender(unittest.TestCase):
    """Unit tests for EmailSender."""

    def test_send_email_with_env_config_uses_smtp_ssl(self):
        email_module = _load_email_sender_module()
        EmailSender = _load_email_sender_class()
        cfg = _email_config_from_env()
        if not cfg.email_sender or not cfg.email_password:
            self.skipTest("EMAIL_SENDER / EMAIL_PASSWORD not configured in environment")

        sender = EmailSender(cfg)

        with mock.patch.object(email_module.smtplib, "SMTP_SSL") as mock_smtp_ssl:
            server = mock_smtp_ssl.return_value
            server.send_message.return_value = None

            result = sender.send_to_email("hello from test", subject="email sender test")

        self.assertTrue(result)
        mock_smtp_ssl.assert_called_once()
        self.assertEqual(server.login.call_args.args[0], cfg.email_sender)
        self.assertEqual(server.login.call_args.args[1], cfg.email_password)
        server.send_message.assert_called_once()
        msg = server.send_message.call_args.args[0]
        self.assertEqual(msg["Subject"], "email sender test")
        self.assertIn(cfg.email_sender, msg["From"])
        self.assertEqual(msg["To"], ", ".join(cfg.email_receivers or [cfg.email_sender]))
        server.quit.assert_called_once()

    def test_send_email_with_real_smtp_when_enabled(self):
        if os.getenv("RUN_REAL_EMAIL_TEST") != "1":
            self.skipTest("Set RUN_REAL_EMAIL_TEST=1 to run the real SMTP email test")

        EmailSender = _load_email_sender_class()
        cfg = _email_config_from_env()
        if not cfg.email_sender or not cfg.email_password:
            self.skipTest("EMAIL_SENDER / EMAIL_PASSWORD not configured in environment")

        receiver_override = os.getenv("REAL_EMAIL_TEST_RECEIVER", "").strip()
        receivers = [receiver_override] if receiver_override else (cfg.email_receivers or [cfg.email_sender])
        sender = EmailSender(cfg)
        subject = "real email sender smoke test"
        content = "This is a real SMTP smoke test from tests/test_notification_sender.py."

        result = sender.send_to_email(
            content,
            subject=subject,
            receivers=receivers,
            timeout_seconds=30,
        )

        self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()
