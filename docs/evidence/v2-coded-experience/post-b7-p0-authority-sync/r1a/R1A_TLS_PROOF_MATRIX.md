# R1A TLS Proof Matrix

**HEAD base:** `fc905bb` · Implementation in this square

| Case | Result |
|------|--------|
| A. Local expected (no DATABASE_SSL / SSL off) | No ssl opts required |
| B. Managed SSL enabled | `verify: :verify_peer` + CAStore cacertfile + hostname SNI/check |
| C. Missing CA / bad path | Fail closed raise (no password in message) |
| D. `verify_none` in prod runtime source | **ABSENT** |
| E. Plaintext fallback when SSL required | **NONE** |
| F. Unit tests `SslConfigTest` | PASS |

Physical connection against hosted managed Postgres with a real CA: **not exercised in this environment** (no staging DB credential in session). Classified separately from config/unit GREEN.

```
POSTGRES_TLS_VERIFY_NONE_PATH = 0
POSTGRES_TLS_CONFIG = GREEN
POSTGRES_TLS_RUNTIME_MANAGED_ENDPOINT = NOT_EXERCISED
```
