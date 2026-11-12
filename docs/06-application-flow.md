6. Application Flow




Application Flow
Every journey in the product hangs off one object, the order, moving through six states
while three audiences watch it: the guest, the kitchen and the floor. This tab gives the
route map, each role's journey step by step, and what each screen must show in every
state.



1. Route map

   Route                       Screen                      Role             Notes

    /t/[qrToken]               Guest menu                  Guest            Entry point
                                                                            from QR

    /t/[qrToken]/cart          Cart (sheet over menu)      Guest

    /t/[qrToken]/orders        Session orders and          Guest
                               running bill

    /o/[orderId]               Order tracking              Guest            Canteen
                                                                            shows token

    /t/[qrToken]/pay           Payment                     Guest

    /t/[qrToken]/receipt       Receipt                     Guest

    /invalid , /closed         Invalid QR, outlet closed   Guest
                               or suspended

    /login , /signup ,         Staff auth and first-run    Staff
    /onboarding                setup

    /app                       Home: today's KPIs and      Owner,
                               live summary                Manager

    /app/orders                Live orders board           Owner,
                                                           Manager,
                                                           Waiter

    /app/tables                Table tiles and QR          Owner,
                               management                  Manager,
                                                           Waiter

    /app/menu                  Menu editor                 Owner,
                                                           Manager




                                                                                     Page 1 of 9
6. Application Flow




   Route                            Screen                    Role               Notes

    /app/payments                   Payments and refunds      Owner,
                                                              Manager

    /app/analytics                  Reports                   Owner,
                                                              Manager

    /app/staff                      Staff and PINs            Owner

    /app/settings                   Outlet settings           Owner,
                                                              Manager

    /app/canteen                    Canteen live panel        Manager,           Canteen
                                                              Counter            outlets only

    /kds/[outletId]                 Kitchen screen            Kitchen            PIN or device
                                                                                 login

    /display/[outletId]             Pickup token display      Public             Canteen
                                                                                 outlets only

    /admin                          Tenants and plans         Platform admin




2. Order lifecycle across audiences

   State              Guest sees          Kitchen sees     Dashboard sees      Next action by

    placed            "Order sent.        Nothing yet      New order card      Manager/Waiter,
                      Waiting for         (or ticket, if   with Accept and     or auto
                      confirmation."      auto-accept      Reject; sound
                      Cancel available    is on)           alert

    accepted          "Confirmed"         Ticket in New    Order under its     Kitchen
                                          column with      table, Accepted
                                          Start

    preparing         "Being prepared"    Ticket in        Preparing           Kitchen
                      with elapsed time   Preparing
                                          with Mark
                                          ready




                                                                                           Page 2 of 9
6. Application Flow




   State              Guest sees         Kitchen sees     Dashboard sees    Next action by

    ready             Dine-in: "On its   Ticket in        Ready,            Waiter/Counter
                      way". Canteen:     Ready, then      highlighted for
                      "Ready. Collect    clears           the waiter or
                      with token 42"                      counter
                      plus alert

    served            "Served. Enjoy."   Gone             Served; table     Guest pays or
                      Pay prompt if                       shows amount      staff settle
                      unpaid                              due

    rejected /        Reason shown;      Ticket           Marked, with      None
    cancelled         refund notice if   removed with     reason
                      paid               a brief notice




3. Guest journey: dine-in
   1. Scan. Camera opens /t/[qrToken] . Server validates the token, checks the outlet is
       open, opens or resumes the table session, sets the session cookie.
   2. Browse. Menu loads with table label in the header. Guest scrolls categories, searches,
      filters by dietary tag.
   3. Configure. Tapping an item with options opens the item sheet; required groups must
      be satisfied before Add is enabled. Simple items add in one tap.
   4. Review. Cart bar shows count and total. Cart sheet shows lines, notes, bill summary.
   5. Place. Tap Place order. Client sends lines with an idempotency key; server revalidates
      availability and recomputes totals; order is created as placed .
   6. Track. Guest lands on /o/[orderId] and watches the status tracker update in
       realtime.
   7. Order more. "Add more items" returns to the menu; new orders join the same session
       and bill.
   8. Pay. From tracking or the orders page, guest taps Pay, chooses UPI or card, completes
       checkout, and returns to a confirmation. Or chooses pay at counter, which raises a bill
       request to staff.
   9. Receipt. Receipt screen with download; optional phone number to receive it by
       message.
10. Close. Staff close the table; the session ends. Scanning again starts a fresh session.

Branches and edge cases




                                                                                        Page 3 of 9
6. Application Flow




   Situation                                     Behaviour

   Invalid or regenerated QR                     /invalid with "Ask staff for a new code"

   Outlet closed or tenant suspended             /closed with opening hours

   Item sells out before placing                 Order rejected with the item named; cart
                                                 highlights it for removal

   Network drops while placing                   Retry with the same idempotency key; never
                                                 a duplicate

   Order rejected by staff                       Tracking shows the reason and a Back to
                                                 menu action

   Payment fails                                 Stay on the pay screen with Retry and Pay at
                                                 counter

   Payment succeeds but page closed              Webhook settles; next visit shows paid

   Second guest scans the same table             Joins the same open session; sees all orders
                                                 on the table

   Table already has an open session from        Staff close the stale session from the
   earlier guests                                dashboard; guest sees a fresh one

   Guest refreshes                               Cart from local storage; session from cookie;
                                                 tracking refetches




4. Guest journey: canteen
   1. Scan the counter or poster QR (a canteen outlet's QR is not tied to a table).
   2. Browse and build the cart as in dine-in.
   3. Place order, then pay immediately; with the prepaid setting on, the order stays hidden
       from the kitchen until payment is captured.
   4. Receive a token number on the tracking screen.
   5. Watch status; at ready the screen alerts and the token appears on the pickup
       display.
   6. Show the token at the counter; staff mark it handed over; the session closes
       automatically.




                                                                                          Page 4 of 9
6. Application Flow




5. Kitchen journey
   1. Open /kds/[outletId] on the kitchen device and sign in with a PIN; the device stays
       signed in.
   2. Screen loads all active tickets, then subscribes to realtime.
   3. A new accepted order appears with a sound and flash, oldest first.
   4. Tap Start to move a ticket to Preparing; optionally tick items as they are done.
   5. Tap Mark ready; the ticket moves to Ready and the waiter or guest is notified.
   6. The ticket clears when marked served or handed over.


   Situation                    Behaviour

   Connection lost              Banner "Reconnecting"; actions queue or disable;
                                on reconnect, full refetch

   Order cancelled mid-prep     Ticket shows Cancelled for 10 s, then clears

   Ticket ageing                Border turns warning, then overdue, at outlet
                                thresholds

   Wrong tap                    Undo for 5 s after each status change




6. Waiter and counter journey
   1. Open /app/orders on a phone or tablet; sign in with a PIN.
   2. New order alert: review, then Accept or Reject with a reason (skipped when auto-
       accept is on).
   3. When an order turns Ready, deliver it and mark Served.
   4. Respond to service requests (call waiter, bill request) and acknowledge them.
   5. For cash, open the table, tap Settle, record cash received.
   6. Close the table when the bill is fully paid; the table returns to free.


7. Owner and manager journey
First run

   1. Sign up and verify.
   2. Onboarding wizard: business details and GSTIN, first outlet (name, mode, hours,
       taxes), payment setup.
   3. Build the menu: categories, then items with images, variants and add-ons.




                                                                                         Page 5 of 9
6. Application Flow




   4. Create tables; download and print the QR PDF.
   5. Invite staff and set PINs.
   6. Place a test order from a phone using the guided checklist on the home screen.

Daily

   1. Home shows today's orders, revenue, average order value and anything stuck.
   2. Live board during service; toggle item availability as stock runs out.
   3. Handle refunds and cancellations from the order drawer.
   4. Review analytics after service: top items, peak hours, prep times.


8. Canteen manager journey
   1. /app/canteen shows the queue by token with paid status on the left and the
       selected order on the right.
   2. Toggle availability from a quick panel during rushes.
   3. Mark orders ready and handed over; the pickup display updates on its own.


9. Payment flow in detail

   Step               Client                 Server                           Result

   1                  Tap Pay                Compute amount due from DB;      Checkout
                                             create gateway order; insert     parameters returned
                                             payment created

   2                  Open gateway
                      checkout; guest pays

   3                  Post success           Verify signature; mark payment   Fast UI confirmation
                      signature              authorized

   4                                         Webhook payment.captured :       Source of truth
                                             verify, mark captured , update
                                             session balance, emit
                                             payment.updated

   5                  Receive realtime                                        Receipt available
                      event; show Paid

   Failure            Show Retry             Webhook payment.failed           Balance unchanged
                                             marks failed




                                                                                                Page 6 of 9
6. Application Flow




   Step               Client                   Server                             Result

   Refund             Staff tap Refund         Call gateway; on webhook mark      Guest notified
                                                 refunded




10. Realtime sequence for one order
   Guest                       Server/DB                      Kitchen            Dashboard
       | place order ---> |                      |                                       |
       |                  | insert order(placed) |                                       |
       |                            | -- order.created ------------------------> | alert
       | <- 201 order id            |                      |                   |
       | subscribe session channel               |                   |
       |                  | <------------- accept ------------------- |
       | <- order.updated | -- order.updated --> | new ticket        |
       |                            | <-- start ---------- |                   |
       | <- preparing               | -- order.updated ------------------------> |
       |                            | <-- ready ---------- |                   |
       | <- ready                   | -- order.updated ------------------------> | highlight
       |                            | <------------- served ------------------- |
       | <- served                  |                      | ticket clears     |




11. Screen states
Every screen implements these states; none may be left blank.


   Screen                Loading         Empty                  Error          Offline

   Guest                 Skeleton        "Menu coming           Retry          Cached menu if
   menu                  cards           soon"                                 available; ordering
                                                                               disabled

   Cart                  n/a             "Your cart is          Inline line    Place order disabled
                                         empty" with            errors         with reason
                                         Browse menu

   Tracking              Skeleton        n/a                    Retry          Reconnecting banner;
                         stepper                                               last known status

   KDS                   Skeleton        "No active orders"     Full-screen    Reconnecting banner
                         tickets                                retry

   Orders                Skeleton        "No orders yet"        Retry          Reconnecting banner
   board                 groups



                                                                                                     Page 7 of 9
6. Application Flow




   Screen             Loading      Empty                   Error              Offline

   Menu               Skeleton     "Add your first         Toast, form        Saves disabled
   editor             rows         category"               preserved

   Analytics          Skeleton     "No data for this       Retry              n/a
                      charts       range"




12. Notifications

   Event                               Recipient                     Channel

   New order                           Dashboard, then kitchen       In-app sound and visual
                                       once accepted

   Order accepted, preparing,          Guest                         In-app realtime; optional
   ready, served                                                     message at ready in canteen
                                                                     mode

   Order rejected or                   Guest, kitchen                In-app
   cancelled

   Service request                     Dashboard                     In-app sound and badge

   Payment captured or failed          Guest, dashboard              In-app

   Order waiting too long              Dashboard                     In-app warning




13. Permissions at the screen level

   Screen                        Owner     Manager        Waiter/Counter       Kitchen

   Home, Analytics               Yes       Yes            No                   No

   Orders board                  Yes       Yes            Yes                  No

   Tables                        Yes       Yes            View and settle      No

   Menu editor                   Yes       Yes            Availability only    No

   Payments and refunds          Yes       Yes            Record cash only     No

   Staff                         Yes       View           No                   No

   Settings                      Yes       Own outlet     No                   No




                                                                                               Page 8 of 9
6. Application Flow




   Screen                Owner     Manager     Waiter/Counter    Kitchen

   Kitchen screen        Yes       Yes         No                Yes


Unauthorised routes redirect to the role's home screen; the server enforces the same
rules regardless of what the UI hides.




                                                                                  Page 9 of 9
