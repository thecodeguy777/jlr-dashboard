# Payouts Table Schema Reference

## Table: `payouts`

This table stores all payroll/payout records for workers, including their earnings, deductions, allowances, and commissions.

### Columns

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | uuid | Primary key | Auto-generated |
| `employee_id` | uuid | Foreign key to workers table | References the worker this payout belongs to |
| `week_start` | date | Start date of the payroll week | Format: YYYY-MM-DD, always a Sunday |
| `amount` | numeric | Final payout amount | Used during commit process |
| `status` | text | Payout status | Values: 'confirmed', 'pending', etc. |
| `confirmed_by` | uuid | Who confirmed this payout | Foreign key to users table |
| `confirmed_at` | timestamp | When the payout was confirmed | NULL for uncommitted payouts |
| `gross_income` | numeric | Gross income from stock movement | Calculated from (previous_stock + deliveries - current_stock) |
| `cash_advance` | numeric | Cash advance amount | Direct cash advance given to worker |
| `paid_by_hours` | jsonb | Hours worked and amounts paid | `{"inhouse": amount, "assistant": amount}` |
| `deductions` | jsonb | All deductions applied | `{"sss": amount, "loan": amount, "cash_advance": amount}` |
| `allowances` | jsonb | All allowances given | `{"general": amount, "transport": amount, "meal": amount}` |
| `commissions` | jsonb | All commissions earned | `{"bonus": amount, "overtime": amount, "holiday": amount}` |
| `net_total` | numeric | Final net pay amount | gross + hours + allowances + commissions - deductions - savings |
| `rate_snapshots` | jsonb | Hourly rates at time of payout | `{"inhouse": rate, "assistant": rate}` |
| `inhouse_hours` | numeric | In-house hours worked | Calculated field for reporting |
| `assistant_hours` | numeric | Assistant hours worked | Calculated field for reporting |
| `returns_summary` | jsonb | Returns/repairs summary | `{"as_repair_worker": [], "as_worker": [], "totals": {}}` |

## Table: `savings`

This is a **separate table** that stores worker savings records. Savings are NOT stored in the payouts table.

### Columns

| Column | Type | Description | Notes |
|--------|------|-------------|-------|
| `id` | uuid | Primary key | Auto-generated |
| `worker_id` | uuid | Foreign key to workers table | References the worker this savings belongs to |
| `week_start` | date | Start date of the payroll week | Format: YYYY-MM-DD, always a Sunday |
| `amount` | numeric | Savings amount for this week | Amount deducted from worker's pay |
| `type` | text | Type of savings | Values: 'auto', 'manual', etc. |
| `remarks` | text | Optional remarks about the savings | For additional notes |

### Key Relationships

- `worker_id` → `workers.id`

### JSONB Field Structures

#### `paid_by_hours`
```json
{
  "inhouse": 2250.00,    // Amount paid for in-house work
  "assistant": 750.00    // Amount paid for assistant work
}
```

#### `deductions`
```json
{
  "sss": 245.00,           // SSS contribution
  "loan": 625.00,          // Loan payment (typically 1/8 of loan balance)
  "cash_advance": 500.00   // Cash advance deduction
}
```

#### `allowances`
```json
{
  "general": 100.00,    // General allowance
  "transport": 50.00,   // Transportation allowance
  "meal": 75.00         // Meal allowance
}
```

#### `commissions`
```json
{
  "bonus": 200.00,     // Performance bonus
  "overtime": 150.00,  // Overtime pay
  "holiday": 300.00    // Holiday pay
}
```

#### `rate_snapshots`
```json
{
  "inhouse": 56.25,    // In-house hourly rate at time of payout
  "assistant": 75.00   // Assistant hourly rate at time of payout
}
```

#### `returns_summary`
```json
{
  "as_repair_worker": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 5,
      "type": "repair",
      "labor_cost": 250.00,
      "product": {"name": "Product Name"},
      "worker": {"name": "Worker Name"}
    }
  ],
  "as_worker": [
    {
      "id": "uuid",
      "product_id": "uuid",
      "quantity": 2,
      "type": "transform",
      "product": {"name": "Product Name"}
    }
  ],
  "totals": {
    "labor_earnings": 250.00,
    "repair_quantity": 3,
    "transform_quantity": 2
  }
}
```

### Key Relationships

- `employee_id` → `workers.id`
- `confirmed_by` → `users.id` (optional)

### Business Logic

#### Week Calculation
- Payroll weeks run **Sunday to Saturday**
- `week_start` is always a Sunday
- Stock records are taken on Saturday (end of week)
- Previous stock = Saturday before the payroll week starts
- Current stock = Saturday at the end of the payroll week

#### Payout Calculation Flow
1. **Gross Income**: `(previous_stock + deliveries - current_stock) * commission_rate`
2. **Hours Pay**: `(inhouse_hours * inhouse_rate) + (assistant_hours * assistant_rate)`
3. **Returns Labor**: Sum of labor costs where worker is repair worker
4. **Savings**: Fetched from separate `savings` table for the week
5. **Total Earnings**: `gross_income + hours_pay + returns_labor + allowances + commissions`
6. **Net Pay**: `total_earnings - deductions - savings`

#### Status Workflow
1. **Uncommitted**: `confirmed_at = NULL`, `status = NULL`
2. **Committed**: `confirmed_at = timestamp`, `status = 'confirmed'`, `amount = net_total`

#### Savings Workflow
1. **Auto Savings**: Created with `type = 'auto'` during payroll processing
2. **Manual Savings**: Created with `type = 'manual'` for one-time adjustments
3. **Historical Lookup**: Previous week's savings auto-populate for consistency

### Important Notes

#### Data Access Patterns
- Use `employee_id` for worker lookups in payouts table
- Use `worker_id` for worker lookups in savings table
- Always filter by `week_start` for weekly payroll data
- Use `confirmed_at IS NULL` to find uncommitted payouts
- Use `confirmed_at IS NOT NULL` to find committed payouts

#### JSONB Field Access
- Access JSONB values directly: `payout.deductions?.cash_advance`
- Don't try to reduce/transform JSONB values - use them as stored
- Optional chaining is recommended for safety

#### Savings Handling
- **CRITICAL**: Savings are stored in a separate `savings` table, NOT in payouts
- Savings amounts are deducted from net pay but not stored in payouts table
- Use separate INSERT/UPDATE operations on savings table during payout save
- Query savings table separately to get worker's total savings

#### Memory References
- SSS contribution typically defaults to ₱245
- Loan payments are typically 1/8 of total loan balance
- Previous deductions should auto-populate from historical data
- Orange color theme preferred for UI design

### Common Queries

#### Get Current Week Payouts
```sql
SELECT * FROM payouts 
WHERE week_start = '2025-06-21'  -- Sunday of target week
```

#### Get Current Week Payouts with Savings
```sql
SELECT 
  p.*,
  s.amount as savings_amount
FROM payouts p
LEFT JOIN savings s ON s.worker_id = p.employee_id 
  AND s.week_start = p.week_start 
  AND s.type = 'auto'
WHERE p.week_start = '2025-06-21'
```

#### Get Uncommitted Payouts
```sql
SELECT * FROM payouts 
WHERE week_start = '2025-06-21' 
AND confirmed_at IS NULL
```

#### Get Worker's Recent Payouts with Savings
```sql
SELECT 
  p.*,
  s.amount as savings_amount
FROM payouts p
LEFT JOIN savings s ON s.worker_id = p.employee_id 
  AND s.week_start = p.week_start 
  AND s.type = 'auto'
WHERE p.employee_id = 'worker-uuid'
AND p.confirmed_at IS NOT NULL
ORDER BY p.week_start DESC
LIMIT 10
```

#### Get Worker's Total Savings
```sql
SELECT 
  worker_id,
  SUM(amount) as total_savings
FROM savings 
WHERE worker_id = 'worker-uuid'
GROUP BY worker_id
```

#### Calculate Total Hours from Paid Amount
```sql
SELECT 
  employee_id,
  ROUND((paid_by_hours->>'inhouse')::numeric / (rate_snapshots->>'inhouse')::numeric) as inhouse_hours,
  ROUND((paid_by_hours->>'assistant')::numeric / (rate_snapshots->>'assistant')::numeric) as assistant_hours
FROM payouts
WHERE week_start = '2025-06-21'
```

---

*Last Updated: Based on current database schema as of conversation* 