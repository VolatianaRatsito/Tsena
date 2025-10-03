```bash
curl -X GET --header 'Accept: application/json' --header 'DOLAPIKEY: a1b2c3d4e5f67890abcdef1234567890' 'http://localhost/dolibarr/htdocs/api/index.php/products/{id_product}/stock'
```

```json
// Response Body example
{
  "stock_reel": 30,
  "stock_theorique": 15,
  "stock_warehouses": {
    "31": {
      "real": "30",
      "id": "86"
    }
  }
}
```
