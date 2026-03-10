import axios from "axios";

export async function getAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    scope: "https://graph.microsoft.com/.default",
  });

  const resp = await axios.post(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    params.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return resp.data.access_token;
}

export async function downloadExcel(
  token: string,
  fileId: string
): Promise<Buffer> {
  const resp = await axios.get(
    `https://graph.microsoft.com/v1.0/drives/${process.env.DRIVE_ID}/items/${fileId}/content`,
    {
      headers: { Authorization: `Bearer ${token}` },
      responseType: "arraybuffer",
    }
  );

  return Buffer.from(resp.data);
}