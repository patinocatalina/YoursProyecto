// ===== SERVIDOR DE TURNOS DE YOURS =====
// Muestra la página, guarda los turnos de todas las personas en turnos.json,
// no deja que se superpongan y manda la confirmación por WhatsApp.
//
// Cómo usarlo (necesita Node 18 o más nuevo, no hace falta instalar nada):
//   node servidor.js
// y abrí http://localhost:3000
//
// Para que mande los WhatsApp hace falta una cuenta de WhatsApp Business (API de Meta).
// Esos datos se pasan como variables de entorno, nunca escritos acá:
//   WHATSAPP_TOKEN       token de acceso de la app de Meta
//   WHATSAPP_NUMERO_ID   "Phone number ID" del número que envía
//   WHATSAPP_PLANTILLA   nombre de la plantilla aprobada (ej: confirmacion_turno)
//   WHATSAPP_IDIOMA      idioma de la plantilla (por defecto es_AR)
//   WHATSAPP_VERSION     versión de la API de Meta (por defecto v23.0)
//
// La plantilla tiene que tener 7 variables, en este orden:
//   ¡Hola {{1}}! Tu turno en Yours está confirmado ✦
//   {{2}} con {{3}}, el {{4}} a las {{5}} h en {{6}}.
//   Total a pagar en el turno: {{7}}. ¡Te esperamos!
// Si después se suman productos a ese turno, se vuelve a mandar con el total nuevo.
// Sin plantilla se manda un texto común, pero Meta solo lo entrega si la persona
// le escribió antes al número del negocio en las últimas 24 h.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  sucursales, servicios, profesionales, productos, INTERVALO,
  aMinutos, aHora, fechaLinda, profesionalesPara, seSuperponen, profesionalesLibres,
  formatoPrecio, limpiarProductos, sumarProductos, cantidadProductos, totalTurno
} = require('./datos.js');

const PUERTO = process.env.PORT || 3000;
const ARCHIVO_TURNOS = path.join(__dirname, 'turnos.json');


// ===== TURNOS GUARDADOS =====
function leerTurnos() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_TURNOS, 'utf8'));
  } catch (e) {
    return [];
  }
}

function guardarTurnos(turnos) {
  fs.writeFileSync(ARCHIVO_TURNOS, JSON.stringify(turnos, null, 2));
}

function soloDigitos(texto) {
  return String(texto || '').replace(/\D/g, '');
}

// Pasa "11 2345 6789" al formato que pide WhatsApp para Argentina: 5491123456789
function numeroWhatsApp(telefono) {
  let n = soloDigitos(telefono);
  if (n.startsWith('54')) n = n.slice(2);
  if (n.startsWith('9')) n = n.slice(1);
  if (n.startsWith('0')) n = n.slice(1);
  return '549' + n;
}

function hoyComoTexto() {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  return hoy.toISOString().slice(0, 10);
}


// ===== WHATSAPP =====
async function enviarWhatsApp(turno) {
  const token = process.env.WHATSAPP_TOKEN;
  const numeroId = process.env.WHATSAPP_NUMERO_ID;
  if (!token || !numeroId) return 'no-configurado';

  const servicio = servicios.find(function (s) { return s.id === turno.servicio; });
  const profesional = profesionales.find(function (p) { return p.id === turno.profesional; });
  const sucursal = sucursales.find(function (s) { return s.id === turno.sucursal; });
  const cantidad = cantidadProductos(turno.productos);

  const variables = [
    turno.nombre.split(' ')[0],
    servicio.nombre,
    profesional.nombre,
    fechaLinda(turno.fecha),
    aHora(turno.inicio),
    sucursal.nombre + ' (' + sucursal.direccion + ')',
    formatoPrecio(totalTurno(turno)) +
      (cantidad ? ' (incluye ' + cantidad + (cantidad === 1 ? ' producto' : ' productos') + ' que te entregamos ese día)' : '')
  ];

  // Detalle de productos para el mensaje de texto común
  const detalle = (turno.productos || []).map(function (item) {
    const producto = productos.find(function (p) { return p.id === item.id; });
    return '• ' + producto.nombre + ' x' + item.cantidad;
  }).join('\n');

  const mensaje = {
    messaging_product: 'whatsapp',
    to: numeroWhatsApp(turno.telefono)
  };

  if (process.env.WHATSAPP_PLANTILLA) {
    mensaje.type = 'template';
    mensaje.template = {
      name: process.env.WHATSAPP_PLANTILLA,
      language: { code: process.env.WHATSAPP_IDIOMA || 'es_AR' },
      components: [{
        type: 'body',
        parameters: variables.map(function (texto) { return { type: 'text', text: texto }; })
      }]
    };
  } else {
    mensaje.type = 'text';
    mensaje.text = {
      body: '¡Hola ' + variables[0] + '! Tu turno en Yours está confirmado ✦\n' +
        variables[1] + ' con ' + variables[2] + ', el ' + variables[3] + ' a las ' + variables[4] +
        ' h en ' + variables[5] + '.\n' +
        (detalle ? 'Productos que te entregamos en el turno:\n' + detalle + '\n' : '') +
        'Total a pagar en el turno: ' + variables[6] + '. ¡Te esperamos!'
    };
  }

  try {
    const version = process.env.WHATSAPP_VERSION || 'v23.0';
    const respuesta = await fetch('https://graph.facebook.com/' + version + '/' + numeroId + '/messages', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(mensaje)
    });
    if (!respuesta.ok) {
      console.error('WhatsApp no aceptó el mensaje:', await respuesta.text());
      return 'error';
    }
    return 'enviado';
  } catch (e) {
    console.error('No se pudo conectar con WhatsApp:', e.message);
    return 'error';
  }
}


// ===== RESERVAR =====
// Devuelve { error } o { turno } ya guardado
function reservar(pedido) {
  const sucursal = sucursales.find(function (s) { return s.id === pedido.sucursal; });
  const servicio = servicios.find(function (s) { return s.id === pedido.servicio; });
  if (!sucursal || !servicio) return { error: 'Elegí sucursal y servicio.' };

  const lista = profesionalesPara(sucursal.id, servicio.id);
  const candidatas = pedido.profesional === 'cualquiera'
    ? lista
    : lista.filter(function (p) { return p.id === pedido.profesional; });
  if (candidatas.length === 0) return { error: 'Ese servicio no se hace con esa profesional en esta sucursal.' };

  const fecha = String(pedido.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoyComoTexto()) return { error: 'Elegí un día válido.' };
  if (!sucursal.dias.includes(new Date(fecha + 'T00:00').getDay())) return { error: sucursal.nombre + ' no atiende ese día.' };

  // El horario tiene que caer en la grilla y terminar antes del cierre
  const abre = aMinutos(sucursal.abre);
  const inicio = Number(pedido.inicio);
  const fin = inicio + servicio.duracion;
  if (!Number.isInteger(inicio) || inicio < abre || fin > aMinutos(sucursal.cierra) || (inicio - abre) % INTERVALO !== 0) {
    return { error: 'Elegí un horario válido.' };
  }

  const nombre = String(pedido.nombre || '').trim().slice(0, 100);
  const telefono = String(pedido.telefono || '').trim().slice(0, 30);
  if (!nombre) return { error: 'Completá tu nombre.' };
  if (soloDigitos(telefono).length < 8) return { error: 'Revisá el número de WhatsApp.' };

  const turnos = leerTurnos();

  // Que no se pise con otro turno de la misma profesional
  const libres = profesionalesLibres(candidatas, turnos, fecha, inicio, fin);
  if (libres.length === 0) return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };

  // Que la misma persona no tenga dos turnos a la vez
  const yaTieneOtro = turnos.some(function (t) {
    return soloDigitos(t.telefono) === soloDigitos(telefono) && t.fecha === fecha && seSuperponen(inicio, fin, t.inicio, t.fin);
  });
  if (yaTieneOtro) return { error: 'Ya tenés otro turno a esa hora. Elegí otro horario.' };

  const turno = {
    id: crypto.randomUUID(),
    sucursal: sucursal.id,
    servicio: servicio.id,
    profesional: libres[0].id,
    fecha: fecha,
    inicio: inicio,
    fin: fin,
    nombre: nombre,
    telefono: telefono,
    email: String(pedido.email || '').trim().slice(0, 100),
    comentarios: String(pedido.comentarios || '').trim().slice(0, 500),
    productos: limpiarProductos(pedido.productos),
    creado: new Date().toISOString()
  };
  turnos.push(turno);
  guardarTurnos(turnos);
  return { turno: turno };
}

// Turnos próximos de una persona, para elegir en cuál le entregamos los productos
function misTurnos(telefono) {
  const digitos = soloDigitos(telefono);
  if (digitos.length < 8) return [];
  return leerTurnos().filter(function (t) {
    return t.id && soloDigitos(t.telefono) === digitos && t.fecha >= hoyComoTexto();
  }).map(function (t) {
    return { id: t.id, sucursal: t.sucursal, servicio: t.servicio, fecha: t.fecha, inicio: t.inicio };
  });
}

// Suma productos a un turno ya reservado. Devuelve { error } o { turno }
function sumarProductosATurno(pedido) {
  const nuevos = limpiarProductos(pedido.productos);
  if (nuevos.length === 0) return { error: 'El carrito está vacío.' };

  const turnos = leerTurnos();
  const turno = turnos.find(function (t) { return t.id === pedido.id; });
  // Se pide el mismo teléfono del turno para que nadie toque turnos ajenos
  if (!turno || soloDigitos(turno.telefono) !== soloDigitos(pedido.telefono)) return { error: 'No encontramos ese turno.' };
  if (turno.fecha < hoyComoTexto()) return { error: 'Ese turno ya pasó.' };

  turno.productos = sumarProductos(turno.productos, nuevos);
  guardarTurnos(turnos);
  return { turno: turno };
}

// Lee el cuerpo JSON de un pedido (máximo 10 KB)
function leerCuerpo(req, alTerminar) {
  let cuerpo = '';
  req.on('data', function (parte) {
    cuerpo += parte;
    if (cuerpo.length > 10000) req.destroy();
  });
  req.on('end', function () {
    let datos = null;
    try {
      datos = JSON.parse(cuerpo);
    } catch (e) {
      // queda en null
    }
    alTerminar(datos);
  });
}


// ===== RESPUESTAS =====
function responderJSON(res, codigo, datos) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(datos));
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};
// Archivos que no se muestran nunca
const PRIVADOS = ['servidor.js', 'turnos.json'];

function servirArchivo(req, res) {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch (e) {
    res.writeHead(400);
    return res.end('Dirección inválida');
  }
  if (ruta === '/') ruta = '/index.html';
  const archivo = path.join(__dirname, ruta);
  const tipo = TIPOS[path.extname(archivo).toLowerCase()];

  if (!archivo.startsWith(__dirname + path.sep) || !tipo || PRIVADOS.includes(path.basename(archivo))) {
    res.writeHead(404);
    return res.end('No encontrado');
  }
  fs.readFile(archivo, function (error, contenido) {
    if (error) {
      res.writeHead(404);
      return res.end('No encontrado');
    }
    res.writeHead(200, { 'Content-Type': tipo });
    res.end(contenido);
  });
}

http.createServer(function (req, res) {
  const ruta = new URL(req.url, 'http://x').pathname;

  // La página pide qué horarios están tomados (sin datos personales)
  if (ruta === '/api/turnos' && req.method === 'GET') {
    const ocupados = leerTurnos().map(function (t) {
      return { sucursal: t.sucursal, profesional: t.profesional, fecha: t.fecha, inicio: t.inicio, fin: t.fin };
    });
    return responderJSON(res, 200, ocupados);
  }

  // La página manda un turno nuevo (con los productos del carrito, si hay)
  if (ruta === '/api/turnos' && req.method === 'POST') {
    return leerCuerpo(req, async function (pedido) {
      if (!pedido) return responderJSON(res, 400, { error: 'Pedido inválido.' });

      const resultado = reservar(pedido);
      if (resultado.error) return responderJSON(res, 409, { error: resultado.error });

      const whatsapp = await enviarWhatsApp(resultado.turno);
      responderJSON(res, 200, { profesional: resultado.turno.profesional, whatsapp: whatsapp });
    });
  }

  // La página busca los turnos de una persona por su WhatsApp
  if (ruta === '/api/mis-turnos' && req.method === 'GET') {
    const telefono = new URL(req.url, 'http://x').searchParams.get('telefono');
    return responderJSON(res, 200, misTurnos(telefono));
  }

  // La página suma el carrito a un turno que ya estaba reservado
  if (ruta === '/api/productos' && req.method === 'POST') {
    return leerCuerpo(req, async function (pedido) {
      if (!pedido) return responderJSON(res, 400, { error: 'Pedido inválido.' });

      const resultado = sumarProductosATurno(pedido);
      if (resultado.error) return responderJSON(res, 409, { error: resultado.error });

      const whatsapp = await enviarWhatsApp(resultado.turno);
      responderJSON(res, 200, { total: totalTurno(resultado.turno), whatsapp: whatsapp });
    });
  }

  servirArchivo(req, res);
}).listen(PUERTO, function () {
  console.log('Yours funcionando en http://localhost:' + PUERTO);
  if (!process.env.WHATSAPP_TOKEN) console.log('(WhatsApp sin configurar: los turnos se guardan pero no se manda el mensaje)');
});
