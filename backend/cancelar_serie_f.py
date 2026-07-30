import os
import re

# ====================================================================
# 🔧 RUTA A TUS ARCHIVOS XML ACTUALIZADA
# ====================================================================
DIRECTORIO_XML = "/home/desarrolloas/base-foundation/backend/app/storage/xml_timbrados"

# Lista de UUIDs que el SAT rebotó como NO CANCELABLES
UUIDS_BLOQUEADOS = [
    "E76A361D-5730-4BDB-9212-C692F45C2E04",
    "48005C35-0984-4E2D-A755-EB2D852F15D0",
    "BC4C821C-BB34-47C4-944B-856A57F28201",
    "9191A006-6079-4A87-9132-FE3625810571",
    "A817227D-8797-416F-9D1B-183BA582EDC4",
    "26B39709-6189-4B17-9527-C14CBB1449BC",
    "33E794A4-8EA4-4F11-B274-248F0BA7E2AC",
    "9AC1FE06-4C15-44F0-9499-A2CE257E0415",
    "D8E6D278-7F07-4BA0-B3A9-AFFE4F90AB01",
    "8E4B869D-0502-4BCF-8F31-BCA7300CF97B",
    "519A26FB-3EA9-4A35-9CD7-7CE1709DC11A",
    "4B1FAFED-3221-4485-8EFB-8C59AE062EC4",
    "097D2E77-8B28-4DFA-A9BA-F0D11C38FEBD",
    "A4B6E278-4D46-45DF-9613-94F6D0FF19BD",
    "A249B360-E975-44B6-8144-5180940E74A0",
    "72DC2B64-FCF2-4F10-95BE-573E149A54B3",
    "AF0BCC30-7736-4744-9C5F-E79632054D5D",
    "12EF2D29-7D04-4C87-81AD-768C743D4CEB",
    "3F224FE1-22DE-4AD5-B580-1C9A5CED30FF",
    "9F73FD07-B4A7-4699-A7EC-481BAA7496BE",
    "16A13839-49E2-46D0-BE17-CB12360E1E49",
    "C9ECD3BD-A1EA-4CF0-9A26-95672D18E03D",
    "2A5ED0D3-F219-48AC-8C5C-1ACF0160E7BA",
    "26D54643-486C-4FD3-89CC-79D7226494B1",
    "C567C900-047C-4B0D-A0BE-F4446C2AE69A",
    "E33E7737-7CDE-4B5B-BD9C-85631C548377",
    "E274FF8D-CA5C-48E1-ACCC-2C09529019BC",
    "81088AD1-5976-4FA0-B5F4-B1EAC4CF36F4",
    "7DB87625-E8FE-4026-AC3D-AB61647B0B25",
    "0A262953-D74C-4019-8943-26218E8CFB30",
    "E5E6964B-07C2-4365-9BD4-B6677DF35ED3",
    "EF1E811E-A51E-4371-89CF-868D7F6681F4",
    "702735D6-8975-48A8-B8A9-1B61EC716AEE",
    "4C88C059-5A76-4C8A-819F-897171E31838",
    "9F9C4748-02A1-40C2-BDCD-6EF862C66B41",
    "49100456-EF69-458B-84B5-8A20F5389BB0",
    "0F1A3B0B-725E-4EEB-9D17-8F8D467B7BDF",
    "2624E912-4210-46B4-86C1-AC9AEBA9E604",
    "7033B334-AC59-45FB-A86E-B4025549A9C9",
    "05A343AE-AFF2-4A1F-A06A-413FD49B3D16",
    "C4EA4AB8-3DC4-4CFD-942E-735052420725",
    "725EA400-A4FB-4933-9FD1-7FA51ED4AF65",
    "75834706-6320-4E26-BABA-3B3A7C8AF4AC",
    "45B253B4-7A67-4387-AC0E-5C6E988A3095",
    "FFE352ED-48AE-473C-9759-A17D50CBD9AF",
    "4327C425-4376-4892-BA11-49A4656602C7",
    "D20ABF05-85E6-4701-B066-3098B90FE295",
    "73F9E6AE-4C72-4D1A-A568-7561658F429F",
    "C7E878F4-7C7E-43A4-9D66-B03843BAE3D3",
    "15DE708D-0643-4E3A-BABD-F72B59C20753",
    "3A1624D8-BE6D-4653-BEAB-616A808982FC",
    "1A5F3059-EB89-4639-87A5-54A41DC69F6B",
]


def obtener_uuid_del_xml(contenido):
    """Extrae el UUID propio del XML (el del TimbreFiscalDigital)."""
    match = re.search(r'UUID="([a-fA-F0-9\-]{36})"', contenido)
    return match.group(1).upper() if match else "UUID_DESCONOCIDO"


def buscar_relaciones():
    print(f"🔍 Escaneando archivos XML en: {DIRECTORIO_XML}...")

    if not os.path.exists(DIRECTORIO_XML):
        print("❌ Error: El directorio no existe. Verifica la ruta.")
        return

    # Convertir a minúsculas para búsqueda case-insensitive
    uuids_a_buscar = [u.lower() for u in UUIDS_BLOQUEADOS]
    relaciones_encontradas = {u.upper(): [] for u in UUIDS_BLOQUEADOS}

    archivos_procesados = 0

    for root, _, files in os.walk(DIRECTORIO_XML):
        for file in files:
            if file.lower().endswith(".xml"):
                archivos_procesados += 1
                ruta_completa = os.path.join(root, file)

                try:
                    with open(
                        ruta_completa, "r", encoding="utf-8", errors="ignore"
                    ) as f:
                        contenido = f.read()

                        # Extraer el UUID propio de este archivo para saber "quién" es el padre
                        uuid_padre = obtener_uuid_del_xml(contenido)
                        contenido_lower = contenido.lower()

                        for uuid_buscado in uuids_a_buscar:
                            # Si el UUID buscado está en el texto, PERO no es su propio UUID (para no auto-encontrarse)
                            if (
                                uuid_buscado in contenido_lower
                                and uuid_buscado != uuid_padre.lower()
                            ):
                                relaciones_encontradas[uuid_buscado.upper()].append(
                                    {"archivo": file, "uuid_padre": uuid_padre}
                                )
                except Exception as e:
                    pass

    print(f"✅ Se escanearon {archivos_procesados} archivos XML.\n")
    print("======================================================================")
    print("📊 RESULTADOS DE FACTURAS PADRE ENCONTRADAS")
    print("======================================================================")

    for uuid, padres in relaciones_encontradas.items():
        if padres:
            print(f"❌ CARTA PORTE BLOQUEADA: {uuid}")
            for p in padres:
                print(
                    f"    ↳ Amarrada por el CFDI Padre: {p['uuid_padre']} (Archivo: {p['archivo']})"
                )
            print("-" * 70)


if __name__ == "__main__":
    buscar_relaciones()
