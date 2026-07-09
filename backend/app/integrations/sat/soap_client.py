import os

import requests
import zeep
from zeep.transports import Transport


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


PAC_WSDL_TIMEOUT_SECONDS = _float_env("PAC_WSDL_TIMEOUT_SECONDS", 30)
PAC_OPERATION_TIMEOUT_SECONDS = _float_env("PAC_OPERATION_TIMEOUT_SECONDS", 180)


def create_pac_client(wsdl_url: str, history=None) -> zeep.Client:
    session = requests.Session()
    transport = Transport(
        session=session,
        timeout=PAC_WSDL_TIMEOUT_SECONDS,
        operation_timeout=PAC_OPERATION_TIMEOUT_SECONDS,
    )
    plugins = [history] if history else None
    return zeep.Client(wsdl_url, transport=transport, plugins=plugins)


def is_pac_timeout_error(exc: Exception) -> bool:
    current = exc
    while current:
        if isinstance(current, requests.exceptions.Timeout):
            return True
        message = str(current).lower()
        if (
            "timed out" in message
            or "read timed out" in message
            or "operation timed out" in message
            or "timeout" in message
            or "tiempo de espera" in message
        ):
            return True
        current = current.__cause__ or current.__context__
    return False
