# Temporal & Lifecycle Logic

Advanced users can model complex system behaviors using dependencies between columns.

## Temporal Logic
Temporal logic ensures that time flows correctly in your simulation.
1. Select a `Timestamp` column.
2. In the Inspector, find the **Temporal Logic** section.
3. Set **"Depends On"** to another timestamp in the same table.
4. Choose a rule: **"Must be AFTER"** or **"Must be BEFORE"**.

*Example: Set `completed_at` to be AFTER `created_at`. The simulation engine will ensure this constraint holds for every generated row.*

## Lifecycle Semantics
Lifecycle semantics allow you to "nullify" fields based on the state of an Enum.
1. Select an `Enum` column (e.g., `status`).
2. In the **Lifecycle Semantics** section, you will see a list of your enum values.
3. For each value, select which other columns should be `NULL`.

*Example: In an `Orders` table, if `status` is `pending`, you can nullify the `shipped_at` and `delivered_at` columns. If the status is `cancelled`, you might nullify `total_amount`.*

This creates highly realistic data where fields only contain values when it makes sense for the entity's current state.
