3. Design System




Design System
An original visual language for three very different contexts: a guest's phone at a table, a
kitchen screen read from two metres, and a dense desktop dashboard. Nothing here is
extracted from the source product, whose visuals were not captured; the palette, type
and components are proposals you should adjust to your brand.



1. Principles
   1. Food first. On the guest app, photography and price carry the page; chrome stays
      quiet.
   2. One thumb. Every guest action is reachable in the lower two-thirds of a phone screen;
      the primary action is a sticky bottom bar.
   3. Glanceable under pressure. Kitchen and live-board screens are read in under a
      second: big type, status by colour and by label, never colour alone.
   4. State is always visible. Order status, connection status and payment status are
      shown, not implied.
   5. Same tokens, three densities. Guest (comfortable), Dashboard (compact), KDS
      (large).


2. Colour tokens
Define as CSS variables and map into Tailwind. Check every text/background pair for 4.5:1
contrast before shipping; the values below are starting points.

Brand and neutrals




                                                                                        Page 1 of 9
3. Design System




  Token                    Light        Dark (KDS default)    Use

   --color-primary         #E4572E      #FF7A52               Primary buttons, active states

   --color-primary-fg      #FFFFFF      #1A1A1A               Text on primary

   --color-bg              #FAFAF7      #111315               Page background

   --color-surface         #FFFFFF      #1B1E21               Cards, sheets

   --color-surface-2       #F2F1EC      #25292D               Subtle fills, table headers

   --color-border          #E3E1DA      #343A40               Dividers, inputs

   --color-text            #1C1B19      #F3F2EE               Body text

   --color-text-muted      #6B6860      #A7A39A               Secondary text


Semantic


  Token                 Value        Use

   --color-success      #1E8E5A      Paid, ready, available

   --color-warning      #C98A04      Waiting too long, low stock

   --color-danger       #C93A3A      Overdue, rejected, failed payment

   --color-info         #2B6CB0      Informational

   --color-veg          #1E8E5A      Veg mark (green square with dot, Indian
                                     convention)

   --color-nonveg       #B23A2E      Non-veg mark


Order status (always paired with a text label and icon)




                                                                                            Page 2 of 9
3. Design System




  Status                       Token                     Value             Label

  placed                        --status-placed          #2B6CB0           New

  accepted                      --status-accepted        #6B46C1           Accepted

  preparing                     --status-preparing       #C98A04           Preparing

  ready                         --status-ready           #1E8E5A           Ready

  served                        --status-served          #6B6860           Served

  cancelled / rejected          --status-cancelled       #C93A3A           Cancelled




3. Typography

  Token                      Family                                       Use

   --font-sans               Inter (variable), system fallback            All UI

   --font-display            Plus Jakarta Sans or your brand face         Outlet name, big numbers

   --font-mono               JetBrains Mono, tabular numerals             Order numbers, tokens, timers



 Style         Size / line      Weight Guest                 Dashboard          KDS
               height

 display       32 / 40          700     Order number,        KPI                Table/token on ticket (use 40 /
                                        token                numbers            44)

 h1            24 / 32          700     Outlet name          Page title         Column title

 h2            20 / 28          600     Category title       Section title      Item name (use 22 / 28)

 body          16 / 24          400     Default              14 / 20            18 / 26

 small         14 / 20          400     Descriptions         13 / 18            16 / 22

 caption 12 / 16                500     Tags                 Table meta         Avoid on KDS


Use tabular numerals for all prices, quantities and timers. Format currency as ₹1,250
with Indian grouping; show paise only when non-zero.




                                                                                                           Page 3 of 9
3. Design System




4. Spacing, radius, elevation, motion

  Token group           Values

  Spacing (4 px base)   0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

  Radius                sm 6, md 10, lg 16, pill 999

  Shadow                sm 0 1px 2px rgb(0 0 0 / .06) ; md 0 4px
                        12px rgb(0 0 0 / .08) ; sheet 0 -8px 24px
                        rgb(0 0 0 / .12)

  Motion                fast 120 ms, base 200 ms, slow 320 ms; ease
                         cubic-bezier(.2,.8,.2,1) ; respect prefers-
                        reduced-motion

  Breakpoints           sm 640, md 768, lg 1024, xl 1280

  Touch targets         Minimum 44 x 44 px guest and dashboard; 56 px on
                        KDS

  Z-index               base 0, sticky 10, drawer 20, sheet 30, modal 40,
                        toast 50




5. Layout by surface

  Surface          Layout

  Guest            Single column, max width 480 px centred on larger
                   screens. Sticky header (outlet, table), sticky
                   horizontal category tabs, sticky bottom cart bar.
                   Bottom sheets instead of modals.

  KDS              Full-screen, dark theme, landscape. Columns by
                   status (New, Preparing, Ready) or a ticket grid of 3
                   to 5 columns. No scrolling within a ticket where
                   avoidable.

  Dashboard        Left sidebar 240 px (collapsible to 64 px), top bar
                   with outlet switcher, content max width 1440 px,
                   12-column grid, 24 px gutters.

  Canteen panel    Dashboard shell with a two-pane live view: queue
                   left, selected order right.




                                                                            Page 4 of 9
3. Design System




  Surface           Layout

  Pickup display    Full-screen, two lists: Preparing and Ready, token
                    numbers in display type.




6. Components
Build on shadcn/ui primitives; each component below is a wrapper with fixed variants.
Every interactive component needs default, hover, focus-visible, active, disabled and
loading states.

Primitives


  Component                                      Variants / notes

  Button                                         primary, secondary, ghost, danger; sizes sm,
                                                 md, lg, xl (KDS); loading spinner replaces
                                                 label, width stays fixed

  IconButton                                     Requires aria-label

  Input, Textarea, Select, Switch, Checkbox,     Label above, helper and error text below
  Radio

  QuantityStepper                                Minus, count, plus; minus becomes remove at
                                                 1

  Badge                                          neutral, status (uses status tokens), veg /
                                                 non-veg mark

  Chip                                           Filter chips, selectable, horizontally scrollable

  Card                                           surface, border, radius md

  Sheet                                          Bottom sheet on mobile, side drawer on
                                                 desktop

  Dialog                                         Confirmations only (reject, cancel, refund)

  Toast                                          Success, error, info; 4 s; one at a time on guest

  Tabs, Table, Pagination, DropdownMenu,         Dashboard
  Tooltip

  Skeleton                                       For menu list, order board, KPI cards

  EmptyState                                     Icon, one line, one action




                                                                                               Page 5 of 9
3. Design System




  Component                                      Variants / notes

  ConnectionBanner                               "Reconnecting..." strip on KDS and guest
                                                 tracking


Guest components


  Component                    Anatomy and behaviour

  OutletHeader                 Logo, outlet name, table label or "Pickup",
                               open/closed

  CategoryTabs                 Sticky; scroll-spy highlights the category in view;
                               tap scrolls to it

  SearchBar + DietaryFilters   Search by name; chips for Veg, Vegan, Jain, Gluten-
                               free, Spicy

  MenuItemCard                 Image 96 x 96 right, veg mark, name, 2-line
                               description, price, Add button; sold-out state
                               greyed with label

  ItemSheet                    Large image, description, variant radio group, add-
                               on groups with min/max hints, note field, stepper,
                               "Add ₹X" button

  CartBar                      Sticky bottom: item count, total, "View cart";
                               hidden when empty

  CartSheet                    Lines with stepper, order note, bill summary, "Place
                               order"

  BillSummary                  Subtotal, taxes (CGST/SGST), service charge, total

  OrderStatusTracker           Vertical stepper: Placed, Accepted, Preparing,
                               Ready, Served; current step animated; timestamps

  TokenCard                    Canteen: token number in display type, status,
                               "Show at counter"

  PaymentSheet                 Amount due, UPI and card options, pay-at-counter
                               option if enabled

  ServiceActions               Call waiter, request bill


Kitchen components




                                                                                            Page 6 of 9
3. Design System




  Component          Anatomy and behaviour

  KdsTicket          Header: table or token, order number, elapsed
                     timer. Body: qty x item, variant and add-ons
                     indented, notes highlighted. Footer: one full-width
                     action (Start, Mark ready). Border colour by age:
                     normal, warning, overdue

  KdsColumn          Title with count; newest at bottom

  NewOrderAlert      Sound plus a brief flash on the new ticket; mute
                     toggle

  StationFilter      Segmented control (Phase 2)


Dashboard components


  Component          Anatomy and behaviour

  KpiCard            Label, value, delta vs previous period

  OrdersBoard        Group by table; each group shows orders, statuses,
                     running total, actions

  TableTile          Label, seats, state (free, occupied, bill requested),
                     elapsed time, amount

  OrderDrawer        Full order detail, timeline from order_events ,
                     actions

  MenuEditor         Category list (drag to reorder) and item table with
                     inline availability switch

  ItemForm           Image upload with crop, price, tags, variants, add-
                     on groups

  QrCard             QR preview, table label, download and regenerate

  SettleBillDialog   Amount due, payment method split, close table

  Charts             Line (sales over time), bar (top items), heat grid
                     (orders by hour and weekday)




7. Content and microcopy
      Plain, short, friendly. Buttons are verbs: "Add", "Place order", "Pay ₹450", "Mark ready".




                                                                                          Page 7 of 9
3. Design System




      Errors say what happened and what to do: "Paneer Tikka just sold out. Remove it to
      continue."
      Empty states: "No orders yet. New orders will appear here."
      Never blame the guest for network failures; offer retry.


8. Iconography and imagery
      Icons: Lucide, 1.5 px stroke, 20 px default, 24 px on KDS.
      Item images: square, minimum 600 x 600 upload, served at 96, 192 and 600 px; neutral
      placeholder when missing.
      QR print template: A6 table tent with your logo, table label, the QR at 35 mm minimum,
      and one line of instruction.


9. Accessibility
      WCAG 2.1 AA: contrast, focus-visible rings (2 px, --color-primary ), logical tab order.
      Status never conveyed by colour alone.
      Bottom sheets trap focus and close on Escape; live status changes announced
      through an aria-live="polite" region.
      Supports 200% text zoom without loss of function on the guest app.


10. Token file for the agent
Put this in apps/web/app/tokens.css and reference the variables from
tailwind.config.ts ; components must use tokens, never raw hex values.




                                                                                       Page 8 of 9
3. Design System




  :root {
    --color-primary: #E4572E;     --color-primary-fg: #FFFFFF;
    --color-bg: #FAFAF7;          --color-surface: #FFFFFF;
      --color-surface-2: #F2F1EC; --color-border: #E3E1DA;
      --color-text: #1C1B19;     --color-text-muted: #6B6860;
      --color-success: #1E8E5A;   --color-warning: #C98A04;
      --color-danger: #C93A3A;    --color-info: #2B6CB0;
      --status-placed: #2B6CB0; --status-accepted: #6B46C1;
      --status-preparing: #C98A04; --status-ready: #1E8E5A;
      --status-served: #6B6860; --status-cancelled: #C93A3A;
      --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px;
      --motion-fast: 120ms; --motion-base: 200ms; --motion-slow: 320ms;
  }
  [data-theme="dark"] {
      --color-primary: #FF7A52; --color-primary-fg: #1A1A1A;
      --color-bg: #111315;       --color-surface: #1B1E21;
      --color-surface-2: #25292D; --color-border: #343A40;
      --color-text: #F3F2EE;      --color-text-muted: #A7A39A;
  }




                                                                          Page 9 of 9
