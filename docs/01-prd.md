1. PRD




QR Ordering Platform — Build
Documentation
  ​Nov 13, 2026   ·   ​@Kushwant KR




Start here
This set specifies an original QR-based restaurant ordering platform, modelled on the
feature set described in the Qrder case-study page. Six tabs, read in this order:


  #         Tab                  What it settles                        Feed to the build agent when

  1         PRD (this tab)       What to build, for whom, and what      Always, first
                                 is out of scope

  2         Architecture         Stack, data model, API, realtime,      Scaffolding and every
                                 security                               backend task

  3         Design System        Tokens, components, screen             Every UI task
                                 patterns

  4         AI Agents            Rules, repo layout, task order,        Loaded as the agent's
            Guide                definition of done                     standing instructions

  5         Testing Guide        Test layers, critical cases, release   Every task, before marking
                                 gates                                  done

  6         Application          Screen-by-screen journeys and          Any feature touching routing
            Flow                 the order state machine                or order state


Three ground rules for the build

  1. Build the capability, not the brand. Use your own product name, logo, copy, colours
     and screenshots. Do not reuse the name Qrder, Pegorion's wording, or their imagery.
  2. Every requirement below is tagged Observed (stated on the source page) or Inferred
     (my design decision to fill a gap). Inferred items are yours to change.
  3. The source page's results (45% faster service, 30% lower cost, 22% higher basket,
     4.9/5, ₹5–7 lakh saved) are their unverified marketing claims. Treat them as targets to
         measure, never as claims for your own product.




                                                                                                Page 1 of 9
1. PRD




Source analysis
The source is a marketing case study, not the application, so it reveals the feature surface
but nothing about the implementation. I found no public technical write-up of the product
in a web search.

What the page states (Observed)


  Area                      Evidence on the page

  Positioning               Hospitality tech, QR-based ordering, enterprise
                            SaaS, software-only deployment

  Guest flow                Scan a table QR, view the menu, place an order, pay
                            from the phone, no app install

  Menu                      Images, dietary filters, upsells ("smart upsells"
                            raising basket size)

  Orders                    Live order tracking, orders grouped by table,
                            automated routing to the kitchen

  Owner tools               One dashboard for menus, orders, tables,
                            payments; billing and inventory mentioned

  Kitchen                   Dedicated kitchen screen with clear, sequential
                            order instructions in real time

  Integrations              "Seamless POS integration", integrated payment
                            methods

  Insights                  "No insights" is listed as a problem solved, implying
                            analytics

  Market                    Prices in ₹, so India: UPI, GST

  Four screens shown        Restaurant Dashboard, Student Ordering Interface,
                            Canteen Management Panel, Kitchen Screen


What that implies

         The "Student" and "Canteen" screens show the product runs in two modes: dine-in
         (order tied to a table, served at the table) and canteen/counter (order tied to a token,
         collected at a counter). The data model must support both.
         "Enterprise SaaS" implies multi-tenancy: many restaurants, each with outlets, staff
         roles and isolated data.

What the page does not tell us (all Inferred in these docs)



                                                                                           Page 2 of 9
1. PRD




         Tech stack, database, hosting, realtime mechanism
         Visual design: colours, type, spacing (only text was captured, no screenshots)
         Payment provider, POS vendors supported, pricing model
         Auth model for guests and staff, offline behaviour, printing

If you can share screenshots of the live preview, I can tighten the Design System and
Application Flow tabs against what is actually shown.


Product Requirements Document

1. Product summary
A multi-tenant web platform that lets guests scan a QR code, order and pay from their
phone with no app install, while staff run the kitchen, floor and menu from live
dashboards. It serves two venue modes: dine-in restaurants (table QR) and
canteens/counters (token pickup).


2. Problems to solve

  Problem (Observed)                                Product response

  Slow response: guests wait to order and to        Self-serve ordering and payment from the
  pay                                               table

  Inaccuracies: manual order entry causes           Guest-entered orders routed straight to the
  waste                                             kitchen

  Labour gaps: high turnover hurts service          Fewer order-taking and billing touchpoints

  No insights: no data for staffing or menu         Sales, item and peak-hour analytics
  decisions



3. Users and roles

  Role                  Who                Main jobs                    Auth

  Guest                 Diner or student   Browse, order, pay, track    None; session bound to
                                                                        a QR token. Optional
                                                                        phone number for
                                                                        receipts




                                                                                            Page 3 of 9
1. PRD




  Role                    Who                 Main jobs                     Auth

  Owner                   Restaurant          Set up outlet, menu,          Email + password or OTP
                          owner               tables, staff; see reports;
                                              billing

  Manager                 Outlet or           Run live orders, edit         Same as Owner, scoped
                          canteen             menu availability, handle     to outlet
                          manager             refunds

  Kitchen                 Cooks,              See the queue, advance        Shared device login or
                          expediter           order status                  PIN

  Waiter/Counter          Floor or counter    Serve, mark delivered,        PIN
                          staff               take cash, assist guests

  Platform admin          You (SaaS           Onboard tenants, plans,       SSO, separate admin app
                          operator)           support



4. Scope
MVP (must ship)

         Tenant, outlet and staff setup with role-based access
         Menu management: categories, items, images, price, veg/non-veg and dietary tags,
         variants, add-ons, availability toggle
         Table management and QR generation (print-ready PDF per table)
         Guest web app: menu, search, filters, cart, order notes, place order, live status
         Kitchen display screen (KDS) with realtime queue and status changes
         Live orders board grouped by table, with running bill per table
         Payments: UPI and cards through one gateway, plus "pay at counter" cash
         GST-compliant bill and digital receipt
         Canteen mode: token number, ready-for-pickup notification
         Basic analytics: sales by day, top items, peak hours, average order value

Phase 2

         Upsell and combo suggestions in cart (Observed as "smart upsells")
         Inventory: stock counts, auto mark-unavailable, low-stock alerts (Observed as a claim)
         Split bill, tips, coupons, loyalty
         KOT and bill printing (thermal printers)
         Guest ratings and feedback
         Multi-language menus



                                                                                                Page 4 of 9
1. PRD




Phase 3

         POS integration (Observed; vendors unknown), aggregator integrations
         Multi-outlet rollups, staff scheduling insights, demand forecasting
         Subscription billing for tenants, white-label domains

Out of scope

         Delivery logistics, table reservations, native mobile apps, payroll


5. Functional requirements
Priority: P0 = MVP blocker, P1 = MVP should, P2 = later. Source: O = Observed, I = Inferred.

5.1 Guest ordering


  ID          Requirement                                             Pri   Src

  G-01        Scanning a table QR opens the outlet menu in the        P0    O
              browser with table pre-selected; no install, no login

  G-02        Menu shows categories, item image, name,                P0    O
              description, price, veg/non-veg mark, dietary tags

  G-03        Guest can search and filter by dietary tag and          P0    O
              category

  G-04        Item sheet supports variants (size) and add-ons         P0    I
              with min/max selection rules

  G-05        Cart persists across refresh for the session; shows     P0    I
              taxes and total before placing

  G-06        Guest can add a note per item and per order             P1    I

  G-07        Placing an order returns an order number and            P0    O
              opens the live tracking screen

  G-08        Status updates appear within 2 seconds of a staff       P0    O
              change, without refresh

  G-09        Guest can place further orders on the same table;       P0    I
              all join one running bill

  G-10        Guest can pay online (UPI, card) or choose pay at       P0    O
              counter, per outlet setting

  G-11        Guest receives a receipt on screen, downloadable,       P1    I
              optionally by SMS/WhatsApp




                                                                                      Page 5 of 9
1. PRD




  ID     Requirement                                           Pri   Src

  G-12   Unavailable items show as sold out and cannot be      P0    I
         added

  G-13   Cart suggests add-ons or pairings                     P2    O

  G-14   Canteen mode: guest gets a token number and a         P0    O
         "ready" alert

  G-15   Guest can call a waiter or request the bill           P1    I


5.2 Kitchen screen


  ID     Requirement                                           Pri   Src

  K-01   New orders appear in realtime, oldest first, with     P0    O
         table or token, items, variants, notes

  K-02   Staff advance a ticket: New, Preparing, Ready;        P0    O
         single tap, large targets

  K-03   Audible and visual alert on new order                 P0    I

  K-04   Ticket shows elapsed time and turns                   P1    I
         warning/overdue at configurable thresholds

  K-05   Items can be marked done individually                 P1    I

  K-06   Screen reconnects and resyncs after network loss      P0    I
         without losing tickets

  K-07   Optional station filter (grill, drinks)               P2    I


5.3 Restaurant dashboard


  ID     Requirement                                           Pri   Src

  D-01   Live orders board grouped by table, with status       P0    O
         and running total

  D-02   Staff can accept, reject (with reason), cancel, and   P0    I
         mark served

  D-03   Table map/list shows free, occupied, bill requested   P0    O

  D-04   Menu CRUD with image upload, drag-to-reorder,         P0    O
         bulk availability toggle




                                                                           Page 6 of 9
1. PRD




  ID     Requirement                                                Pri       Src

  D-05   Table CRUD and QR generation, with regenerate to           P0        O
         invalidate old codes

  D-06   Close table: settle bill by online, cash or mixed;         P0        O
         generate GST invoice

  D-07   Payments list with status, refunds through gateway         P1        O

  D-08   Staff management: invite, role, PIN, deactivate            P0        I

  D-09   Outlet settings: hours, taxes, service charge, mode        P0        I
         (dine-in/canteen), payment options

  D-10   Analytics: sales, orders, AOV, top/bottom items,           P1        O
         peak hours, prep time

  D-11   Inventory tracking linked to items                         P2        O


5.4 Canteen panel


  ID     Requirement                                                Pri       Src

  C-01   Incoming order queue by token, with paid/unpaid            P0        O
         flag

  C-02   Quick menu availability edits during service               P0        O

  C-03   Mark ready and handed over; ready tokens show              P1        I
         on a public display view

  C-04   Prepaid-only setting to prevent unpaid pickups             P1        I


5.5 Platform admin


  ID     Requirement                                           Pri        Src

  A-01   Create, suspend and configure tenants and plans       P1         I

  A-02   Impersonate a tenant for support, with audit log      P2         I




                                                                                    Page 7 of 9
1. PRD




6. Non-functional requirements

  Area                  Requirement

  Performance           Guest menu interactive in under 2.5 s on a mid-
                        range Android phone over 4G; guest JS bundle
                        under 200 KB gzipped

  Realtime              Order events delivered in under 2 s at p95

  Availability          99.9% monthly for ordering paths

  Scale (MVP target)    200 outlets, 50 concurrent orders per outlet at
                        peak

  Security              Tenant isolation enforced in the database; no price
                        or total trusted from the client; payment webhooks
                        signature-verified

  Privacy               Collect guest phone number only when needed;
                        comply with India's DPDP Act

  Compliance            GST invoice fields; no card data stored (gateway-
                        hosted checkout)

  Accessibility         WCAG 2.1 AA on guest app

  Devices               Guest: mobile browsers from the last 3 years. KDS:
                        tablet landscape and TV. Dashboard: desktop and
                        tablet

  Resilience            Guest cart survives refresh; KDS survives short
                        network drops

  Localisation          English at MVP; currency ₹; structure ready for
                        Hindi and Telugu



7. Success metrics
Measure these per outlet from day one; the source page's numbers are the benchmark to
beat, not a promise.


  Metric                    Definition                                    Target

  Scan-to-order             Sessions placing an order / QR sessions       60%
  conversion

  Time to first order       QR scan to order placed, median               Under 3 min



                                                                                        Page 8 of 9
1. PRD




  Metric                    Definition                                    Target

  Order-to-ready time       Placed to Ready, median                       Baseline, then down
                                                                          20%

  Order error rate          Orders cancelled or remade for wrong          Under 1%
                            items

  Online payment share      Orders paid online / all orders               70%

  Average order value       Revenue / orders                              Up 10% after upsells

  Payment success rate      Successful / attempted                        95%



8. Milestones

  Milestone                  Contents                         Exit test

  M0 Foundation              Repo, auth, tenant model,        Two tenants cannot read each
                             RLS, CI                          other's data

  M1 Menu and tables         Menu CRUD, tables, QR            Owner builds a 30-item menu and
                             PDF                              prints QRs

  M2 Guest ordering          Menu, cart, place order,         Order placed from a phone
                             tracking                         appears in DB

  M3 Kitchen and live        KDS, orders board,               Status change reaches the guest in
  board                      realtime                         under 2 s

  M4 Payments and billing    Gateway, webhooks,               Paid order reconciles; refund
                             cash, GST bill                   works in test mode

  M5 Canteen mode and        Tokens, pickup display,          Full canteen run-through passes
  analytics                  reports

  M6 Pilot hardening         Load test, a11y, monitoring      Release gates in the Testing Guide
                                                              pass




                                                                                              Page 9 of 9
