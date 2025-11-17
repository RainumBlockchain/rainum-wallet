# Rainum Blockchain Admin API Requirements

## 🎯 Overview

For the FIAT-X-RAINUM gateway to work, the `rainum-blockchain` repository needs to expose admin API endpoints for minting and burning tokens.

These endpoints will be called by the fiat gateway webhooks when users deposit or withdraw fiat currency.

---

## 📋 Required Endpoints

### 1. **POST /api/admin/mint**

Mint RAINUM tokens to a specified address (for fiat deposits).

**Request:**
```json
{
  "address": "rainum1abc...",
  "amount": 1000.0,
  "memo": "Fiat deposit from Modulr"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x1234abcd...",
  "blockHeight": 12345,
  "timestamp": "2025-11-17T10:30:00Z"
}
```

**Authentication:**
- Requires `Authorization: Bearer <RAINUM_ADMIN_API_KEY>` header
- Should validate API key from environment variable

**Implementation Notes:**
- Validate address format
- Validate amount > 0
- Log all mint operations for audit
- Return transaction hash for tracking

---

### 2. **POST /api/admin/burn**

Burn RAINUM tokens from a specified address (for fiat withdrawals).

**Request:**
```json
{
  "address": "rainum1abc...",
  "amount": 500.0,
  "memo": "Fiat withdrawal to bank account"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x5678efgh...",
  "blockHeight": 12346,
  "timestamp": "2025-11-17T10:35:00Z"
}
```

**Authentication:**
- Requires `Authorization: Bearer <RAINUM_ADMIN_API_KEY>` header

**Implementation Notes:**
- Validate address has sufficient balance
- Validate amount > 0
- Log all burn operations for audit
- Return transaction hash for tracking

---

### 3. **GET /api/balances/:address**

Get current RAINUM balance for an address.

**Request:**
```
GET /api/balances/rainum1abc...
```

**Response:**
```json
{
  "address": "rainum1abc...",
  "balance": 1500.0,
  "currency": "RAINUM"
}
```

**Authentication:**
- Public endpoint (read-only)

---

### 4. **GET /api/transactions/:hash**

Get transaction details by hash.

**Request:**
```
GET /api/transactions/0x1234abcd...
```

**Response:**
```json
{
  "hash": "0x1234abcd...",
  "from": "rainum1abc...",
  "to": "rainum1xyz...",
  "amount": 1000.0,
  "type": "mint",
  "blockHeight": 12345,
  "timestamp": "2025-11-17T10:30:00Z",
  "status": "confirmed"
}
```

---

### 5. **GET /api/status**

Blockchain health check and status.

**Request:**
```
GET /api/status
```

**Response:**
```json
{
  "status": "online",
  "blockHeight": 12346,
  "totalAccounts": 1234,
  "totalBlocks": 12346,
  "version": "1.0.0"
}
```

---

## 🔒 Security Requirements

### 1. **API Key Authentication**

```rust
// Example middleware (Rust/Actix-web)

fn verify_admin_auth(req: &HttpRequest) -> Result<(), Error> {
    let admin_key = env::var("RAINUM_ADMIN_API_KEY")
        .expect("RAINUM_ADMIN_API_KEY must be set");

    let auth_header = req.headers()
        .get("Authorization")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");

    let token = auth_header.replace("Bearer ", "");

    if token != admin_key {
        return Err(Error::Unauthorized);
    }

    Ok(())
}
```

### 2. **Rate Limiting**

- Implement rate limiting on admin endpoints
- Suggested: 100 requests per minute per IP

### 3. **Audit Logging**

```rust
// Log all admin operations
log_admin_operation(AdminOperation {
    operation_type: "MINT",
    address: address.clone(),
    amount: amount,
    tx_hash: tx_hash.clone(),
    timestamp: Utc::now(),
    api_key_used: truncate_api_key(&api_key),
});
```

---

## 🔧 Implementation Example (Rust/Actix-web)

```rust
// src/api/admin.rs

use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct MintRequest {
    address: String,
    amount: f64,
    memo: Option<String>,
}

#[derive(Serialize)]
struct MintResponse {
    success: bool,
    tx_hash: String,
    block_height: u64,
    timestamp: String,
}

pub async fn mint_tokens(
    req: HttpRequest,
    body: web::Json<MintRequest>,
    blockchain: web::Data<Blockchain>,
) -> Result<HttpResponse> {
    // 1. Verify admin authentication
    verify_admin_auth(&req)?;

    // 2. Validate inputs
    if body.amount <= 0.0 {
        return Ok(HttpResponse::BadRequest().json({
            "error": "Amount must be greater than 0"
        }));
    }

    // 3. Execute mint operation
    let tx = blockchain.mint_tokens(
        &body.address,
        body.amount,
        body.memo.as_deref(),
    )?;

    // 4. Log operation
    log::info!(
        "MINT: {} RAINUM → {} (tx: {})",
        body.amount,
        body.address,
        tx.hash
    );

    // 5. Return response
    Ok(HttpResponse::Ok().json(MintResponse {
        success: true,
        tx_hash: tx.hash,
        block_height: tx.block_height,
        timestamp: tx.timestamp.to_rfc3339(),
    }))
}

pub async fn burn_tokens(
    req: HttpRequest,
    body: web::Json<MintRequest>, // Same structure as mint
    blockchain: web::Data<Blockchain>,
) -> Result<HttpResponse> {
    verify_admin_auth(&req)?;

    // Similar to mint, but call blockchain.burn_tokens()
    // ...
}
```

---

## 🌐 CORS Configuration

Allow the wallet frontend to call these APIs:

```rust
use actix_cors::Cors;

let cors = Cors::default()
    .allowed_origin("http://localhost:3001") // Dev
    .allowed_origin("https://wallet.rainum.com") // Prod
    .allowed_methods(vec!["GET", "POST"])
    .allowed_headers(vec!["Authorization", "Content-Type"])
    .max_age(3600);

HttpServer::new(move || {
    App::new()
        .wrap(cors)
        // ... routes
})
```

---

## 📝 Environment Variables

Add to `rainum-blockchain/.env`:

```bash
# Admin API Key
RAINUM_ADMIN_API_KEY=local-dev-api-key-12345678

# API Server
API_HOST=0.0.0.0
API_PORT=8080

# CORS
ALLOWED_ORIGINS=http://localhost:3001,https://wallet.rainum.com
```

---

## ✅ Testing Checklist

### Manual Testing:

1. **Mint Endpoint:**
   ```bash
   curl -X POST http://localhost:8080/api/admin/mint \
     -H "Authorization: Bearer local-dev-api-key-12345678" \
     -H "Content-Type: application/json" \
     -d '{
       "address": "rainum1test123",
       "amount": 1000,
       "memo": "Test mint"
     }'
   ```

2. **Burn Endpoint:**
   ```bash
   curl -X POST http://localhost:8080/api/admin/burn \
     -H "Authorization: Bearer local-dev-api-key-12345678" \
     -H "Content-Type: application/json" \
     -d '{
       "address": "rainum1test123",
       "amount": 500,
       "memo": "Test burn"
     }'
   ```

3. **Balance Endpoint:**
   ```bash
   curl http://localhost:8080/api/balances/rainum1test123
   ```

4. **Status Endpoint:**
   ```bash
   curl http://localhost:8080/api/status
   ```

### Expected Results:
- ✅ Mint creates new tokens and returns tx hash
- ✅ Burn reduces balance and returns tx hash
- ✅ Balance shows correct amount
- ✅ Status shows blockchain is online

---

## 🚨 Important Notes

1. **API Key Security:**
   - Never commit API keys to git
   - Use different keys for dev/prod
   - Rotate keys regularly

2. **Transaction Limits:**
   - Consider adding max mint/burn limits per transaction
   - Add daily/hourly caps for security

3. **Idempotency:**
   - Make mint/burn operations idempotent using unique transaction IDs
   - Prevent double-minting on webhook retries

4. **Monitoring:**
   - Log all admin operations
   - Set up alerts for unusual activity
   - Track total supply changes

---

## 📖 Reference

Once implemented, the fiat gateway will call these endpoints:
- **Modulr PAYIN webhook** → `/api/admin/mint`
- **Modulr withdrawal** → `/api/admin/burn`
- **MoonPay completed** → `/api/admin/mint`
- **UI balance display** → `/api/balances/:address`

---

**Næste skridt:** Implement these endpoints i `rainum-blockchain` repository!
