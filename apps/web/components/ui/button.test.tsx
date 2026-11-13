import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { IconButton } from "./icon-button";

describe("Button", () => {
  it("defaults to type=button so it never submits forms by accident", () => {
    render(<Button>Add</Button>);
    expect(screen.getByRole("button", { name: "Add" })).toHaveAttribute("type", "button");
  });

  it("while loading: keeps the label in the DOM (fixed width), is busy and inert", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pay ₹450
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toBeDisabled();
    expect(screen.getByText("Pay ₹450")).toHaveClass("invisible");
    expect(screen.getByRole("img", { name: "Loading" })).toBeInTheDocument();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("IconButton exposes its required aria-label as the accessible name", () => {
    render(
      <IconButton aria-label="Call waiter">
        <svg />
      </IconButton>,
    );
    expect(screen.getByRole("button", { name: "Call waiter" })).toBeInTheDocument();
  });
});
