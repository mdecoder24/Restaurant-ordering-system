5. Testing Guide




Testing Guide
The product fails in four expensive ways: one tenant sees another's data, a bill is wrong, a
payment and an order disagree, or the kitchen misses an order. Testing effort is weighted
toward those four, with lighter coverage elsewhere.



1. Test layers

  Layer             Tool                       What it covers                 Runs

  Static            ESLint, tsc --noEmit       Types, lint rules              Every commit

  Unit              Vitest                     computeBill , state            Every commit
                                               machine, Zod schemas,
                                               formatters

  Database          pgTAP via supabase         RLS for every table and role   Every commit
  policy            test db

  API integration   Vitest against local       Route handlers: auth,          Every PR
                    Supabase                   validation, idempotency,
                                               webhooks

  Component         Vitest + Testing Library   Item sheet rules, cart,        Every PR
                                               steppers, KDS ticket

  End-to-end        Playwright (mobile and     Full journeys across guest,    Every PR on
                    desktop projects)          kitchen, dashboard             preview

  Accessibility     axe via Playwright         Guest and dashboard            Every PR
                                               screens

  Visual            Playwright                 Primitives and key screens     Every PR
  regression        screenshots

  Load              k6                         Order placement and            Before each
                                               realtime fan-out               release

  Security          Manual checklist plus      Section 6                      Before each
                    automated probes                                          release

  Manual            Real devices               Section 9                      Before pilot and
  exploratory                                                                 each release




                                                                                         Page 1 of 7
5. Testing Guide




2. Coverage targets

  Area                                       Target

   packages/core (billing, state             100% branches
  machine)

  Route handlers                             90% lines; every handler has an unauthorised-
                                             path test

  RLS                                        Every table has select, insert, update, delete tests
                                             per role

  UI components                              Behavioural tests for anything with rules; no
                                             snapshot-only tests

  End-to-end                                 Every P0 requirement in the PRD maps to at least
                                             one spec




3. Test data
        supabase/seed.sql creates two tenants (A and B), each with one dine-in outlet and
       one canteen outlet, 5 tables, 4 categories, 30 items with variants and add-ons, and
       one user per role.
       Tests create their own orders and clean up, or run inside a transaction.
       Payments use the gateway's test mode and a local webhook simulator that signs
       payloads with the test secret.
       Never use real customer data or live keys in tests.


4. Critical unit cases
computeBill


  Case                                    Expectation

  Single item, 5% tax                     Tax split evenly into CGST and SGST; total =
                                          subtotal + tax

  Variant delta and two add-ons, qty 3    Line total = (price + delta + add-ons) x 3

  Mixed tax rates across items            Tax computed per line, then summed

  Service charge on and off               Applied on subtotal per outlet config




                                                                                             Page 2 of 7
5. Testing Guide




  Case                                     Expectation

  Rounding                                 Integer paise throughout; final rounding rule
                                           applied once and reported

  Zero-price item, empty cart              Valid zero line; empty cart rejected

  Large quantities                         No overflow; no float drift

  Client total differs from server total   Server value wins; mismatch returned as a specific
                                           error code


Order state machine


  Case                                                Expectation

  Every allowed transition per role                   Succeeds and writes one order_events
                                                      row

  Every disallowed transition                         Rejected with invalid_transition

  Kitchen attempts reject or refund                   Forbidden

  Guest cancels after accepted                        Rejected

  Canteen order accepted before payment               Rejected
  captured

  Same transition sent twice                          Second call is a no-op, no duplicate event




5. API integration cases

  Area               Cases

  Guest session      Valid QR opens a session; unknown, inactive or
                     regenerated token returns 404; suspended tenant
                     returns the closed page

  Place order        Happy path; sold-out item rejected; add-on
                     min/max enforced; tampered price ignored;
                     missing idempotency key rejected; repeated key
                     returns the original order

  Order visibility   A guest session cannot read another session's
                     order by guessing ids




                                                                                             Page 3 of 7
5. Testing Guide




  Area               Cases

  Status change      Role checks; cross-outlet attempt forbidden

  Menu               Availability toggle revalidates the cached menu

  Payments           Amount derived from DB; signature verification
                     failure rejected; partial payment leaves balance
                     due

  Webhook            Bad signature 400; duplicate delivery is
                     idempotent; captured arriving before client verify
                     still settles; failed leaves order unpaid; refund
                     event updates payment

  Rate limits        Burst of order placements from one session is
                     throttled




6. Security and isolation tests

  Test                                               Pass condition

  Tenant A staff selects tenant B rows, every        Zero rows
  table

  Tenant A staff inserts or updates with tenant B    Denied
  ids

  Anonymous client queries any table directly        Denied

  Manager scoped to outlet 1 reads outlet 2          Denied

  Kitchen role calls refund, staff or settings       403
  endpoints

  Service role key searched for in client bundles    Not present

  IDOR sweep on all /api/*/[id] routes               403 or 404 for foreign ids

  XSS payloads in item names, notes, guest           Rendered as text on guest, KDS and
  names                                              dashboard

  Oversized or wrong-type image upload               Rejected

  PIN brute force                                    Locked out after configured attempts

  Webhook replay with old timestamp                  Rejected or harmless




                                                                                            Page 4 of 7
5. Testing Guide




7. End-to-end scenarios
Each runs with multiple browser contexts in one Playwright test: guest phone, kitchen
tablet, manager desktop.


  ID               Scenario                                   Key assertions

  E2E-             Dine-in happy path: scan, add 3 items      Each status reaches the guest in under
  01               with a variant and add-on, place,          2 s; bill equals computeBill ; table
                   kitchen starts and readies, waiter         returns to free; invoice generated
                   serves, guest pays by UPI test, manager
                   closes table

  E2E-             Second order on the same table             Both orders on one running bill
  02

  E2E-             Canteen happy path: scan counter QR,       Unpaid order never reaches the kitchen;
  03               order, prepay, token shown, ready alert,   token appears then clears on pickup
                   handover                                   display

  E2E-             Item sold out while in cart                Guest sees a clear message and can
  04                                                          remove and continue

  E2E-             Manager rejects an order with a reason     Guest sees the reason; paid amount
  05                                                          refunded in test mode

  E2E-             Guest cancels while placed ; cannot        Cancel button state matches
  06               after accepted

  E2E-             Payment fails then succeeds on retry       One captured payment; no duplicate
  07                                                          charge

  E2E-             Pay at counter with cash                   Waiter records cash; session closes
  08

  E2E-             Kitchen screen goes offline for 30 s       Banner shown; on reconnect both
  09               during two new orders                      tickets present, in order

  E2E-             Guest refreshes during cart and during     Cart and tracking state restored
  10               tracking

  E2E-11           Double tap on Place order                  Exactly one order

  E2E-             QR regenerated                             Old link shows an invalid-code page;
  12                                                          new link works

  E2E-             Owner onboarding: sign up, create          Completed with no errors; PDF has one
  13               outlet, build menu, create tables,         page per table
                   download QR PDF




                                                                                                    Page 5 of 7
5. Testing Guide




  ID               Scenario                                       Key assertions

  E2E-             Call waiter and request bill                   Appears on the dashboard in realtime
  14                                                              and can be acknowledged

  E2E-             Analytics after seeded day                     Totals match hand-computed values
  15




8. Non-functional tests

  Area                        Method                                   Gate

  Guest                       Lighthouse CI, mobile profile, on        Performance 90+, LCP under 2.5 s,
  performance                 menu and tracking pages                  CLS under 0.1

  Bundle size                 Build analysis                           Guest route JS under 200 KB
                                                                       gzipped

  Load                        k6: 50 outlets x 50 concurrent           p95 place-order under 800 ms;
                              orders over 10 min                       error rate under 0.5%; no lost
                                                                       realtime events

  Realtime latency            Scripted status change with              p95 under 2 s
                              timestamp comparison

  Accessibility               axe automated plus keyboard and          Zero serious or critical issues
                              screen-reader pass on guest flow

  Resilience                  Throttle to slow 3G and offline in       Graceful messages; no data loss in
                              Playwright                               cart




9. Manual device checklist
       Scan a printed QR with the default camera on a low-end Android phone and an
       iPhone; menu opens in the default browser and in in-app browsers.
       UPI intent flow hands off to a UPI app and returns to the tracking page.
       KDS on a tablet for a 2-hour soak: screen stays awake, sound alerts work after idle,
       memory stable.
       Dashboard on a 1366 x 768 laptop and a tablet.
       Printed QR readable at 30 cm under dim light.
       Text at 200% zoom on the guest app.




                                                                                                         Page 6 of 7
5. Testing Guide




10. CI pipeline and release gates

  Stage                    Steps                                                  Blocks merge

  1. Static                Lint, typecheck                                        Yes

  2. Unit and policy       Vitest, pgTAP                                          Yes

  3. Integration           API tests on local Supabase                            Yes

  4. Preview               Deploy preview, Playwright, axe, Lighthouse            Yes

  5. Release               k6 load, security checklist, manual device checklist   Blocks release


A release ships only when stages 1 to 5 pass, no open severity-1 or severity-2 bugs exist,
and migrations have been rehearsed on a copy of production.


11. Bug severity

  Severity         Definition                                          Response

  S1               Data leak across tenants, wrong charge, orders      Fix immediately; block
                   lost                                                release

  S2               Core flow broken for a role with no workaround      Fix before release

  S3               Degraded flow with a workaround                     Next release

  S4               Cosmetic                                            Backlog




12. Monitoring after launch
Tests continue in production as monitors: a synthetic guest order on a hidden test outlet
every 10 minutes, alerts on webhook failures, payment success rate below 90%, realtime
disconnect spikes, and any order stuck in placed for more than 5 minutes during open
hours.




                                                                                                 Page 7 of 7
