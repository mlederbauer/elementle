import unittest

from trivia_format import (
    format_measurement,
    format_optional_numeric,
    format_significant,
    is_numeric,
    kelvin_to_celsius,
)


class TriviaFormatTests(unittest.TestCase):
    def test_formats_positive_values_to_three_significant_digits(self):
        self.assertEqual(format_significant(2.2149), "2.21")
        self.assertEqual(format_significant(15500), "15,500")
        self.assertEqual(format_significant(1_234_567), "1,230,000")
        self.assertEqual(format_significant(999.5), "1,000")

    def test_formats_zero_negative_and_small_values(self):
        self.assertEqual(format_significant(0), "0")
        self.assertEqual(format_significant(-38.833), "-38.8")
        self.assertEqual(format_significant(0.00098765), "0.000988")

    def test_preserves_units_and_currency_around_formatted_values(self):
        self.assertEqual(format_measurement(15500, prefix="$", suffix="/kg"), "$15,500/kg")
        self.assertEqual(format_measurement(1.234, suffix=" g/cm³"), "1.23 g/cm³")

    def test_converts_kelvin_with_decimal_precision_before_rounding(self):
        celsius = kelvin_to_celsius(4098.15)
        self.assertEqual(format_measurement(celsius, suffix=" °C"), "3,830 °C")

    def test_preserves_non_numeric_optional_values(self):
        self.assertEqual(format_optional_numeric("high"), "high")
        self.assertEqual(format_optional_numeric("  unknown  "), "  unknown  ")
        self.assertEqual(format_optional_numeric("1.2345"), "1.23")

    def test_rejects_non_finite_or_invalid_numeric_values(self):
        self.assertFalse(is_numeric("unknown"))
        self.assertFalse(is_numeric(float("nan")))
        with self.assertRaises(ValueError):
            format_significant("unknown")


if __name__ == "__main__":
    unittest.main()
