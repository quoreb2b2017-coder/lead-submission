# Deploying the LeadHub API on AWS

The API is a stateless Express app. It needs **Node 20.9+**, a **MongoDB** connection (Atlas) and outbound internet access (to post leads to the SelectHub relay). The frontend (Vercel) proxies `/api/*` to it through `BACKEND_URL`, so the browser never calls the API domain directly.

```
Browser ──► Vercel (Next.js, /api/* rewrite) ──► AWS (this API) ──► MongoDB Atlas
                                                   └──────────────► SelectHub relay
```

## 1. Before you deploy

1. **MongoDB Atlas**
   - Create a database user and copy the `mongodb+srv://…` connection string.
   - Under **Network Access**, allow the AWS service's outbound IPs. App Runner and Elastic Beanstalk don't have a fixed IP by default, so either allow `0.0.0.0/0` (protected by the user/password) or route the service through a VPC with a NAT gateway and allow that Elastic IP.
2. **Generate a new JWT secret** (do not reuse the local one):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
3. **Create the first admin** once, from your machine, pointing at the Atlas database:
   ```bash
   cd server
   # in server/.env: MONGODB_URI=<atlas uri>, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
   npm run seed
   ```
   `npm run seed:sample` is blocked when `NODE_ENV=production`, so fake leads can't reach the live database.

## 2. Environment variables (set on the AWS service)

| Variable | Example / value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Enables secure cookies and production checks |
| `PORT` | `8080` | App Runner / Beanstalk / Docker default |
| `MONGODB_URI` | `mongodb+srv://…` | **Secret:** store in Secrets Manager / SSM |
| `DB_NAME` | `lead_submission` | |
| `JWT_SECRET` | 96-char random hex | **Secret:** at least 32 chars, or the app refuses to start |
| `JWT_EXPIRES_IN` | `7d` | |
| `CLIENT_URL` | `https://your-app.vercel.app` | Comma-separate several domains |
| `TRUST_PROXY` | `2` | Vercel rewrite + AWS load balancer |
| `RELAY_URL` | `https://prod-relay.herokuapp.com/api/relay` | |
| `RELAY_MODE` | `dry_run` → `live` | Keep `dry_run` until the first test lead is verified |
| `RELAY_CONTENT_TYPE` | `form` | Switch to `json` if the relay rejects form posts |
| `LOGIN_MAX_ATTEMPTS` | `10` | Failed sign-ins per IP per 15 min |
| `TWOFA_ENCRYPTION_KEY` | 96-char random hex | **Secret:** encrypts 2FA authenticator secrets. Copy the value from your local `.env`; never change it once admins use 2FA |

`ADMIN_*` variables are only needed for `npm run seed`, not at runtime.

## 3. Option A: AWS App Runner (recommended, simplest)

Managed HTTPS, auto-scaling, health checks and rolling deploys from a container image.

```bash
cd server
aws ecr create-repository --repository-name leadhub-api
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t leadhub-api .
docker tag leadhub-api:latest <account>.dkr.ecr.<region>.amazonaws.com/leadhub-api:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/leadhub-api:latest
```

In the App Runner console: **Create service → Container registry (ECR)** → the image above.
- Port: `8080`
- Health check: **HTTP**, path `/api/health`
- Environment variables: table above (reference `MONGODB_URI` and `JWT_SECRET` from Secrets Manager)
- CPU/memory: 0.25 vCPU / 0.5 GB is enough to start

The service URL (`https://xxxx.<region>.awsapprunner.com`) is your `BACKEND_URL` on Vercel.

## 4. Option B: Elastic Beanstalk (Node.js platform)

```bash
cd server
eb init leadhub-api --platform "Node.js 22" --region <region>
eb create leadhub-api-prod --single          # or a load-balanced environment
eb setenv NODE_ENV=production MONGODB_URI='…' JWT_SECRET='…' CLIENT_URL=https://your-app.vercel.app TRUST_PROXY=2 RELAY_MODE=dry_run
eb deploy
```

- `Procfile` starts the app with `npm start`; `.ebignore` keeps `.env` and `node_modules` out of the upload.
- Set the load balancer health check path to `/api/health`.
- Add an HTTPS listener (ACM certificate) on the load balancer.

## 5. Option C: EC2 + PM2 + Nginx

```bash
# on the instance (Amazon Linux 2023 / Ubuntu), Node 22 installed
git clone <repo> && cd <repo>/server
npm ci --omit=dev
# create server/.env with the variables above (PORT=5000)
sudo npm i -g pm2
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup
```

Put Nginx in front (`proxy_pass http://127.0.0.1:5000;`, plus `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` and `X-Forwarded-Proto $scheme;`) and add HTTPS with Certbot or an ALB + ACM. With Nginx only, use `TRUST_PROXY=2` (Vercel + Nginx).

## 6. Connect the frontend

On Vercel set `BACKEND_URL=https://<your-api-domain>` (no trailing slash) and redeploy. Do **not** set `NEXT_PUBLIC_API_URL` there.

## 7. Verify after deploying

```bash
curl https://<api>/api/health          # {"status":"ok","database":"connected",…}
curl https://<api>/api/health/ready    # 200 when MongoDB is connected, 503 otherwise
curl https://<vercel-app>/api/health   # same response through the Vercel proxy
```

Then sign in on the Vercel URL, reload the page (you should stay signed in), and run one dry-run submission.

## Built-in production behaviour

- `trust proxy` for correct client IPs behind the load balancer and Vercel
- `keepAliveTimeout` 65s (above the ALB's 60s idle timeout) to avoid intermittent 502s
- Graceful shutdown on `SIGTERM` (finishes in-flight requests, closes MongoDB, 10s cap)
- Login rate limit (10 failed attempts / 15 min / IP) and a general API limit (600 req/min/IP)
- 100 KB request body limit, Helmet security headers, CORS restricted to `CLIENT_URL`
- Combined access logs (health checks excluded); stack traces hidden in responses
- Refuses to start without `MONGODB_URI`/`JWT_SECRET`, or with a JWT secret under 32 characters
