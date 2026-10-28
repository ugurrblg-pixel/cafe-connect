import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  available: true,
  rpc: vi.fn(),
  refresh: vi.fn(),
  rows: [] as Record<string, unknown>[],
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "viewer" } }),
}));
vi.mock("@/contexts/LocationContext", () => ({
  useLocation: () => ({ position: null }),
}));
vi.mock("@/components/PageLayout", () => ({
  PageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/CafeImage", () => ({ CafeImage: () => null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn() },
}));
vi.mock("@/hooks/useActivities", () => ({
  useActivitiesAvailability: () => ({
    data: state.available,
    isPending: false,
    refetch: vi.fn(),
  }),
  useActivities: () => ({
    data: state.rows,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
    available: { data: state.available, isPending: false, refetch: vi.fn() },
  }),
  useRefreshActivities: () => state.refresh,
}));
vi.mock("@/lib/activities", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  activityRpc: state.rpc,
}));
vi.mock("@/components/activities/ActivityMap", () => ({
  default: ({
    onPick,
  }: {
    onPick?: (p: { latitude: number; longitude: number }) => void;
  }) => (
    <div aria-label="Test haritası">
      {onPick && (
        <button
          type="button"
          onClick={() => onPick({ latitude: 41, longitude: 29 })}
        >
          Buluşma noktasını seç
        </button>
      )}
    </div>
  ),
}));
import Activities from "@/pages/Activities";
const id = "10000000-0000-4000-8000-000000000001";
const row = {
  id,
  title: "Kahve ve sohbet",
  description: "Bir kahve içip sohbet edelim.",
  category: "coffee",
  venue_name: "Örnek Kafe",
  latitude: 41,
  longitude: 29,
  starts_at: new Date(Date.now() + 3600000).toISOString(),
  ends_at: new Date(Date.now() + 7200000).toISOString(),
  capacity: 6,
  attending: 1,
  host_name: "Deniz",
  is_host: false,
  my_status: null,
};
function open(
  path = "/activities",
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }),
) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/activities" element={<Activities />} />
          <Route path="/activities/new" element={<Activities />} />
          <Route path="/activities/:id" element={<Activities />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}
beforeEach(() => {
  state.available = true;
  state.rows = [{ ...row }];
  state.rpc.mockReset();
  state.refresh.mockReset().mockResolvedValue(undefined);
  state.rpc.mockImplementation(async (name: string) =>
    name === "create_social_activity"
      ? id
      : name === "manage_social_activity"
        ? true
        : [],
  );
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
});
it("provides a real filter reset and keeps missing setup non-interactive", async () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Haritayı göster" }));
  await screen.findByLabelText("Test haritası");
  fireEvent.change(
    screen.getByRole("textbox", { name: "Aktivite veya mekan ara" }),
    { target: { value: "bulunmayan" } },
  );
  expect(screen.getByText("Bu seçimle eşleşen plan yok")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Filtreleri temizle" }));
  expect(
    screen.getByRole("textbox", { name: "Aktivite veya mekan ara" }),
  ).toHaveValue("");
  expect(screen.getAllByText("Kahve ve sohbet").length).toBeGreaterThan(0);
});
it("does not offer creation when the server has not activated activities", () => {
  state.available = false;
  open("/activities/new");
  expect(
    screen.queryByRole("button", { name: "Önizlemeye geç" }),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Aktiviteler şu an kullanılamıyor")).toBeVisible();
  expect(state.rpc).not.toHaveBeenCalled();
});
it("requires a selected meeting point, preview and explicit public-location consent before publication", async () => {
  open("/activities/new");
  fireEvent.change(screen.getByLabelText("Aktivite adı"), {
    target: { value: "Kahve ve yeni arkadaşlar" },
  });
  fireEvent.change(screen.getByLabelText("Buluşma mekanı"), {
    target: { value: "Örnek Park Girişi" },
  });
  fireEvent.change(screen.getByLabelText("Planı anlat"), {
    target: { value: "Park girişinde buluşup birlikte yürüyelim." },
  });
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  fireEvent.change(screen.getByLabelText("Başlangıç"), {
    target: { value: `${tomorrow}T18:00` },
  });
  fireEvent.change(screen.getByLabelText("Bitiş"), {
    target: { value: `${tomorrow}T20:00` },
  });
  fireEvent.submit(document.getElementById("activity-form")!);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Haritada buluşma noktasını seç",
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Buluşma noktasını seç" }),
  );
  fireEvent.submit(document.getElementById("activity-form")!);
  const publish = screen.getByRole("button", { name: "Aktiviteyi yayımla" });
  expect(publish).toBeDisabled();
  expect(state.rpc).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(publish);
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "create_social_activity",
      expect.anything(),
      expect.objectContaining({
        payload: expect.objectContaining({
          latitude: 41,
          longitude: 29,
          capacity: 6,
        }),
      }),
    ),
  );
});
it("sends a pending request without revealing participants or group chat", async () => {
  open(`/activities/${id}`);
  fireEvent.click(
    screen.getByRole("button", { name: "Katılma isteği gönder" }),
  );
  await waitFor(() =>
    expect(state.rpc).toHaveBeenCalledWith(
      "manage_social_activity",
      expect.anything(),
      { target: id, action: "request", member: null },
    ),
  );
  expect(screen.queryByRole("log")).not.toBeInTheDocument();
  expect(
    state.rpc.mock.calls.some((c) => c[0] === "read_social_activity_chat"),
  ).toBe(false);
});
it("does not render cached group messages when renewed access is refused", async () => {
  state.rows = [{ ...row, my_status: "accepted" }];
  state.rpc.mockImplementation(async (name: string) => {
    if (name === "read_social_activity_chat")
      throw new Error("Chat unavailable");
    return [];
  });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(
    ["activity-chat", "viewer", id],
    [
      {
        id,
        content: "Gizli eski mesaj",
        created_at: new Date().toISOString(),
        is_own: false,
        name: "Test",
      },
    ],
  );
  open(`/activities/${id}`, client);
  expect(screen.queryByText("Gizli eski mesaj")).not.toBeInTheDocument();
  await screen.findByText("Sohbet erişimi doğrulanamadı.");
  expect(screen.queryByText("Gizli eski mesaj")).not.toBeInTheDocument();
});

it("filters activity dates locally and keeps participation behind details", () => {
  state.rows = [
    { ...row, starts_at: new Date(Date.now() + 3 * 86400000).toISOString() },
  ];
  open();
  expect(
    screen.getByRole("heading", { name: /Bugün hangi aktiviteye/ }),
  ).toBeVisible();
  fireEvent.change(screen.getByLabelText("Aktivite tarihi"), {
    target: { value: "today" },
  });
  expect(screen.getByText("Bu seçimle eşleşen plan yok")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Filtreleri temizle" }));
  expect(screen.getByLabelText("Aktivite tarihi")).toHaveValue("all");
  expect(state.rpc).not.toHaveBeenCalled();
});
