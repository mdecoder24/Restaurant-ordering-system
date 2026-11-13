import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "./quantity-stepper";

describe("QuantityStepper", () => {
  it("shows remove instead of decrease at 1", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} onChange={onChange} itemName="Masala Chai" />);
    await userEvent.click(screen.getByRole("button", { name: "Remove Masala Chai" }));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("button", { name: "Decrease Masala Chai" })).toBeNull();
  });

  it("decreases and increases above 1", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} onChange={onChange} itemName="Dosa" />);
    await userEvent.click(screen.getByRole("button", { name: "Decrease Dosa" }));
    await userEvent.click(screen.getByRole("button", { name: "Increase Dosa" }));
    expect(onChange.mock.calls).toEqual([[2], [4]]);
    expect(screen.getByRole("status")).toHaveTextContent("3");
  });

  it("disables increase at max", () => {
    render(<QuantityStepper value={5} max={5} onChange={() => undefined} itemName="Lassi" />);
    expect(screen.getByRole("button", { name: "Increase Lassi" })).toBeDisabled();
  });
});
