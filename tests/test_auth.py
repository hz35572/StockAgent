from pathlib import Path

from src import auth


def test_auth_enabled_falls_back_to_process_env_when_env_file_missing(monkeypatch, tmp_path: Path) -> None:
    missing_env = tmp_path / "missing.env"
    monkeypatch.setenv("ENV_FILE", str(missing_env))
    monkeypatch.setenv("ADMIN_AUTH_ENABLED", "true")

    auth.refresh_auth_state()

    assert auth.is_auth_enabled() is True


def test_auth_enabled_prefers_existing_env_file_over_process_env(monkeypatch, tmp_path: Path) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("ADMIN_AUTH_ENABLED=false\n", encoding="utf-8")
    monkeypatch.setenv("ENV_FILE", str(env_file))
    monkeypatch.setenv("ADMIN_AUTH_ENABLED", "true")

    auth.refresh_auth_state()

    assert auth.is_auth_enabled() is False
