<?php
/**
 * Nimmt das Kontaktformular entgegen und schickt eine Mail.
 *
 * Liegt bewusst in public/ und wird dadurch von Angular in den Build
 * kopiert. Im alten Portfolio lag die Datei unter src/app/ und war in
 * angular.json nicht als Asset eingetragen: Sie landete nie im Build und
 * der Endpunkt lieferte dauerhaft 404.
 */

declare(strict_types=1);

const EMPFAENGER   = 'info@alexander-ruppel.de';

/**
 * Absender bewusst dieselbe, real existierende Adresse.
 *
 * Das alte Skript nutzte contactForm@portfolio.de. Diese Domain gehoert
 * nicht zu diesem Server, der SPF-Eintrag passt also nicht und viele
 * Empfaenger sortieren solche Mails als Spam ein oder weisen sie ab. Eine
 * Adresse auf der eigenen Domain besteht die Pruefung. Die Antwort geht
 * ueber Reply-To trotzdem an den Absender des Formulars.
 */
const ABSENDER     = 'info@alexander-ruppel.de';
const ERLAUBT      = ['https://alexander-ruppel.de', 'https://www.alexander-ruppel.de'];
const MAX_NAME     = 120;
const MAX_MAIL     = 200;
const MAX_NACHRICHT = 5000;

$herkunft = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($herkunft, ERLAUBT, true)) {
    header("Access-Control-Allow-Origin: $herkunft");
    header('Vary: Origin');
}
header('Content-Type: application/json; charset=utf-8');

// Ohne Rueckgabetyp, damit das Skript auch auf PHP 8.0 laeuft.
// 'never' gaebe es erst ab 8.1.
function antwort(int $status, string $schluessel)
{
    http_response_code($status);
    echo json_encode(['status' => $schluessel], JSON_UNESCAPED_UNICODE);
    exit;
}

switch ($_SERVER['REQUEST_METHOD'] ?? '') {
    case 'OPTIONS':
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: content-type');
        header('Access-Control-Max-Age: 86400');
        http_response_code(204);
        exit;

    case 'POST':
        break;

    default:
        header('Allow: POST, OPTIONS');
        antwort(405, 'methodNotAllowed');
}

$roh = file_get_contents('php://input');
if ($roh === false || $roh === '' || strlen($roh) > 20000) {
    antwort(400, 'invalid');
}

$daten = json_decode($roh, true);
if (!is_array($daten)) {
    antwort(400, 'invalid');
}

// Honigtopf: Ein echtes Formular laesst dieses Feld leer, ein Bot fuellt
// es aus. Wir melden Erfolg, damit der Bot nicht merkt, dass er auffliegt.
if (trim((string)($daten['website'] ?? '')) !== '') {
    antwort(200, 'ok');
}

$name      = trim((string)($daten['name'] ?? ''));
$mail      = trim((string)($daten['mail'] ?? ''));
$nachricht = trim((string)($daten['message'] ?? ''));

if ($name === '' || $mail === '' || $nachricht === '') {
    antwort(422, 'missing');
}
if (mb_strlen($name) > MAX_NAME || mb_strlen($mail) > MAX_MAIL || mb_strlen($nachricht) > MAX_NACHRICHT) {
    antwort(422, 'tooLong');
}
if (!filter_var($mail, FILTER_VALIDATE_EMAIL)) {
    antwort(422, 'invalidMail');
}
// Kopfzeilen-Einschleusung ueber Zeilenumbrueche in Name oder Adresse.
if (preg_match('/[\r\n]/', $name . $mail)) {
    antwort(422, 'invalid');
}

$betreff = 'Kontakt von ' . $name;

$koerper = "<p><strong>Von:</strong> "
    . htmlspecialchars($name, ENT_QUOTES, 'UTF-8')
    . ' &lt;' . htmlspecialchars($mail, ENT_QUOTES, 'UTF-8') . "&gt;</p>"
    . '<p>' . nl2br(htmlspecialchars($nachricht, ENT_QUOTES, 'UTF-8')) . '</p>';

$kopfzeilen = [
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'From: Kontaktformular <' . ABSENDER . '>',
    // Damit "Antworten" beim Absender landet und nicht bei der eigenen Adresse.
    'Reply-To: ' . $mail,
];

$gesendet = mail(
    EMPFAENGER,
    '=?UTF-8?B?' . base64_encode($betreff) . '?=',
    $koerper,
    implode("\r\n", $kopfzeilen),
);

antwort($gesendet ? 200 : 500, $gesendet ? 'ok' : 'failed');
