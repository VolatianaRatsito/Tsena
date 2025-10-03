<!-- Le stock du produit PF1 avant la premiere boucle de la fonction consumeandproduceallMO -->

```bash
# Request URL
curl -X GET --header 'Accept: application/json' --header 'DOLAPIKEY: a1b2c3d4e5f67890abcdef1234567890' 'http://localhost/dolibarr/htdocs/api/index.php/products/329/stock'
```

```json
// Response body
{
  "stock_reel": 0,
  "stock_theorique": 0,
  "stock_warehouses": {
    "100": {
      "real": "0",
      "id": "371"
    }
  }
}
```

<!-- Le stock du produit PF1 apres la premiere boucle de la fonction consumeandproduceallMO -->

```bash
# Request URL
curl -X GET --header 'Accept: application/json' --header 'DOLAPIKEY: a1b2c3d4e5f67890abcdef1234567890' 'http://localhost/dolibarr/htdocs/api/index.php/products/329/stock'
```

```json
{
  "stock_reel": 0,
  "stock_theorique": 1,
  "stock_warehouses": []
}
```

<!-- Le stock du produit PF2 avant la premiere boucle de la fonction consumeandproduceallMO -->

```bash
# Request URL
curl -X GET --header 'Accept: application/json' --header 'DOLAPIKEY: a1b2c3d4e5f67890abcdef1234567890' 'http://localhost/dolibarr/htdocs/api/index.php/products/331/stock'
```

```json
// Response body
{
  "stock_reel": 0,
  "stock_theorique": 0,
  "stock_warehouses": {
    "101": {
      "real": "0",
      "id": "373"
    }
  }
}
```

<!-- Le stock du produit PF2 apres la premiere boucle de la fonction consumeandproduceallMO -->

```bash
# Request URL
curl -X GET --header 'Accept: application/json' --header 'DOLAPIKEY: a1b2c3d4e5f67890abcdef1234567890' 'http://localhost/dolibarr/htdocs/api/index.php/products/329/stock'
```

```json
{
  "stock_reel": 1,
  "stock_theorique": 1,
  "stock_warehouses": {
    "101": {
      "real": "1",
      "id": "374"
    }
  }
}
```
