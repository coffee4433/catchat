# Plan: Self-Host de LiveKit (con Vercel como frontend)

> **App:** CatChat (Next.js 16 + Electron + Supabase + Vercel)
> **Objetivo:** Sustituir LiveKit Cloud por un servidor `livekit-server` propio, manteniendo TODO el código de la app intacto (solo cambian variables de entorno).
> **Prerequisito:** Haber implementado (o estar implementando) el plan de `PLAN-LIVEKIT.md`.

---

## 1. Lo primero: qué puede y qué NO puede hacer Vercel

Esta es la aclaración más importante del documento:

> ⚠️ **El servidor de medios de LiveKit NO puede ejecutarse en Vercel.**

**¿Por qué?** Vercel es una plataforma *serverless*:

| Requisito de `livekit-server` | ¿Vercel lo soporta? |
|---|---|
| Proceso persistente 24/7 (daemon) | ❌ Las funciones viven segundos/minutos |
| Puertos **UDP** abiertos (WebRTC = RTP sobre UDP) | ❌ Solo HTTP/HTTPS |
| WebSockets de larga duración hacia un servidor propio | ❌ Limitado |
| IP pública estable anunciable a los clientes | ❌ IPs efímeras |

**El reparto correcto de responsabilidades es:**

```
┌─────────────────────────────────────────────────────────────┐
│  VERCEL (esto SÍ)                                            │
│  • La app Next.js completa (UI, chat)                        │
│  • /api/livekit/token → firma JWT con livekit-server-sdk     │
│    (la API es idéntica: solo apunta a TU servidor)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ el cliente recibe token + URL wss://
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  TU SERVIDOR (VPS / máquina propia) (esto va FUERA)          │
│  • livekit-server (Docker) — SFU de medios                   │
│  • TURN embebido (para NAT estrictos)                        │
│  • Caddy/certbot para TLS (wss:// requiere certificado)      │
└─────────────────────────────────────────────────────────────┘
```

**La buena noticia:** como el plan de `PLAN-LIVEKIT.md` ya separa tokens (Vercel) de medios (LiveKit), migrar de Cloud a self-host es **cambiar 3 variables de entorno**. Cero cambios de código.

> **Nota sobre tu restricción de "no túneles":** este plan NO usa ngrok, Cloudflare Tunnel ni similares. Usa un servidor con IP pública real, que es la solución correcta y permanente.

---

## 2. ¿Dónde hospedar el servidor? (opciones)

Necesitas una máquina Linux con IP pública y puertos UDP abiertos:

| Opción | Coste | Notas |
|---|---|---|
| **Oracle Cloud Always Free** | **$0 para siempre** | 4 OCPUs ARM + 24 GB RAM gratis. La mejor opción $0. Requiere tarjeta para verificar identidad (no cobra). |
| VPS barato (Hetzner, OVH, Contabo...) | ~2-5 €/mes | Hetzner CX22 (2 vCPU/4GB) sobra para llamadas 1:1 y grupos pequeños. |
| PC/servidor en casa | $0 | Requiere IP pública (o IPv6) y abrir puertos en el router. Frágil si tu ISP usa CGNAT. |
| Fly.io / Railway | Variable | Posible pero UDP es más delicado; no recomendado para empezar. |

**Recomendación:** Oracle Cloud Always Free si quieres $0 absoluto, o Hetzner si prefieres simplicidad.

**Requisitos mínimos:** 1-2 vCPU, 1-2 GB RAM, Ubuntu 22.04+. Un SFU reenvía paquetes, no transcodifica: es ligero. Para llamadas 1:1 y grupos de <10, cualquier VPS pequeño sirve.

---

## 3. Requisito previo: dominio y DNS

Los clientes se conectan por `wss://` (WebSocket seguro), que **exige TLS**, que exige un dominio.

1. Usa un dominio que ya tengas o un subdominio: `livekit.tudominio.com` y `turn.tudominio.com`.
2. Crea dos registros **A** apuntando a la IP pública del servidor:
   ```
   livekit.tudominio.com  →  IP_DEL_SERVIDOR
   turn.tudominio.com     →  IP_DEL_SERVIDOR
   ```
3. Si no tienes dominio: DuckDNS o similar dan subdominios gratis, o compra un `.com` barato (~10 €/año). *(Un servicio de DNS dinámico no es un túnel — cumple tu restricción.)*

---

## 4. Instalación con el generador oficial (recomendada)

LiveKit incluye un generador que produce toda la configuración lista para producción (Docker Compose + Caddy con TLS automático + TURN):

```bash
# En el servidor (Ubuntu):
curl -sSL https://get.livekit.io | bash        # instala livekit-server y CLI

# Generar configuración de producción:
livekit-server generate
# o con Docker:
docker run --rm -it -v $PWD:/output livekit/generate
```

El asistente te pregunta:
1. **Dominio principal** → `livekit.tudominio.com`
2. **Dominio TURN** → `turn.tudominio.com`
3. **¿Usar Let's Encrypt?** → Sí (TLS automático, $0)
4. Genera: `docker-compose.yaml`, `livekit.yaml`, `caddy.yaml` y un **API key/secret** nuevos.

Resultado: una carpeta con todo listo. Arrancar:

```bash
docker compose up -d
```

Esto levanta dos contenedores:
- **`livekit-server`** — el SFU
- **`caddy`** — reverse proxy con certificados Let's Encrypt automáticos (renovación incluida)

---

## 5. Configuración manual (si prefieres entender cada pieza)

`livekit.yaml` mínimo de producción:

```yaml
port: 7880                    # WebSocket/HTTP (detrás de Caddy → wss://)
rtc:
  tcp_port: 7881              # fallback TCP para redes que bloquean UDP
  port_range_start: 50000     # rango UDP para medios
  port_range_end: 60000
  use_external_ip: true       # descubre y anuncia la IP pública (crítico en VPS)
keys:
  # Genera los tuyos: livekit-server generate-keys
  APIxxxxxxxxx: "secreto-largo-aleatorio"
turn:
  enabled: true               # TURN embebido: clientes tras NAT estricto
  domain: turn.tudominio.com
  tls_port: 5349
  udp_port: 3478
```

> `use_external_ip: true` es el error #1 en self-hosting: sin él, el servidor anuncia su IP privada interna y nadie puede conectar.

---

## 6. Firewall: puertos a abrir

En el firewall del VPS **y** en el security group del proveedor (Oracle/AWS tienen ambos):

| Puerto | Protocolo | Uso |
|---|---|---|
| 443 | TCP | wss:// señalización (Caddy → livekit) + TURN/TLS |
| 80 | TCP | Let's Encrypt (emisión de certificados) |
| 7881 | TCP | WebRTC sobre TCP (fallback) |
| 3478 | UDP | TURN |
| 50000-60000 | UDP | **Medios WebRTC (el tráfico principal)** |

```bash
# Ejemplo con ufw:
ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 7881/tcp
ufw allow 3478/udp && ufw allow 50000:60000/udp
```

> En Oracle Cloud, además de `ufw`/`iptables` hay que añadir estas reglas en la **Security List** de la VCN (consola web). Oracle bloquea todo por defecto y es el segundo error más común.

---

## 7. Conectar Vercel con tu servidor

Aquí está la magia: **no se cambia ni una línea de código**. En Vercel (Settings → Environment Variables) actualiza:

```bash
# Antes (LiveKit Cloud):
LIVEKIT_API_KEY=APIxxxx           (de cloud.livekit.io)
LIVEKIT_API_SECRET=xxxxxxxx       (de cloud.livekit.io)
NEXT_PUBLIC_LIVEKIT_URL=wss://<proyecto>.livekit.cloud

# Después (self-host):
LIVEKIT_API_KEY=APIxxxx           (el generado en tu livekit.yaml)
LIVEKIT_API_SECRET=xxxxxxxx       (el generado en tu livekit.yaml)
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.tudominio.com
```

Redeploy en Vercel y listo:
- `app/api/livekit/token/route.ts` firma tokens con TUS keys (el `AccessToken` de `livekit-server-sdk` es solo un JWT — no habla con ningún servidor para firmarse).
- El cliente (`<LiveKitRoom serverUrl={...}>`) se conecta a tu dominio.
- Electron, el picker de pantalla, el ring por Supabase: todo idéntico.

**Rollback trivial:** si algo falla, vuelve a poner las 3 variables de Cloud y redeploy.

---

## 8. Verificación

1. **Salud del servidor:** `curl https://livekit.tudominio.com` → responde `OK`.
2. **Test de conectividad oficial:** https://livekit.io/connection-test — pega tu URL y un token generado (`livekit-cli create-token ...`). Comprueba WebSocket, UDP, TCP fallback y TURN.
3. **Test real:** una llamada CatChat entre dos redes distintas (ej. WiFi + datos móviles).
4. **Logs:** `docker compose logs -f livekit`.

---

## 9. Mantenimiento

| Tarea | Cómo |
|---|---|
| Actualizar LiveKit | `docker compose pull && docker compose up -d` (1 comando, ~10s de corte) |
| Certificados TLS | Automático (Caddy renueva Let's Encrypt solo) |
| Reinicio tras reboot | `restart: unless-stopped` ya viene en el compose generado |
| Monitoreo básico | `docker stats`; LiveKit expone métricas Prometheus en `:6789` si algún día quieres Grafana |
| Backups | Nada que respaldar: el servidor es *stateless* (las salas son efímeras; el historial vive en Supabase) |

---

## 10. Cloud vs. Self-host: cuándo migrar

| Aspecto | LiveKit Cloud (Build) | Self-host |
|---|---|---|
| Coste | $0 hasta 5,000 min/mes | $0 (Oracle) o ~3 €/mes (VPS), **sin límite de minutos** |
| Setup | 5 minutos | 1-2 horas (dominio + VPS + Docker) |
| Mantenimiento | Cero | Actualizaciones ocasionales (1 comando) |
| Latencia | Edge global automático | Un solo servidor (bien para amigos en la misma región) |
| Escalado | Automático | Manual (irrelevante para grupos de amigos) |

**Recomendación práctica:** empieza con Cloud (tier Build) para validar todo el sistema de llamadas. Migra a self-host solo si te acercas a los 5,000 min/mes. La migración es el §7: tres variables y redeploy.

---

## 11. Riesgos y soluciones

| Problema | Causa típica | Solución |
|---|---|---|
| "No conecta nadie" | Falta `use_external_ip: true` | Añadirlo en `livekit.yaml` |
| Conecta pero sin audio/video | UDP 50000-60000 cerrado | Abrir en firewall + security group del proveedor |
| Falla solo desde redes móviles/corporativas | TURN mal configurado | Verificar DNS de `turn.tudominio.com` y puerto 5349/tcp + 3478/udp |
| `wss://` falla con error TLS | Certificado no emitido | Puerto 80 abierto, DNS propagado, revisar logs de Caddy |
| Oracle: todo bien pero nada conecta | Security List de la VCN | Añadir reglas también en la consola de Oracle (además de ufw) |
| Servidor en casa: no accesible | CGNAT del ISP | No hay solución sin túnel → usar VPS |

---

## 12. Resumen

1. **Vercel no puede hospedar el SFU** — hospeda la app y el endpoint de tokens, que es exactamente lo que ya hace.
2. `livekit-server` corre en un VPS con Docker: el generador oficial (`livekit-server generate`) produce compose + TLS automático + TURN en minutos.
3. Opción **$0 total**: Oracle Cloud Always Free + dominio gratuito/barato + Let's Encrypt.
4. La migración desde Cloud es **3 variables de entorno y un redeploy** — ni una línea de código cambia, y el rollback es igual de trivial.
5. Sin túneles de terceros: IP pública real + DNS + TLS propio, cumpliendo tu restricción original.
