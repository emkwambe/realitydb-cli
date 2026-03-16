# Simulation Strategies

The power of RealityDB lies in its ability to generate data that looks and feels real. This is controlled via **Realism Strategies** in the Column Inspector.

## Common Strategies

- **Full Name / Email / Phone**: Uses localized generators to create realistic identity data.
- **Timestamp**: Generates recent dates. Can be configured with temporal logic.
- **Integer/Decimal Range**: Allows you to set `Min` and `Max` values to keep data within realistic bounds (e.g., `age` between 18 and 80).
- **Enum Values**: Define a list of allowed values (e.g., `active`, `pending`, `cancelled`).

## Distribution Weights
For `Enum` strategies, you can assign weights (%) to each value.
- *Example: Set `active` to 80% and `inactive` to 20% to simulate a healthy user base.*

## Global Engine Config
In the **System Simulation** section (accessible when no table is selected), you can tune the entire engine:
- **Deterministic Seed**: Use the same number to get the exact same "random" data every time.
- **Timeline Duration**: Controls the spread of generated timestamps.
- **Growth Dynamics**: Choose between Linear, Exponential, or S-Curve growth to simulate how your database fills up over time.
- **Anomaly Injection**: Add "Chaos" to your data (null values, out-of-range numbers) to test your system's resilience.
