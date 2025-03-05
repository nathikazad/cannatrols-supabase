To deploy the functions, run the following command:

```bash
npx supabase functions deploy <function-name> 
```

If you want to deploy all functions, run the following command:

```bash
npx supabase functions deploy
```

If you want to disable jwt authentication, run the following command:

```bash
npx supabase functions deploy <function-name> --no-verify-jwt
```
