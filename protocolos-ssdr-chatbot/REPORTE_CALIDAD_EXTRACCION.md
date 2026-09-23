# Reporte de calidad de extracción — Protocolos RyC SSDR

Generado automáticamente a partir del PDF consolidado (705 páginas). 
Este documento indica qué secciones se identificaron con confianza y cuáles requieren revisión manual antes de confiar plenamente en las respuestas del chatbot sobre ellas.


## Secciones de ALTA confianza (texto nativo o OCR limpio)

- **Cardiología (edición 2010-2015)** — páginas 1–15 del PDF original
- **Oftalmología – Catarata** — páginas 16–35 del PDF original
- **Oftalmología – Pterigion** — páginas 36–54 del PDF original
- **Oftalmología – Vicios de Refracción** — páginas 55–89 del PDF original
- **Otorrinolaringología – Patología Adenoamigdalina** — páginas 90–111 del PDF original
- **Otorrinolaringología – Síndrome Vertiginoso** — páginas 112–135 del PDF original
- **Otorrinolaringología – Hipoacusia** — páginas 136–181 del PDF original
- **Urología (versión anterior, previa a 2026-2030)** — páginas 182–192 del PDF original
- **Cirugía Infantil / Resoluciones administrativas** — páginas 193–200 del PDF original
- **Cirugía Infantil – Criptorquidia** — páginas 201–220 del PDF original
- **Cirugía Infantil – Fimosis / Parafimosis** — páginas 221–242 del PDF original
- **Cirugía Infantil – Hernias** — páginas 243–264 del PDF original
- **Nefrología** — páginas 265–312 del PDF original
- **Cardiología (tabla priorización - dolor torácico, soplos, etc.)** — páginas 366–402 del PDF original
- **Oncología Infantil / Hemato-Oncología – Tumores del Sistema Nervioso Central Pediátricos** — páginas 403–417 del PDF original
- **Ginecología – Patología Cervical (PAP / HPV)** — páginas 418–432 del PDF original
- **Odontología – Especialidades Odontológicas** — páginas 433–477 del PDF original
- **Cirugía Adulto – Colelitiasis (No GES)** — páginas 490–504 del PDF original
- **Cirugía Adulto – Hernia Inguinal** — páginas 505–518 del PDF original
- **Cirugía Adulto – Bibliografía / Anexos** — páginas 519–531 del PDF original
- **Neurología Adulto** — páginas 532–563 del PDF original
- **Oftalmología – Prótesis Ocular** — páginas 564–565 del PDF original
- **Ginecología – Métodos Anticonceptivos / Regulación de Fertilidad** — páginas 581–599 del PDF original
- **Neurología Infantil** — páginas 600–635 del PDF original
- **Ginecología – Derivación a Policlínico de Ginecología desde APS** — páginas 636–646 del PDF original
- **Ginecología – Programa de Climaterio** — páginas 647–652 del PDF original
- **Cardiología (edición 2025-2030, Consulta Especialidades) - protocolo A** — páginas 653–662 del PDF original
- **Cardiología (edición 2025-2030) - protocolo B** — páginas 663–680 del PDF original
- **Cardiología (edición 2025-2030) - protocolo C** — páginas 681–700 del PDF original
- **Cardiología (edición 2025-2030) - protocolo D** — páginas 701–705 del PDF original

## Secciones de BAJA confianza — revisar manualmente

- **Sección con contenido mayormente gráfico (flujogramas) - continuación probable de otras especialidades** — páginas 313–365 del PDF original
- **Resolución administrativa - especialidad no identificada automáticamente** — páginas 478–489 del PDF original
- **Programa / Implementación (Salud Mental o Climaterio) - a confirmar** — páginas 566–575 del PDF original
- **Nutrición / Salud Mental - a confirmar** — páginas 576–580 del PDF original

## Adicional

- El protocolo de **Urología** se incluyó dos veces en el corpus: la versión antigua encontrada dentro del PDF consolidado (páginas 182-192, marcada como 'versión anterior'), y la versión estructurada a mano en la sesión anterior a partir del Word oficial vigente 2026-2030 (marcada como 'protocolo verificado', alta confianza). El buscador tiende a preferir esta última por su mayor densidad de términos relevantes, pero ambas están presentes.

- **Recomendación:** para las secciones de baja confianza, o para cualquier protocolo donde la precisión sea crítica, lo ideal es repetir el proceso que hicimos con Urología: conseguir el Word/PDF original de esa especialidad por separado y estructurarlo a mano en chunks limpios, reemplazando el chunk automático correspondiente en `data/chunks.json`.
