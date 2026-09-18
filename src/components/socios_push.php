<?php
// ════════════════════════════════════════════════════════════
// socios_push.php
//
// Manda notificaciones a la app de socios, por el servicio de
// Expo. Es el mismo camino que usa el Hub: un POST y Expo se
// encarga de APNs y de FCM.
//
// Se usa desde otros archivos:
//   require_once __DIR__ . '/socios_push.php';
//   sociosPush($pdo, [12, 45], 'Título', 'Cuerpo', 'viaje', 88);
//
// Y como endpoint:
//   GET  ?action=estado         → cuántos dispositivos hay
//   POST ?action=probar         → una notificación a vos mismo
//   POST ?action=enviar         → a socios concretos (solo admin)
//
// El `tipo` y el `id` viajan en los datos y la app los usa para
// abrir la pantalla correcta: sin eso, tocar la notificación te
// deja en el inicio y hay que buscar a mano lo que te avisaron.
// ════════════════════════════════════════════════════════════

require_once __DIR__ . '/helpers.php';

if (!defined('SP_URL'))  define('SP_URL', 'https://exp.host/--/api/v2/push/send');
if (!defined('SP_LOTE')) define('SP_LOTE', 100);   // el máximo que acepta Expo

/**
 * Manda una notificación a varios socios.
 *
 * $tipo es lo que la app usa para saber a dónde llevar:
 *   'viaje' (con $id), 'puntos', 'beneficio', 'aviso', 'chat'
 *
 * Devuelve ['enviados' => n, 'errores' => [...]].
 */
function sociosPush(PDO $pdo, array $socioIds, string $titulo, string $cuerpo,
                    string $tipo = 'aviso', ?int $id = null, array $extra = []): array {

    $socioIds = array_values(array_unique(array_filter(array_map('intval', $socioIds))));
    if (!$socioIds) return ['enviados' => 0, 'errores' => []];

    $in = implode(',', array_fill(0, count($socioIds), '?'));
    $st = $pdo->prepare(
        "SELECT id, socio_id, token FROM push_tokens
          WHERE socio_id IN ($in) AND activo = 1"
    );
    $st->execute($socioIds);
    $dispositivos = $st->fetchAll(PDO::FETCH_ASSOC);

    if (!$dispositivos) {
        return ['enviados' => 0, 'errores' => ['sin dispositivos registrados']];
    }

    $mensajes = [];
    $descartados = 0;
    foreach ($dispositivos as $d) {
        // Un token que no tiene el formato de Expo es de la versión
        // vieja o quedó corrupto: mandarlo solo genera errores.
        if (!preg_match('/^Expo(nent)?PushToken\[.+\]$/', $d['token'])) {
            $descartados++;
            continue;
        }

        $datos = ['tipo' => $tipo] + $extra;
        if ($id !== null) $datos['id'] = $id;

        $mensajes[] = [
            'to'        => $d['token'],
            'title'     => $titulo,
            'body'      => $cuerpo,
            'sound'     => 'default',
            'data'      => $datos,
            'channelId' => 'default',
            // Sin prioridad alta, Android puede demorarlas hasta que
            // el teléfono se despierte.
            'priority'  => 'high',
        ];
    }

    if (!$mensajes) {
        return ['enviados' => 0, 'errores' => ["ningún token válido ($descartados descartados)"]];
    }

    $enviados = 0;
    $errores  = [];

    foreach (array_chunk($mensajes, SP_LOTE) as $lote) {
        $r = sociosPushPost($lote);
        if (!$r['ok']) { $errores[] = $r['error']; continue; }

        foreach (($r['data'] ?? []) as $i => $res) {
            if (($res['status'] ?? '') === 'ok') { $enviados++; continue; }

            $detalle = $res['details']['error'] ?? ($res['message'] ?? 'error');
            $errores[] = $detalle;

            // Desinstaló la app o revocó el permiso: el token ya no
            // sirve y hay que apagarlo, si no se reintenta para siempre.
            if ($detalle === 'DeviceNotRegistered' && isset($lote[$i]['to'])) {
                try {
                    $pdo->prepare("UPDATE push_tokens SET activo = 0 WHERE token = ?")
                        ->execute([$lote[$i]['to']]);
                } catch (Throwable $e) { /* seguimos */ }
            }
        }
    }

    if ($descartados > 0) $errores[] = "$descartados token(s) con formato viejo";

    return ['enviados' => $enviados, 'errores' => $errores];
}

/** POST al servicio de Expo. cURL, y si no está, file_get_contents. */
function sociosPushPost(array $mensajes): array {
    $cuerpo  = json_encode($mensajes, JSON_UNESCAPED_UNICODE);
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
        'Accept-Encoding: gzip, deflate',
    ];

    if (function_exists('curl_init')) {
        $ch = curl_init(SP_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $cuerpo,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 20,
            CURLOPT_ENCODING       => '',
        ]);
        $resp = curl_exec($ch);
        $err  = curl_error($ch);
        curl_close($ch);
        if ($resp === false) return ['ok' => false, 'error' => 'cURL: ' . $err];
    } else {
        $ctx = stream_context_create(['http' => [
            'method'  => 'POST',
            'header'  => implode("\r\n", $headers),
            'content' => $cuerpo,
            'timeout' => 20,
            'ignore_errors' => true,
        ]]);
        $resp = @file_get_contents(SP_URL, false, $ctx);
        if ($resp === false) return ['ok' => false, 'error' => 'no pude conectar con Expo'];
    }

    $j = json_decode($resp, true);
    if (!is_array($j)) return ['ok' => false, 'error' => 'respuesta inválida de Expo'];
    if (isset($j['errors'])) return ['ok' => false, 'error' => json_encode($j['errors'])];

    return ['ok' => true, 'data' => $j['data'] ?? []];
}

// ----------------------------------------------------------------
// ENDPOINT
// ----------------------------------------------------------------

if (basename($_SERVER['SCRIPT_NAME'] ?? '') === basename(__FILE__)) {

    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, X-Token');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;

    if (empty($_SERVER['HTTP_X_TOKEN']) && !empty($_GET['_token'])) {
        $_SERVER['HTTP_X_TOKEN'] = $_GET['_token'];
    }

    try {
        $auth = requireAuth();
        $pdo  = getDB();
        $yo   = (int)$auth['userId'];

        switch ($_GET['action'] ?? '') {

            case 'probar':
                // Una notificación a vos mismo, para verificar la cadena
                // entera sin depender de que pase algo en el sistema.
                $r = sociosPush($pdo, [$yo], 'Funciona',
                        'Si ves esto, las notificaciones están andando.', 'aviso');
                echo json_encode(['ok' => true] + $r, JSON_UNESCAPED_UNICODE);
                break;

            case 'estado':
                $st = $pdo->prepare(
                    "SELECT plataforma, activo, updated_at,
                            LEFT(token, 28) AS token,
                            token REGEXP '^Expo(nent)?PushToken' AS formato_ok
                       FROM push_tokens WHERE socio_id = ?
                       ORDER BY updated_at DESC"
                );
                $st->execute([$yo]);
                $mios = $st->fetchAll(PDO::FETCH_ASSOC);

                $tot = $pdo->query(
                    "SELECT COUNT(*) FROM push_tokens
                      WHERE activo = 1 AND socio_id IS NOT NULL")->fetchColumn();
                $ok = $pdo->query(
                    "SELECT COUNT(*) FROM push_tokens
                      WHERE activo = 1 AND socio_id IS NOT NULL
                        AND token REGEXP '^Expo(nent)?PushToken\\\\['")->fetchColumn();

                echo json_encode([
                    'ok'                 => true,
                    'mis_dispositivos'   => $mios,
                    'tokens_socios'      => (int)$tot,
                    'tokens_formato_ok'  => (int)$ok,
                    'tokens_a_renovar'   => (int)$tot - (int)$ok,
                    'curl'               => function_exists('curl_init'),
                ], JSON_UNESCAPED_UNICODE);
                break;

            case 'enviar':
                if (($auth['rol'] ?? '') !== 'admin') fail('Solo admin', 403);

                $b = jsonBody();
                $ids = array_map('intval', $b['socios'] ?? []);
                if (!$ids) fail('Faltan los socios');
                if (empty($b['titulo']) || empty($b['cuerpo'])) fail('Falta título o cuerpo');

                $r = sociosPush(
                    $pdo, $ids, $b['titulo'], $b['cuerpo'],
                    $b['tipo'] ?? 'aviso',
                    isset($b['id']) ? (int)$b['id'] : null
                );
                echo json_encode(['ok' => true] + $r, JSON_UNESCAPED_UNICODE);
                break;

            default:
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => 'Acción inválida']);
        }

    } catch (Throwable $e) {
        error_log('[socios_push] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
    }
}
