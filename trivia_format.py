"""Formatting helpers for measured numeric trivia values."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def _decimal(value):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as error:
        raise ValueError(f"not a finite number: {value!r}") from error
    if not number.is_finite():
        raise ValueError(f"not a finite number: {value!r}")
    return number


def is_numeric(value):
    """Return whether value can be represented as a finite decimal number."""
    try:
        _decimal(value)
        return True
    except ValueError:
        return False


def format_significant(value, digits=3):
    """Format a finite numeric value with at most ``digits`` significant digits."""
    if not isinstance(digits, int) or digits < 1:
        raise ValueError("digits must be a positive integer")

    number = _decimal(value)
    if number.is_zero():
        return "0"

    exponent = number.adjusted() - digits + 1
    rounded = number.quantize(Decimal(f"1e{exponent}"), rounding=ROUND_HALF_UP)
    text = format(rounded, ",f")
    if "." in text:
        text = text.rstrip("0").rstrip(".")
    return text


def format_measurement(value, prefix="", suffix=""):
    """Format a numeric value with significant digits and its display adornments."""
    return f"{prefix}{format_significant(value)}{suffix}"


def kelvin_to_celsius(value):
    """Convert Kelvin to Celsius using decimal arithmetic."""
    return _decimal(value) - Decimal("273.15")


def format_optional_numeric(value):
    """Format numeric values, preserving non-numeric text unchanged."""
    return format_significant(value) if is_numeric(value) else str(value)
