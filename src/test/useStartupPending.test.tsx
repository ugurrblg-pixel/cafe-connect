import { act, renderHook, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useStartupPending } from "@/hooks/useStartupPending";

afterEach(() => { cleanup(); vi.useRealTimers(); });

it("keeps the startup screen visible for at least three seconds even with instant auth", () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useStartupPending(false));
  act(() => vi.advanceTimersByTime(2_999));
  expect(result.current).toBe(true);
  act(() => vi.advanceTimersByTime(1));
  expect(result.current).toBe(false);
});

it("does not reveal the app before auth is ready after the minimum duration", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ loading }) => useStartupPending(loading), { initialProps: { loading: true } });
  act(() => vi.advanceTimersByTime(5_000));
  expect(result.current).toBe(true);
  rerender({ loading: false });
  expect(result.current).toBe(false);
});

it("does not restart the minimum timer on subsequent auth updates", () => {
  vi.useFakeTimers();
  const { result, rerender } = renderHook(({ loading }) => useStartupPending(loading), { initialProps: { loading: true } });
  act(() => vi.advanceTimersByTime(3_000));
  rerender({ loading: false });
  expect(result.current).toBe(false);
  rerender({ loading: true });
  expect(result.current).toBe(true);
  rerender({ loading: false });
  expect(result.current).toBe(false);
});

it("cleans up the minimum timer when the app unmounts", () => {
  vi.useFakeTimers();
  const { unmount } = renderHook(() => useStartupPending(false));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
