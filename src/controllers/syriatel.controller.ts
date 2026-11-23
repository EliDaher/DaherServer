import { Request, Response } from "express";

const PROVIDER_URL =
  "https://apisyria.com/api/v1?resource=syriatel&action=mobile_recharge";
const PROVIDER_TIMEOUT_MS = 25_000;

const CATEGORIES = new Set([
  "1.92", "2.88", "3.84", "4.80", "5.76", "9.61", "20.19", "23.07",
  "24.03", "25.96", "30.76", "40.38", "45.19", "48.07", "52.88", "62.5",
  "68.26", "72.11", "77.88", "81.73", "86.53", "96.15", "100.96", "105.76",
  "115.38", "125", "125.00", "130.76", "144.23", "160.57", "163.46", "173.07",
  "183.65", "192.30", "211.53", "240.38", "288.46", "317.30", "370.19", "432.69",
  "480.76", "576.92", "625", "625.00", "721.15", "769.23", "951.92", "1057.69",
  "1250", "1250.00", "1923.07", "2115.38", "2403.84", "3846.15",
]);

export const rechargeSyriatel = async (req: Request, res: Response) => {
  const { accountId, gsm, pin_code: pinCode, target_gsm: targetGsm, category } =
    req.body ?? {};

  if (accountId !== "1" && accountId !== "2") {
    return res.status(400).json({ success: false, message: "حساب الشحن غير صالح" });
  }

  if (
    typeof gsm !== "string" ||
    !/^09\d{8}$/.test(gsm) ||
    typeof pinCode !== "string" ||
    !pinCode.trim()
  ) {
    return res.status(400).json({ success: false, message: "بيانات حساب الشحن غير صالحة" });
  }

  if (typeof targetGsm !== "string" || !/^09\d{8}$/.test(targetGsm)) {
    return res.status(400).json({ success: false, message: "رقم الموبايل غير صالح" });
  }

  if (typeof category !== "string" || !CATEGORIES.has(category)) {
    return res.status(400).json({ success: false, message: "فئة الشحن غير صالحة" });
  }

  const apiKey = process.env.APISYRIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, message: "خدمة الشحن غير مهيأة" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const providerResponse = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        gsm,
        target_gsm: targetGsm,
        category,
        pin_code: pinCode,
      }).toString(),
      signal: controller.signal,
    });

    const providerData: unknown = await providerResponse.json().catch(() => null);
    const data = providerData as { success?: unknown; data?: unknown } | null;

    if (!providerResponse.ok || data?.success !== true) {
      return res.status(502).json({
        success: false,
        message: "رفض مزود الخدمة عملية الشحن",
      });
    }

    return res.status(200).json({ success: true, data: data.data ?? {} });
  } catch {
    return res.status(504).json({
      success: false,
      unknown: true,
      message: "نتيجة العملية غير معروفة. تحقق من سجل المزود قبل إعادة الشحن.",
    });
  } finally {
    clearTimeout(timeout);
  }
};
