```
dev building

dev: docker-compose -f docker-compose.dev.yml up --build -d
```

```
nginx building

nginx: docker-compose -f docker-compose.nginx.yml up --build -d
```

```
dev routes:

main route: http://localhost:3000/
invoice route: http://localhost:3000/invoices
```

```
nginx routes:

main route: http://localhost:8080/
invoice route: http://localhost:8080/invoices
```# invoice_hub_microservices
