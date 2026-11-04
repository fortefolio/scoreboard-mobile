# Backend Integration & Mobile Services

This document details mobile authentication, Supabase client initialization, and device push notifications.

---

## 1. Supabase Mobile Client

Configured in `src/lib/supabase.ts` with AsyncStorage adapter for persistent session storage:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 2. Push Notifications (`expo-notifications`)

ScoreBoard sends real-time alerts for followed matches and tournament start times:
1. **Permission Request**: Triggered when the user taps "Follow Match" or during onboarding.
2. **Token Registration**: Expo Push Token / FCM Device Token is retrieved via `Notifications.getExpoPushTokenAsync()` and stored in the user's backend profile.
3. **Receipt Handling**: Background and foreground notification handlers display native banners and deep-link users directly into `match/[id]`.

---

## 3. Subscription & Entitlement Checks

Mobile users can enjoy Pro features (such as tournament management) unlocked through:
- Web Stripe Checkout / Customer Portal.
- Club Beta Promo Vouchers redeemed in settings.
- Active tier is retrieved via `supabase.rpc('get_my_subscription')`.
