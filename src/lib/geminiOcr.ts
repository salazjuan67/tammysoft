import { z } from "zod";

export const ocrFacturaSchema = z.object({
  proveedorNombre: z.string().nullable().optional(),
  numeroFactura: z.string().nullable().optional(),
  fechaEmision: z.string().nullable().optional(), // YYYY-MM-DD
  fechaVencimiento: z.string().nullable().optional(),
  montoNeto: z.number().nullable().optional(),
  montoIva: z.number().nullable().optional(),
  montoTotal: z.number().nullable().optional(),
  concepto: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        descripcion: z.string(),
        cantidad: z.number(),
        unidad: z.string().default("UN"),
        precioUnitario: z.number().default(0),
        subtotal: z.number().default(0),
      })
    )
    .default([]),
});

export type OcrFacturaResult = z.infer<typeof ocrFacturaSchema>;

/** Modelos free con visión, en orden de preferencia (lite primero = menos saturación). */
const MODELOS_FALLBACK = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.8-flash",
];

const PROMPT = `Sos un extractor de facturas de proveedores de Argentina (AFIP / ARCA).
Analizá la imagen de la factura y devolvé SOLO un JSON válido con esta forma exacta:
{
  "proveedorNombre": string|null,
  "numeroFactura": string|null,
  "fechaEmision": "YYYY-MM-DD"|null,
  "fechaVencimiento": "YYYY-MM-DD"|null,
  "montoNeto": number|null,
  "montoIva": number|null,
  "montoTotal": number|null,
  "concepto": string|null,
  "items": [
    {
      "descripcion": string,
      "cantidad": number,
      "unidad": "KG"|"L"|"UN"|"GR"|"ML"|"CAJA"|"BOLSA"|"PACK",
      "precioUnitario": number,
      "subtotal": number
    }
  ]
}
Reglas:
- Extraé todos los renglones de productos / insumos / materia prima.
- Normalizá unidades a KG, L, UN, GR, ML, CAJA, BOLSA o PACK.
- Si no hay unidad clara, usá UN.
- Si falta precio unitario pero hay subtotal y cantidad, calculalo.
- Si falta subtotal, usá cantidad * precioUnitario.
- Montos en número decimal con punto (ej 1234.56).
- No inventes ítems que no estén en la factura.
- concepto: una categoría corta tipo "Insumos", "Empaques", "Servicios", etc.`;

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced?.[1] ?? trimmed).trim();
}

function esErrorTemporal(status: number, message: string): boolean {
  const m = message.toLowerCase();
  return (
    status === 429 ||
    status === 503 ||
    status === 500 ||
    m.includes("high demand") ||
    m.includes("try again") ||
    m.includes("unavailable") ||
    m.includes("overloaded") ||
    m.includes("resource_exhausted") ||
    m.includes("no longer available")
  );
}

function listaModelos(): string[] {
  const preferido = process.env.GEMINI_MODEL?.trim();
  const ordered = preferido
    ? [preferido, ...MODELOS_FALLBACK.filter((m) => m !== preferido)]
    : MODELOS_FALLBACK;
  return [...new Set(ordered)];
}

async function llamarModelo(
  apiKey: string,
  model: string,
  imageBase64: string,
  mimeType: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            { inlineData: { mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: json?.error?.message || `Gemini respondió ${res.status}`,
    };
  }

  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";
  if (!text) {
    return { ok: false, status: 502, message: "Gemini no devolvió texto usable" };
  }
  return { ok: true, text };
}

export async function extraerFacturaConGemini(
  imageBase64: string,
  mimeType: string
): Promise<OcrFacturaResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en el servidor");
  }

  const modelos = listaModelos();
  let ultimoError = "No se pudo leer la factura";

  for (const model of modelos) {
    const result = await llamarModelo(apiKey, model, imageBase64, mimeType);
    if (!result.ok) {
      ultimoError = result.message;
      if (esErrorTemporal(result.status, result.message)) {
        // Probar el siguiente modelo
        continue;
      }
      throw new Error(result.message);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFence(result.text));
    } catch {
      ultimoError = "No se pudo interpretar la respuesta de Gemini como JSON";
      continue;
    }

    const validated = ocrFacturaSchema.safeParse(parsed);
    if (!validated.success) {
      ultimoError = "La factura se leyó, pero el formato de datos no es válido";
      continue;
    }

    const items = validated.data.items
      .filter((i) => i.descripcion?.trim() && Number(i.cantidad) > 0)
      .map((i) => {
        const cantidad = Number(i.cantidad) || 0;
        const precioUnitario = Number(i.precioUnitario) || 0;
        const subtotal =
          Number(i.subtotal) > 0
            ? Number(i.subtotal)
            : Math.round(cantidad * precioUnitario * 100) / 100;
        return {
          descripcion: i.descripcion.trim(),
          cantidad,
          unidad: (i.unidad || "UN").toUpperCase(),
          precioUnitario,
          subtotal,
        };
      });

    return { ...validated.data, items };
  }

  throw new Error(
    `${ultimoError}. Probá de nuevo en unos minutos (Gemini está con mucha demanda).`
  );
}
