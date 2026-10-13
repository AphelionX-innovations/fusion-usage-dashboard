# Usage traces

Frontend séparé de Fusion Performance. Il se connecte à auth-api pour le login, puis lit les routes super-admin :

- `GET /api/auth/usage/projects`
- `GET /api/auth/usage/timeseries`
- `GET /api/auth/usage/top-users`

En développement, Vite proxifie `/auth-api` vers `http://localhost:3001` et `/fusion-api` vers `http://localhost:3000`. Les deux serveurs doivent déjà tourner.

```sh
npm install
npm run dev
```

Ouvre http://localhost:5180. Seul un compte IAM super-admin reçoit les statistiques. Les autres comptes voient une erreur 403.
