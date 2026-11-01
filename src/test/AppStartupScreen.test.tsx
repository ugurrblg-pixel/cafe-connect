import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AppStartupScreen } from "@/components/AppStartupScreen";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("announces real startup without invented scan, location or progress claims", () => {
  render(<AppStartupScreen />);
  expect(screen.getByRole("main", { name: "Riyo açılış ekranı" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Oturumun hazırlanıyor");
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/İSTANBUL|91%|çevre taranıyor|v2\.4/i);
});

it("offers keyboard-operable recovery after a slow start", () => {
  vi.useFakeTimers();
  render(<AppStartupScreen />);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.getByRole("status")).toHaveTextContent("Açılış beklenenden uzun sürüyor");
  const retry = screen.getByRole("button", { name: "Sayfayı yenile" });
  retry.focus();
  expect(retry).toHaveFocus();
});

it("reacts to offline and reconnect without claiming to be connected", () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  render(<AppStartupScreen />);
  expect(screen.getByRole("status")).toHaveTextContent("İnternet bağlantısı bekleniyor");
  expect(screen.getByRole("button", { name: "Sayfayı yenile" })).toBeInTheDocument();
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  act(() => window.dispatchEvent(new Event("online")));
  expect(screen.getByRole("status")).toHaveTextContent("Oturumun hazırlanıyor");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("cleans up its recovery timer when auth completes", () => {
  vi.useFakeTimers();
  const { unmount } = render(<AppStartupScreen />);
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
