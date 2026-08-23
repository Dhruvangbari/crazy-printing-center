# DHRUVANG CRAZY PRINTING CENTER — Vercel + Supabase
1. Create a Supabase project.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create private Storage buckets: `documents` and `payment-proofs`.
4. Create an account and promote its profile role to ADMIN for the host account.
5. Import this project into Vercel.
6. Add the variables from `.env.example`.
7. Set `NEXT_PUBLIC_UPI_ID` to your real shop UPI ID.
8. Deploy.

This removes the need to run Node, Docker or PostgreSQL locally. The physical printer still needs a shop-side print agent for automatic printing.
For real payments, verify the payment before printing; a screenshot alone is not payment verification.
