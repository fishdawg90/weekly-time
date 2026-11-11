# Oracle receipt export, version 1

`oracle.txt` is a UTF-8, tab-separated table, available once all receipt expenses in the group are ready. `summary.tsv` has the same columns and can include drafts. Mileage is excluded from both and remains in `oracle-mileage.txt` / `mileage-summary.tsv`.

Column order:

| TSV heading | JSON key | Value |
| --- | --- | --- |
| Evidence | evidence | Three-digit group item number, e.g. 001; matches evidence file prefixes. Gaps can occur where mileage items are excluded. |
| Date | date | ISO date: YYYY-MM-DD. Convert to Oracle's display format in the future bookmarklet. |
| Receipt Amount | receiptAmount | Decimal string with two decimal places. Original receipt amount; no exchange conversion. |
| Expense Type | expenseType | Rail travel, Travel Meals, Parking, or Ground Transportation. Exact case and spacing. |
| Justification | justification | The business justification entered in the app (previously Description). |
| Receipt Currency | receiptCurrency | GBP or EUR. Receipt currency is enabled in Oracle. |

Tabs and line breaks in free text become spaces in TSV. JSON preserves the original free text.

`oracle-expenses.json` contains:

```json
{
  "format": "weekly-expenses-oracle",
  "version": 1,
  "receiptCurrencyEnabled": true,
  "ready": true,
  "expenses": [
    {
      "evidence": "001",
      "date": "2026-11-11",
      "receiptAmount": "12.50",
      "expenseType": "Rail travel",
      "justification": "Travel to project meeting",
      "receiptCurrency": "EUR"
    }
  ]
}
```

JSON is included even for draft packs; consumers must check `ready` before filling Oracle. `restore.json` remains the full app backup with its existing internal field names and all attachments. The earlier generic expense bookmarklet uses a different column order; its link has been removed from the app pending the Oracle-specific implementation.

Old Train, Meals and Taxi values map to Rail travel, Travel Meals and Ground Transportation when loading/importing. Unsupported saved values are retained and flagged for correction before they can be marked ready.
