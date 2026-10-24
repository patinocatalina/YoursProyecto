// ===== DATOS DEL NEGOCIO =====
// Cambiá estos datos por los reales. Todo lo demás de la página se arma solo.
// Este archivo lo usan tanto la página (script.js) como el servidor (servidor.js).

// dias: 0 = domingo, 1 = lunes ... 6 = sábado
// whatsapp: número con código de país, sin "+" ni espacios (ej: 5491123456789)
const sucursales = [
  { id: 'centro',   nombre: 'Sucursal Centro',   direccion: 'Av. Siempreviva 123',  whatsapp: '5491100000001', dias: [1, 2, 3, 4, 5, 6], abre: '09:00', cierra: '19:00' },
  { id: 'norte',    nombre: 'Sucursal Norte',    direccion: 'Calle Los Álamos 456', whatsapp: '5491100000002', dias: [1, 2, 3, 4, 5],    abre: '10:00', cierra: '20:00' },
  { id: 'sur',      nombre: 'Sucursal Sur',      direccion: 'Av. del Parque 789',   whatsapp: '5491100000003', dias: [2, 3, 4, 5, 6],    abre: '09:00', cierra: '18:00' }
];

// duracion en minutos. "categoria" es la pestañita que aparece arriba de cada tarjeta
const servicios = [
  { id: 'limpieza',   categoria: 'Facial',   nombre: 'Limpieza facial',     descripcion: 'Limpieza profunda, extracción e hidratación.', duracion: 60, precio: 25000 },
  { id: 'cejas',      categoria: 'Mirada',   nombre: 'Perfilado de cejas',  descripcion: 'Diseño y perfilado según tu rostro.',          duracion: 30, precio: 9000 },
  { id: 'pestanas',   categoria: 'Mirada',   nombre: 'Lifting de pestañas', descripcion: 'Curvatura natural que dura semanas.',          duracion: 60, precio: 18000 },
  { id: 'manos',      categoria: 'Manos',    nombre: 'Manicura semipermanente', descripcion: 'Esmaltado de larga duración.',             duracion: 60, precio: 15000 },
  { id: 'masaje',     categoria: 'Corporal', nombre: 'Masaje descontracturante', descripcion: 'Espalda, cuello y hombros.',              duracion: 60, precio: 22000 },
  { id: 'depilacion', categoria: 'Corporal', nombre: 'Depilación láser',    descripcion: 'Por zona. Consultá el plan por sesiones.',     duracion: 30, precio: 20000 }
];

// Quién hace cada servicio y en qué sucursales atiende.
// Una misma profesional puede estar en varias sucursales: nunca se le dan dos turnos a la misma hora.
const profesionales = [
  { id: 'martina',   nombre: 'Martina Gómez',   especialidad: 'Cosmiatra',        sucursales: ['centro', 'norte'],       servicios: ['limpieza', 'depilacion'] },
  { id: 'agustina',  nombre: 'Agustina Paz',    especialidad: 'Cosmiatra',        sucursales: ['sur'],                   servicios: ['limpieza'] },
  { id: 'julieta',   nombre: 'Julieta Ríos',    especialidad: 'Cejas y pestañas', sucursales: ['centro'],                servicios: ['cejas', 'pestanas'] },
  { id: 'valentina', nombre: 'Valentina Sosa',  especialidad: 'Mirada y manos',   sucursales: ['norte', 'sur'],          servicios: ['cejas', 'pestanas', 'manos'] },
  { id: 'carla',     nombre: 'Carla Benítez',   especialidad: 'Manicura',         sucursales: ['centro', 'sur'],         servicios: ['manos'] },
  { id: 'romina',    nombre: 'Romina Díaz',     especialidad: 'Masajista',        sucursales: ['centro', 'sur'],         servicios: ['masaje'] },
  { id: 'lucas',     nombre: 'Lucas Ferreyra',  especialidad: 'Masajes y láser',  sucursales: ['norte', 'sur'],          servicios: ['masaje', 'depilacion'] }
];

// Productos de la tienda. Se pagan y se entregan en el turno.
// Las fotos van en img/productos/ con el id como nombre (ej: img/productos/vela-lavanda.jpg).
// Si la foto no está, se ve un degradé en su lugar.
const productos = [
  { id: 'mascarilla-arcilla', categoria: 'Mascarillas', nombre: 'Mascarilla de arcilla rosa',       descripcion: 'Purifica y suaviza. 100 g.',                    precio: 12000 },
  { id: 'parches-hidrogel',   categoria: 'Mascarillas', nombre: 'Parches de hidrogel para ojeras',  descripcion: 'Descongestionan y refrescan. Pack x 5 pares.',  precio: 9500 },
  { id: 'crema-noche',        categoria: 'Cremas',      nombre: 'Crema de noche reparadora',        descripcion: 'Retinol suave y ceramidas. 50 ml.',             precio: 21000 },
  { id: 'crema-manos',        categoria: 'Cremas',      nombre: 'Crema de manos de karité',         descripcion: 'Nutre sin dejar sensación grasa. 75 ml.',      precio: 7500 },
  { id: 'gel-hialuronico',    categoria: 'Hidratantes', nombre: 'Gel hidratante con hialurónico',   descripcion: 'Textura liviana para todo tipo de piel. 50 ml.', precio: 16500 },
  { id: 'bruma-rosas',        categoria: 'Hidratantes', nombre: 'Bruma de agua de rosas',           descripcion: 'Refresca durante el día. 100 ml.',              precio: 8900 },
  { id: 'vela-vainilla',      categoria: 'Velas',       nombre: 'Vela de soja vainilla y ámbar',    descripcion: '40 horas de duración. Mecha de algodón.',       precio: 14000 },
  { id: 'vela-lavanda',       categoria: 'Velas',       nombre: 'Vela de soja lavanda',             descripcion: 'Ideal para relajarte antes de dormir.',         precio: 14000 },
  { id: 'serum-vitamina-c',   categoria: 'Skincare',    nombre: 'Sérum de vitamina C',              descripcion: 'Ilumina y empareja el tono. 30 ml.',            precio: 19500 },
  { id: 'gel-limpiador',      categoria: 'Skincare',    nombre: 'Gel limpiador suave',              descripcion: 'Limpia sin resecar. 150 ml.',                   precio: 11000 },
  { id: 'protector-solar',    categoria: 'Skincare',    nombre: 'Protector solar FPS 50',           descripcion: 'Toque seco, sin rastro blanco. 50 ml.',         precio: 17000 }
];

// Cada cuántos minutos arranca un turno posible
const INTERVALO = 30;


// ===== REGLAS DE LA AGENDA =====
function aMinutos(hora) {
  const partes = hora.split(':');
  return Number(partes[0]) * 60 + Number(partes[1]);
}

function aHora(minutos) {
  const h = String(Math.floor(minutos / 60)).padStart(2, '0');
  const m = String(minutos % 60).padStart(2, '0');
  return h + ':' + m;
}

function fechaLinda(fecha) {
  return new Date(fecha + 'T00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

// Profesionales que hacen ese servicio en esa sucursal
function profesionalesPara(sucursalId, servicioId) {
  return profesionales.filter(function (p) {
    return p.sucursales.includes(sucursalId) && p.servicios.includes(servicioId);
  });
}

// Dos turnos se pisan si uno empieza antes de que termine el otro
function seSuperponen(inicioA, finA, inicioB, finB) {
  return inicioA < finB && finA > inicioB;
}

// De una lista de profesionales, las que no tienen nada reservado en ese rango
// (se mira en todas las sucursales, porque nadie puede estar en dos lugares a la vez)
function profesionalesLibres(lista, turnos, fecha, inicio, fin) {
  return lista.filter(function (p) {
    return !turnos.some(function (t) {
      return t.profesional === p.id && t.fecha === fecha && seSuperponen(inicio, fin, t.inicio, t.fin);
    });
  });
}



// ===== PRODUCTOS Y TOTAL A PAGAR =====
function formatoPrecio(numero) {
  return '$ ' + numero.toLocaleString('es-AR');
}

// Deja solo productos que existen, con cantidades enteras entre 1 y 20
function limpiarProductos(lista) {
  if (!Array.isArray(lista)) return [];
  return lista.filter(function (item) {
    return item && productos.some(function (p) { return p.id === item.id; }) &&
      Number.isInteger(item.cantidad) && item.cantidad >= 1 && item.cantidad <= 20;
  }).map(function (item) {
    return { id: item.id, cantidad: item.cantidad };
  });
}

// Junta dos listas de productos sumando las cantidades de los repetidos
function sumarProductos(actuales, nuevos) {
  const resultado = (actuales || []).map(function (item) { return { id: item.id, cantidad: item.cantidad }; });
  (nuevos || []).forEach(function (nuevo) {
    const existente = resultado.find(function (item) { return item.id === nuevo.id; });
    if (existente) existente.cantidad = Math.min(20, existente.cantidad + nuevo.cantidad);
    else resultado.push({ id: nuevo.id, cantidad: nuevo.cantidad });
  });
  return resultado;
}

function totalProductos(lista) {
  return (lista || []).reduce(function (suma, item) {
    const producto = productos.find(function (p) { return p.id === item.id; });
    return producto ? suma + producto.precio * item.cantidad : suma;
  }, 0);
}

function cantidadProductos(lista) {
  return (lista || []).reduce(function (suma, item) { return suma + item.cantidad; }, 0);
}

// Lo que se paga en el turno: el servicio más los productos que se entregan ahí
function totalTurno(turno) {
  const servicio = servicios.find(function (s) { return s.id === turno.servicio; });
  return (servicio ? servicio.precio : 0) + totalProductos(turno.productos);
}

// Para que el servidor (Node) pueda usar estos mismos datos
if (typeof module !== 'undefined') {
  module.exports = {
    sucursales, servicios, profesionales, productos, INTERVALO,
    aMinutos, aHora, fechaLinda, profesionalesPara, seSuperponen, profesionalesLibres,
    formatoPrecio, limpiarProductos, sumarProductos, totalProductos, cantidadProductos, totalTurno
  };
}
