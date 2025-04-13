import { formatDistanceToNow } from "date-fns";

type Device = {
  id: string;
  name: string | null;
  last_seen: string | null;
  is_online: boolean;
};

export function DevicesTable({ devices }: { devices: Device[] }) {
  return (
    <div className="rounded-md border">
      <div className="relative w-full overflow-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium">
                Device Name
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Last Seen
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-muted-foreground">
                  No devices found
                </td>
              </tr>
            ) : (
              devices.map((device) => (
                <tr
                  key={device.id}
                  className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  <td className="p-4 align-middle">
                    {device.name || "Unnamed Device"}
                  </td>
                  <td className="p-4 align-middle">
                    {device.last_seen
                      ? formatDistanceToNow(new Date(device.last_seen), {
                          addSuffix: true,
                        })
                      : "Never"}
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        device.is_online
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {device.is_online ? "Online" : "Offline"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 