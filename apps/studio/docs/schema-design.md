# Schema Design Guide

Building a robust schema is the foundation of a successful system simulation.

## Tables and Columns

Each table represents an entity in your system.
- **Table Name**: Should be plural (e.g., `Organizations`, `Orders`).
- **Columns**: Represent the attributes of the entity.

## Primary Keys (PK)

Every table must have a Primary Key. RealityDB supports:
- **UUID**: Random unique identifiers (recommended for modern systems).
- **Auto Increment**: Sequential integers.

## Data Types

RealityDB supports standard types, each mapped to realistic generators:
- `UUID`: Unique identifiers.
- `String`: General text.
- `Integer`: Whole numbers.
- `Decimal`: Currency or precise measurements.
- `Boolean`: True/False flags.
- `Timestamp`: Dates and times.
- `Email/Name/Phone`: Specialized identity types.
- `Enum`: Fixed sets of values (e.g., `status`).

## Foreign Keys (FK)

Foreign Keys link tables together. When you create a relationship, RealityDB can automatically manage these columns for you.
- **Referential Integrity**: The simulation engine ensures that FK values always point to valid PKs in the parent table.
- **Naming Convention**: By default, FKs are named `parent_table_id` (e.g., `user_id`).
