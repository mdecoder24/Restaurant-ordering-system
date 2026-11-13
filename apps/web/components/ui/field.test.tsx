import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";
import { Input } from "./input";

describe("Field", () => {
  it("labels the control and links helper text", () => {
    render(
      <Field label="Item name" helper="Shown on the menu.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Item name");
    expect(input).toHaveAccessibleDescription("Shown on the menu.");
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("swaps helper for an announced error and marks the control invalid", () => {
    render(
      <Field label="Item name" helper="Shown on the menu." error="Use at least 3 characters.">
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText("Item name");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Use at least 3 characters.");
    expect(screen.getByRole("alert")).toHaveTextContent("Use at least 3 characters.");
  });
});
