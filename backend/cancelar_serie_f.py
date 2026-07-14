import requests
import uuid


def cancelar_folio_huerfano(uuid_a_cancelar):
    print(f"\n🚀 Iniciando BYPASS DIRECTO AL PAC para el UUID: {uuid_a_cancelar}")

    url = (
        "https://solucionfactible.com/ws/services/Timbrado.TimbradoHttpsSoap11Endpoint/"
    )

    # Credenciales y Certificados extraídos directamente de tu log exitoso
    usuario_pac = "trafico2@3t.com.mx"
    password_pac = "iMbm2Z49.2_"
    contrasena_csd = "RTX110624"

    # Certificado CSD en Base64
    cert_b64 = "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"

    # Llave Privada CSD en Base64
    key_b64 = "MIIFDjBABgkqhkiG9w0BBQ0wMzAbBgkqhkiG9w0BBQwwDgQIAgEAAoIBAQACAggAMBQGCCqGSIb3DQMHBAgwggS9AgEAMASCBMjASzwj60XtfatKovtwD9dRB9TUru9fkqFTZAz88YDBfuaOHYSG8lsZHyEHAfvVVYp8i7N8UlBNJdvV2v4nCZB4Z8gvJJuykoCQVTGIl5C0y6J7fwnGjhTYggvNkn/sMoyk8/2koYwOIXzE5hLW5YNxxF4lEeEMd0T1RCZOFKCWkexgAwonGOHPj1ymr+YmZ6vbiniGPWMNOVj9kCgRrD6dqul9Lm/XO4ILxTn6ZJSIyb5vzbJsXwiAUG3OZh2RMIihitTmoeEVXLWoTnSs1pld7uQoGk6n9nduPQaz6m6wO7gtnfL+YJB7nGNWA6aShLT8zXx+8exlwf+04yRSvFn3rqE1DIF7HFGq+cJSA6S3+HZavsFc38e++8dbdri8XQ47rt5DF9XQMs2QkngTdkchu4Onqm6UTssFZ+4BQa2noKTyJcm3EZfVj91Zpm/swoSviqQMeYzPh+T4IanOpAZM0u+28mp+TRnLgiKg26XL+ID8iE0eQAGfL8b2yCfA166PdySZQPVAd/iiCDsvik8xeFC0lTR1ryRJionZdqGZJORTulflxi8bqBSvokqjNOLijocy3uivwEfTONatIkOadgwN8LQcb4u/5qfSYcPC/3HKAGpi438w2um2HqNvpyvPMCHN89J2DOzFNqhY8uwd+FMBA72qqP/pfjFtsOngKvPAklU85Z+6bsX8FxX4te5tx2XIJjTY3nZcnhexn8+6x1pOFJq4EZsnyqC5uRGhVShEqkn7PgqvN3Nn44kPwIP4j+D7jnU5LVnlXILgAJRhpw0kY+8necQUcaivTVG+zWHXm1JF1CCZ22WS6mH/rkSMH8P8a8uVgpXqA+P0Nvq0VtqehuhVS77vsY7zv4V2dOy6iAltTnolu+uLpCUslUN5thf58s2gLz0v02UrFVYB9jHGnVaFA7DqA62SP1K4LqB7ekC8vMwACc5qdXCnlEozwlVZ/gD9W5Og+w0kg26uiQxBllN0ZvMHKjKFXh51J9nUrS7b9IzC4Bhcrm3+rQmNRhDzLYwGmdV+EiMqgcQKm9xHcVnsll5YQOq6yIOI0KVMFEWqk6NmsVWN6l/0NeABV74kaum3H2M6l7pVO/p6+NHY8JxVpXeHJ8zE63rSQdcAjWb+i492dVsXzoB/4O9w59D1x+dHL4r1wQCk9g3n19nBiN7BxnyVGRnZ9njn65mBsc5i/vKRTtA6VRye+yzCC1h8yVCpI0TWmkIppG5j3sa8D1ocDWYXi2VtxHWj54C+D3rpJZvvlWPBJq1lBNhwIhLFwMmBzNQIEYZ0vOxj5NYy+owDdQRwlQzB3sSd2xWicNyxVGDpEloWCCfJhqVd9lg3KKK3cNLfBfD7KVTa/grsswZl+NjXCs11Cq2217lBhUEcmQhG/yAsXVaYla0WFS4/lnXkGICv+YjBgjQsMdDNuG41/LKoiliGw1mI6k9k1sfb0QMVYoeBcFIFCP8psTAQ3VYFCGmh1i1VJiicRqx+iL9qzRKaLmd9hrvD8fxG4cNMEYdY1fpwjBHO0zjrMkxGaE/icIzr59eHgKAOjPz7Y2YuXuT22Cdv8j8/nXHUC5UePUQttAGdWZaM2B/R4zkZlprPVxPosJxbVa9XP7eCB7F3ghc="

    # Armamos el XML exacto que espera el PAC
    xml_payload = f"""<?xml version='1.0' encoding='utf-8'?>
<soap-env:Envelope xmlns:soap-env="http://schemas.xmlsoap.org/soap/envelope/">
  <soap-env:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <wsa:Action>urn:cancelar</wsa:Action>
    <wsa:MessageID>urn:uuid:{uuid.uuid4()}</wsa:MessageID>
    <wsa:To>https://solucionfactible.com/ws/services/Timbrado.TimbradoHttpsSoap11Endpoint/</wsa:To>
  </soap-env:Header>
  <soap-env:Body>
    <ns0:cancelar xmlns:ns0="http://timbrado.ws.cfdi.solucionfactible.com">
      <ns0:usuario>{usuario_pac}</ns0:usuario>
      <ns0:password>{password_pac}</ns0:password>
      <ns0:uuids>{uuid_a_cancelar}|02|</ns0:uuids>
      <ns0:derCertCSD>{cert_b64}</ns0:derCertCSD>
      <ns0:derKeyCSD>{key_b64}</ns0:derKeyCSD>
      <ns0:contrasenaCSD>{contrasena_csd}</ns0:contrasenaCSD>
    </ns0:cancelar>
  </soap-env:Body>
</soap-env:Envelope>"""

    headers = {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": "urn:cancelar"}

    try:
        response = requests.post(url, headers=headers, data=xml_payload.encode("utf-8"))

        print("\n📥 RESPUESTA DEL PAC:")
        print(f"HTTP Status: {response.status_code}")

        # Validamos rápidamente si el SAT aceptó la cancelación o si ya estaba cancelado
        if "en proceso" in response.text or "cancelado" in response.text.lower():
            print(
                f"✅ ¡ÉXITO! UUID {uuid_a_cancelar} fue enviado a cancelación exitosamente."
            )
        else:
            print("⚠️ Revisa el mensaje completo en la respuesta (posible error):")
            print(response.text)

    except Exception as e:
        print(f"❌ Error al conectar con el PAC: {e}")


if __name__ == "__main__":
    # Inyectamos el UUID huérfano
    cancelar_folio_huerfano("FFDE385D-EBA7-490D-9458-4B7125E601E2")
