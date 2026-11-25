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

export async function extraerFacturaConGemini(
  imageBase64: string,
  mimeType: string
): Promise<OcrFacturaResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Falta GEMINI_API_KEY en el servidor");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
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
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Gemini respondió ${res.status}`;
    throw new Error(msg);
  }

  const text =
    json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ??
    "";
  if (!text) throw new Error("Gemini no devolvió texto usable");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripJsonFence(text));
  } catch {
    throw new Error("No se pudo interpretar la respuesta de Gemini como JSON");
  }

  const result = ocrFacturaSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("La factura se leyó, pero el formato de datos no es válido");
  }

  // Normalizar items
  const items = result.data.items
    .filter((i) => i.descripcion?.trim() && Number(i.cantidad) > 0)
    .map((i) => {
      const cantidad = Number(i.cantidad) || 0;
      const precioUnitario = Number(i.precioUnitario) || 0;
      const subtotal =
        Number(i.subtotal) > 0 ? Number(i.subtotal) : Math.round(cantidad * precioUnitario * 100) / 100;
      return {
        descripcion: i.descripcion.trim(),
        cantidad,
        unidad: (i.unidad || "UN").toUpperCase(),
        precioUnitario,
        subtotal,
      };
    });

  return { ...result.data, items };
}
