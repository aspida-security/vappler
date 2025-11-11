# Backend TODOs

## Security
- [ ] **CRITICAL**: Implement real JWT validation in `auth_required()` decorator
  - Currently bypassed in development mode via `FLASK_ENV=development`
  - Need to validate JWT signature against Supabase public key
  - Add user context extraction from JWT claims

## Testing
- [ ] Add integration tests for all API endpoints
- [ ] Add unit tests for JWT validation

## Before Production
- [ ] Change `FLASK_ENV=production` in `.env`
- [ ] Verify auth is enforced
