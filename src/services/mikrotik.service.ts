import axios from "axios";

export type MikrotikActiveConnection = {
  ".id": string;
  name: string;
  address?: string;
  "caller-id"?: string;
  uptime?: string;
  [key: string]: string | undefined;
};

type MikrotikPppSecret = {
  ".id": string;
  name: string;
  disabled?: string;
  [key: string]: string | undefined;
};

export type DisablePppUserResult = {
  username: string;
  ok: boolean;
  message?: string;
};

type AppError = Error & {
  statusCode?: number;
};

const DEFAULT_MIKROTIK_BASE_URL = "http://191.44.71.168:1177/rest";

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const normalizeBaseUrl = (value?: string) =>
  trimTrailingSlashes(value?.trim() || DEFAULT_MIKROTIK_BASE_URL);

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    const error = new Error(`${name} is not configured.`) as AppError;
    error.statusCode = 500;
    throw error;
  }

  return value;
};

const createMikrotikClient = () => {
  const username = requireEnv("MIKROTIK_USERNAME");
  const password = requireEnv("MIKROTIK_PASSWORD");

  return axios.create({
    baseURL: normalizeBaseUrl(process.env.MIKROTIK_BASE_URL),
    timeout: 18000,
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString(
        "base64",
      )}`,
      "Content-Type": "application/json",
    },
  });
};

export const getMikrotikError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      return {
        statusCode: 502,
        message: "MikroTik authentication failed. Check server credentials.",
      };
    }

    if (error.code === "ECONNABORTED") {
      return {
        statusCode: 504,
        message: "MikroTik request timed out.",
      };
    }

    if (!error.response) {
      return {
        statusCode: 502,
        message:
          "Backend could not reach MikroTik REST. Check Render-to-router firewall, NAT, port forwarding, and RouterOS www service.",
      };
    }

    return {
      statusCode: 502,
      message:
        error.response.data?.message ||
        error.response.data?.error ||
        error.message ||
        "MikroTik REST request failed.",
    };
  }

  const appError = error as AppError;
  return {
    statusCode: appError.statusCode || 500,
    message:
      error instanceof Error ? error.message : "MikroTik REST request failed.",
  };
};

export const testMikrotikConnection = async () => {
  const client = createMikrotikClient();
  const response = await client.get("/system/resource");
  return response.data;
};

export const getActivePppConnections = async (): Promise<
  MikrotikActiveConnection[]
> => {
  const client = createMikrotikClient();
  const response = await client.get<MikrotikActiveConnection[]>("/ppp/active");
  return Array.isArray(response.data) ? response.data : [];
};

export const disablePppUsers = async (
  usernames: string[],
): Promise<DisablePppUserResult[]> => {
  const client = createMikrotikClient();

  return Promise.all(
    usernames.map(async (username) => {
      const normalizedUsername = username.trim();

      try {
        const secretResponse = await client.get<MikrotikPppSecret[]>(
          "/ppp/secret",
          {
            params: { name: normalizedUsername },
          },
        );
        const secret = Array.isArray(secretResponse.data)
          ? secretResponse.data.find(
              (item) =>
                item.name?.trim().toLowerCase() ===
                normalizedUsername.toLowerCase(),
            )
          : null;

        if (!secret?.[".id"]) {
          return {
            username: normalizedUsername,
            ok: false,
            message: "User not found in /ppp/secret.",
          };
        }

        await client.patch(`/ppp/secret/${encodeURIComponent(secret[".id"])}`, {
          disabled: "true",
        });

        const activeResponse = await client.get<MikrotikActiveConnection[]>(
          "/ppp/active",
          {
            params: { name: normalizedUsername },
          },
        );
        const activeConnections = Array.isArray(activeResponse.data)
          ? activeResponse.data
          : [];

        await Promise.all(
          activeConnections
            .filter((connection) => Boolean(connection[".id"]))
            .map((connection) =>
              client.delete(
                `/ppp/active/${encodeURIComponent(connection[".id"])}`,
              ),
            ),
        );

        return {
          username: normalizedUsername,
          ok: true,
        };
      } catch (error) {
        return {
          username: normalizedUsername,
          ok: false,
          message: getMikrotikError(error).message,
        };
      }
    }),
  );
};
