# QuickBooks OAuth Flow

## Setup

1. Create app at developer.intuit.com
2. Get Client ID & Secret
3. Set redirect URI: `{app_url}/api/quickbooks/callback`
4. Request scope: `com.intuit.quickbooks.accounting`

## Authorization

```typescript
// Start OAuth
const authUrl = oauthClient.authorizeUri({
  scope: [OAuthClient.scopes.Accounting],
  state: organizationId,
})

// Handle callback
const tokens = await oauthClient.createToken(authorizationCode)

// Save encrypted
await prisma.organization.update({
  where: { id: organizationId },
  data: {
    quickbooksRealmId: tokens.realmId,
    quickbooksAccessToken: encrypt(tokens.access_token),
    quickbooksRefreshToken: encrypt(tokens.refresh_token),
    quickbooksExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
  },
})
```

## Token Refresh

```typescript
// Check if expired
if (org.quickbooksExpiresAt < new Date()) {
  const newTokens = await refreshAccessToken(decrypt(org.quickbooksRefreshToken))
  // Update database
}
```

## Disconnect

```typescript
await oauthClient.revoke({ token: refreshToken })
await prisma.organization.update({
  data: {
    quickbooksRealmId: null,
    quickbooksAccessToken: null,
    quickbooksRefreshToken: null,
  },
})
```
