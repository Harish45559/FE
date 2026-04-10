import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PaginationBar from "../components/PaginationBar";

describe("PaginationBar", () => {
  const defaultProps = {
    page: 2,
    pageCount: 5,
    pageSize: 10,
    onChangePage: vi.fn(),
    onChangePageSize: vi.fn(),
  };

  it("renders page info correctly", () => {
    render(<PaginationBar {...defaultProps} />);
    expect(screen.getByText("Page 2 / 5")).toBeInTheDocument();
  });

  it("disables first/prev buttons on page 1", () => {
    render(<PaginationBar {...defaultProps} page={1} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toBeDisabled(); // ⏮
    expect(buttons[1]).toBeDisabled(); // ◀
  });

  it("disables last/next buttons on last page", () => {
    render(<PaginationBar {...defaultProps} page={5} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons[2]).toBeDisabled(); // ▶
    expect(buttons[3]).toBeDisabled(); // ⏭
  });

  it("calls onChangePage with 1 when first button clicked", () => {
    const onChangePage = vi.fn();
    render(<PaginationBar {...defaultProps} onChangePage={onChangePage} />);
    fireEvent.click(screen.getByText("⏮"));
    expect(onChangePage).toHaveBeenCalledWith(1);
  });

  it("calls onChangePage with pageCount when last button clicked", () => {
    const onChangePage = vi.fn();
    render(<PaginationBar {...defaultProps} onChangePage={onChangePage} />);
    fireEvent.click(screen.getByText("⏭"));
    expect(onChangePage).toHaveBeenCalledWith(5);
  });

  it("calls onChangePage with page-1 when prev clicked", () => {
    const onChangePage = vi.fn();
    render(<PaginationBar {...defaultProps} page={3} onChangePage={onChangePage} />);
    fireEvent.click(screen.getByText("◀"));
    expect(onChangePage).toHaveBeenCalledWith(2);
  });

  it("calls onChangePage with page+1 when next clicked", () => {
    const onChangePage = vi.fn();
    render(<PaginationBar {...defaultProps} page={3} onChangePage={onChangePage} />);
    fireEvent.click(screen.getByText("▶"));
    expect(onChangePage).toHaveBeenCalledWith(4);
  });

  it("calls onChangePageSize when select changes", () => {
    const onChangePageSize = vi.fn();
    render(<PaginationBar {...defaultProps} onChangePageSize={onChangePageSize} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "20" } });
    expect(onChangePageSize).toHaveBeenCalledWith(20);
  });

  it("renders all page size options", () => {
    render(<PaginationBar {...defaultProps} />);
    expect(screen.getByRole("option", { name: "10" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "20" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "50" })).toBeInTheDocument();
  });
});
