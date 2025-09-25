# JWT Custom Claims Setup for Supabase Authentication

## Overview
This document outlines the setup required for JWT custom claims to include `company_id` for proper Row Level Security (RLS) filtering in the Sophon POS system.

## Required Setup

### 1. Database Function for Custom Claims
Create a database function that will be called during authentication to add custom claims to the JWT:

```sql
-- Function to get user's company_id for JWT claims
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    company_id_result text;
BEGIN
    -- First check if user is a company (direct login)
    SELECT id::text INTO company_id_result
    FROM public.Company
    WHERE auth.uid() = user_id;
    
    -- If not found, check if user is a worker
    IF company_id_result IS NULL THEN
        SELECT company_id::text INTO company_id_result
        FROM public.Worker
        WHERE auth.uid() = user_id;
    END IF;
    
    RETURN company_id_result;
END;
$$;
```

### 2. Supabase Auth Hook Configuration
Configure Supabase Auth hooks to add custom claims during token generation:

```sql
-- Create a function that will be called by Supabase Auth hooks
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    claims jsonb;
    user_id uuid;
    company_id text;
BEGIN
    -- Extract user ID from the event
    user_id := (event->>'user_id')::uuid;
    
    -- Get the company_id for this user
    company_id := public.get_user_company_id(user_id);
    
    -- Add company_id to claims
    claims := jsonb_build_object('company_id', company_id);
    
    -- Return the modified event with custom claims
    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

### 3. Environment Configuration
Add the following to your Supabase project configuration:

```bash
# In Supabase Dashboard -> Settings -> API
# Add custom claims hook URL
SUPABASE_AUTH_HOOK_CUSTOM_ACCESS_TOKEN_URI=https://your-project.supabase.co/rest/v1/rpc/custom_access_token_hook
```

### 4. Alternative: Client-Side Implementation
If database hooks are not available, implement custom claims on the client side during authentication:

```javascript
// During login/signup process
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});

if (authData.user) {
    // Get company_id based on user type
    let companyId;
    
    // Check if user is a company
    const { data: companyData } = await supabase
        .from('Company')
        .select('id')
        .eq('email', email)
        .single();
    
    if (companyData) {
        companyId = companyData.id;
    } else {
        // Check if user is a worker
        const { data: workerData } = await supabase
            .from('Worker')
            .select('company_id')
            .eq('email', email)
            .single();
        
        if (workerData) {
            companyId = workerData.company_id;
        }
    }
    
    // Update user metadata with company_id
    if (companyId) {
        await supabase.auth.updateUser({
            data: { company_id: companyId }
        });
    }
}
```

## Testing JWT Claims

### 1. Verify JWT Token Contains company_id
```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

if (session) {
    // Decode JWT to check claims
    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
    console.log('JWT Claims:', payload);
    console.log('Company ID:', payload.company_id);
}
```

### 2. Test RLS Policies
```sql
-- Test query that should be filtered by company_id
SELECT * FROM public.Inventory;

-- This should only return inventory items for the authenticated user's company
```

## Security Considerations

1. **Secure Functions**: All database functions should use `SECURITY DEFINER` to run with elevated privileges
2. **Input Validation**: Validate all inputs in custom claim functions
3. **Error Handling**: Implement proper error handling to prevent information leakage
4. **Audit Logging**: Consider logging authentication events for security monitoring

## Troubleshooting

### Common Issues:
1. **RLS Blocking All Queries**: Ensure JWT contains `company_id` claim
2. **Wrong Company Data**: Verify user-to-company mapping is correct
3. **Performance Issues**: Consider indexing on `company_id` columns for better RLS performance

### Debug Queries:
```sql
-- Check current JWT claims
SELECT auth.jwt();

-- Check if RLS is working
SELECT current_setting('row_security', true);

-- Test company_id extraction
SELECT auth.jwt() ->> 'company_id' as company_id;
```