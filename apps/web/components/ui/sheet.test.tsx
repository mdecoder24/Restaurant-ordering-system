import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Sheet } from "./sheet";

// Focus restore to the trigger happens after vaul's exit transition, which jsdom never fires;
// it is covered by the Playwright preview spec instead.
describe("Sheet", () => {
  it("opens as a labelled dialog, moves focus inside, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(
      <Sheet trigger={<Button>Open</Button>} title="Paneer Tikka">
        <input aria-label="Note" />
      </Sheet>,
    );
    const trigger = screen.getByRole("button", { name: "Open" });
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Paneer Tikka" });
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    await user.keyboard("{Escape}");
    // Vaul unmounts after its exit transition; jsdom has none, so assert the closed state.
    await waitFor(() => expect(dialog).toHaveAttribute("data-state", "closed"));
  });
});
