// Los datos del negocio (sucursales, servicios, profesionales) están en datos.js


// ===== TURNOS GUARDADOS =====
// Si la página se abre desde servidor.js, los turnos se guardan ahí y todas las personas
// comparten la misma agenda (y llega la confirmación por WhatsApp).
// Si se abre el index.html suelto, se guardan en el navegador (localStorage) solo para probar.
let modoServidor = false;
let turnos = [];

function leerTurnosLocales() {
  try {
    return JSON.parse(localStorage.getItem('turnos')) || [];
  } catch (e) {
    return [];
  }
}

function guardarTurnoLocal(turno) {
  const lista = leerTurnosLocales();
  lista.push(turno);
  try {
    localStorage.setItem('turnos', JSON.stringify(lista));
  } catch (e) {
    // Si el navegador no deja guardar, seguimos igual
  }
}

// Trae los turnos ya tomados (del servidor o del navegador)
async function cargarTurnos() {
  await servidorListo;
  if (modoServidor) {
    try {
      const respuesta = await fetch('api/turnos');
      if (respuesta.ok) turnos = await respuesta.json();
    } catch (e) {
      // Si falla la conexión dejamos los últimos que teníamos
    }
  } else {
    turnos = leerTurnosLocales();
  }
}

// Al abrir la página nos fijamos si hay servidor
async function detectarServidor() {
  if (location.protocol === 'file:') return;
  try {
    const respuesta = await fetch('api/turnos');
    modoServidor = respuesta.ok;
  } catch (e) {
    modoServidor = false;
  }
}


// ===== AYUDAS =====
function hoyComoTexto() {
  const hoy = new Date();
  hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
  return hoy.toISOString().slice(0, 10);
}

function nombresDeDias(dias) {
  const nombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return dias.map(function (d) { return nombres[d]; }).join(', ');
}

function primerNombre(nombreCompleto) {
  return nombreCompleto.split(' ')[0];
}

function nuevoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function buscarProducto(id) {
  return productos.find(function (p) { return p.id === id; });
}


// ===== ARMAMOS LAS TARJETAS =====
const listaServicios = document.getElementById('lista-servicios');
servicios.forEach(function (s) {
  const quienes = profesionales
    .filter(function (p) { return p.servicios.includes(s.id); })
    .map(function (p) { return primerNombre(p.nombre); });

  listaServicios.innerHTML +=
    '<article class="servicio">' +
      '<span class="pestana">' + s.categoria + '</span>' +
      '<h3>' + s.nombre + '</h3>' +
      '<p>' + s.descripcion + '</p>' +
      '<p class="profes">Con ' + quienes.join(', ') + '</p>' +
      '<p class="datos"><span>' + s.duracion + ' min</span><span>' + formatoPrecio(s.precio) + '</span></p>' +
    '</article>';
});

const listaSucursales = document.getElementById('lista-sucursales');
sucursales.forEach(function (s) {
  listaSucursales.innerHTML +=
    '<article class="sucursal">' +
      '<h3>' + s.nombre + '</h3>' +
      '<p>' + s.direccion + '</p>' +
      '<p>' + nombresDeDias(s.dias) + ' · ' + s.abre + ' a ' + s.cierra + ' h</p>' +
      '<a href="#turnos" class="boton boton-chico" data-sucursal="' + s.id + '">Turno acá</a>' +
    '</article>';
});


// ===== TIENDA =====
const listaProductos = document.getElementById('lista-productos');
const filtrosTienda = document.getElementById('filtros-tienda');

// Un botón de filtro por cada categoría, más "Todo"
const categoriasTienda = ['Todo'].concat(productos
  .map(function (p) { return p.categoria; })
  .filter(function (c, i, lista) { return lista.indexOf(c) === i; }));

categoriasTienda.forEach(function (c, i) {
  filtrosTienda.innerHTML +=
    '<button type="button" class="filtro' + (i === 0 ? ' activo' : '') + '" data-categoria="' + c + '">' + c + '</button>';
});

productos.forEach(function (p) {
  listaProductos.innerHTML +=
    '<article class="producto" data-categoria="' + p.categoria + '">' +
      '<div class="producto-foto" style="background-image: url(img/productos/' + p.id + '.jpg), var(--degrade-producto)"></div>' +
      '<span class="producto-categoria">' + p.categoria + '</span>' +
      '<h3>' + p.nombre + '</h3>' +
      '<p>' + p.descripcion + '</p>' +
      '<div class="producto-pie">' +
        '<strong>' + formatoPrecio(p.precio) + '</strong>' +
        '<button type="button" class="boton boton-chico" data-agregar="' + p.id + '">Agregar</button>' +
      '</div>' +
    '</article>';
});

filtrosTienda.addEventListener('click', function (evento) {
  const boton = evento.target.closest('.filtro');
  if (!boton) return;
  const categoria = boton.dataset.categoria;
  filtrosTienda.querySelectorAll('.filtro').forEach(function (b) { b.classList.toggle('activo', b === boton); });
  listaProductos.querySelectorAll('.producto').forEach(function (tarjeta) {
    tarjeta.classList.toggle('oculto', categoria !== 'Todo' && tarjeta.dataset.categoria !== categoria);
  });
});

listaProductos.addEventListener('click', function (evento) {
  const boton = evento.target.closest('[data-agregar]');
  if (!boton) return;
  cambiarCantidad(boton.dataset.agregar, 1);
  boton.textContent = '¡Agregado!';
  setTimeout(function () { boton.textContent = 'Agregar'; }, 1200);
});


// ===== CARRITO =====
// Se guarda en el navegador para que no se pierda si se recarga la página
let carrito = leerCarrito();

function leerCarrito() {
  try {
    return limpiarProductos(JSON.parse(localStorage.getItem('carrito')));
  } catch (e) {
    return [];
  }
}

function guardarCarrito() {
  try {
    localStorage.setItem('carrito', JSON.stringify(carrito));
  } catch (e) {
    // Si el navegador no deja guardar, el carrito dura hasta que se cierre la página
  }
  dibujarCarrito();
  dibujarResumen();
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(function (i) { return i.id === id; });
  if (item) {
    item.cantidad = Math.min(20, item.cantidad + cambio);
    if (item.cantidad <= 0) carrito = carrito.filter(function (i) { return i.id !== id; });
  } else if (cambio > 0) {
    carrito.push({ id: id, cantidad: 1 });
  }
  guardarCarrito();
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
}

const panelCarrito = document.getElementById('carrito');
const fondoCarrito = document.getElementById('carrito-fondo');
const itemsCarrito = document.getElementById('carrito-items');
const accionesCarrito = document.getElementById('carrito-acciones');
const mensajeCarrito = document.getElementById('carrito-mensaje');
const cajaMisTurnos = document.getElementById('mis-turnos');

function dibujarCarrito() {
  document.getElementById('contador-carrito').textContent = cantidadProductos(carrito);

  if (carrito.length === 0) {
    itemsCarrito.innerHTML = '<p class="carrito-vacio">Todavía no sumaste productos. <a href="#tienda" data-cerrar-carrito>Ver la tienda</a></p>';
    accionesCarrito.classList.add('oculto');
    return;
  }

  let filas = '';
  carrito.forEach(function (item) {
    const p = buscarProducto(item.id);
    filas +=
      '<div class="carrito-item">' +
        '<div><strong>' + p.nombre + '</strong><small>' + formatoPrecio(p.precio) + ' c/u</small></div>' +
        '<div class="cantidad">' +
          '<button type="button" data-cambio="-1" data-id="' + p.id + '" aria-label="Sacar uno">−</button>' +
          '<span>' + item.cantidad + '</span>' +
          '<button type="button" data-cambio="1" data-id="' + p.id + '" aria-label="Sumar uno">+</button>' +
        '</div>' +
      '</div>';
  });
  itemsCarrito.innerHTML = filas;
  accionesCarrito.classList.remove('oculto');
  document.getElementById('carrito-total').textContent = 'Total productos: ' + formatoPrecio(totalProductos(carrito));
}

itemsCarrito.addEventListener('click', function (evento) {
  const boton = evento.target.closest('[data-cambio]');
  if (boton) cambiarCantidad(boton.dataset.id, Number(boton.dataset.cambio));
});

function abrirCarrito() {
  mensajeCarrito.textContent = '';
  panelCarrito.classList.remove('oculto');
  fondoCarrito.classList.remove('oculto');
}

function cerrarCarrito() {
  panelCarrito.classList.add('oculto');
  fondoCarrito.classList.add('oculto');
}

document.getElementById('abrir-carrito').addEventListener('click', abrirCarrito);
document.getElementById('cerrar-carrito').addEventListener('click', cerrarCarrito);
document.getElementById('carrito-turno-nuevo').addEventListener('click', cerrarCarrito);
fondoCarrito.addEventListener('click', cerrarCarrito);
panelCarrito.addEventListener('click', function (evento) {
  if (evento.target.closest('[data-cerrar-carrito]')) cerrarCarrito();
});
document.addEventListener('keydown', function (evento) {
  if (evento.key === 'Escape') cerrarCarrito();
});

// --- Sumar el carrito a un turno que ya está reservado ---
function textoTurno(t) {
  const servicio = servicios.find(function (s) { return s.id === t.servicio; });
  const sucursal = sucursales.find(function (s) { return s.id === t.sucursal; });
  return servicio.nombre + ' · ' + fechaLinda(t.fecha) + ' ' + aHora(t.inicio) + ' h · ' + sucursal.nombre;
}

async function buscarMisTurnos(telefono) {
  await servidorListo;
  if (modoServidor) {
    try {
      const respuesta = await fetch('api/mis-turnos?telefono=' + encodeURIComponent(telefono));
      return await respuesta.json();
    } catch (e) {
      return { error: 'No pudimos conectarnos. Probá de nuevo.' };
    }
  }
  const digitos = telefono.replace(/\D/g, '');
  return leerTurnosLocales().filter(function (t) {
    return t.id && t.telefono.replace(/\D/g, '') === digitos && t.fecha >= hoyComoTexto();
  });
}

document.getElementById('buscar-turnos').addEventListener('click', async function () {
  const telefono = document.getElementById('buscar-telefono').value.trim();
  mensajeCarrito.textContent = '';
  if (telefono.replace(/\D/g, '').length < 8) {
    cajaMisTurnos.innerHTML = '<p class="ayuda">Revisá el número de WhatsApp.</p>';
    return;
  }

  const resultado = await buscarMisTurnos(telefono);
  if (resultado.error) {
    cajaMisTurnos.innerHTML = '<p class="ayuda">' + resultado.error + '</p>';
    return;
  }
  if (resultado.length === 0) {
    cajaMisTurnos.innerHTML = '<p class="ayuda">No encontramos turnos próximos con ese número. Sacá uno nuevo.</p>';
    return;
  }

  let botones = '<p class="ayuda">¿En cuál te los entregamos?</p>';
  resultado.forEach(function (t) {
    botones += '<button type="button" class="opcion" data-turno="' + t.id + '">' + textoTurno(t) + '</button>';
  });
  cajaMisTurnos.innerHTML = botones;
});

async function sumarAlTurnoExistente(id, telefono) {
  await servidorListo;
  if (modoServidor) {
    try {
      const respuesta = await fetch('api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, telefono: telefono, productos: carrito })
      });
      return await respuesta.json();
    } catch (e) {
      return { error: 'No pudimos conectarnos. Probá de nuevo.' };
    }
  }
  const lista = leerTurnosLocales();
  const turno = lista.find(function (t) { return t.id === id; });
  if (!turno) return { error: 'No encontramos ese turno.' };
  turno.productos = sumarProductos(turno.productos, carrito);
  try {
    localStorage.setItem('turnos', JSON.stringify(lista));
  } catch (e) {
    // Si el navegador no deja guardar, seguimos igual
  }
  return { total: totalTurno(turno), whatsapp: 'sin-servidor' };
}

cajaMisTurnos.addEventListener('click', async function (evento) {
  const boton = evento.target.closest('[data-turno]');
  if (!boton) return;
  const telefono = document.getElementById('buscar-telefono').value.trim();
  const resultado = await sumarAlTurnoExistente(boton.dataset.turno, telefono);

  if (resultado.error) {
    mensajeCarrito.textContent = resultado.error;
    return;
  }
  const textoBoton = boton.textContent;
  vaciarCarrito();
  cajaMisTurnos.innerHTML = '';
  mensajeCarrito.textContent = '¡Listo! Te los entregamos en tu turno (' + textoBoton + '). Total a pagar ese día: ' +
    formatoPrecio(resultado.total) + '.' +
    (resultado.whatsapp === 'enviado' ? ' Te mandamos el detalle por WhatsApp.' : '');
});


// ===== FORMULARIO DE TURNOS =====
const form = document.getElementById('form-reserva');
const opcionesSucursal = document.getElementById('opciones-sucursal');
const selectServicio = document.getElementById('servicio');
const opcionesProfesional = document.getElementById('opciones-profesional');
const ayudaProfesional = document.getElementById('ayuda-profesional');
const inputFecha = document.getElementById('fecha');
const cajaHorarios = document.getElementById('horarios');
const ayudaHorarios = document.getElementById('ayuda-horarios');
const textoError = document.getElementById('error');
const botonConfirmar = document.getElementById('boton-confirmar');
const confirmacion = document.getElementById('confirmacion');

// Lo que la persona va eligiendo
let sucursalElegida = null;
let profesionalElegido = 'cualquiera'; // id de la profesional, o "cualquiera"
let horaElegida = null;

// 1. Botones de sucursal
sucursales.forEach(function (s) {
  opcionesSucursal.innerHTML +=
    '<button type="button" class="opcion" data-id="' + s.id + '">' +
      '<strong>' + s.nombre + '</strong><small>' + s.direccion + '</small>' +
    '</button>';
});

function elegirSucursal(id) {
  sucursalElegida = sucursales.find(function (s) { return s.id === id; });
  opcionesSucursal.querySelectorAll('.opcion').forEach(function (boton) {
    boton.classList.toggle('activo', boton.dataset.id === id);
  });
  mostrarProfesionales();
}

opcionesSucursal.addEventListener('click', function (evento) {
  const boton = evento.target.closest('.opcion');
  if (boton) elegirSucursal(boton.dataset.id);
});

// Los botones "Turno acá" de cada sucursal ya la dejan elegida
document.querySelectorAll('[data-sucursal]').forEach(function (link) {
  link.addEventListener('click', function () {
    elegirSucursal(link.dataset.sucursal);
  });
});

// 2. Lista de servicios
servicios.forEach(function (s) {
  selectServicio.innerHTML +=
    '<option value="' + s.id + '">' + s.nombre + ' — ' + s.duracion + ' min — ' + formatoPrecio(s.precio) + '</option>';
});
selectServicio.addEventListener('change', mostrarProfesionales);
selectServicio.addEventListener('change', dibujarResumen);

// Resumen de lo que se paga en el turno: servicio + productos del carrito
const resumenPago = document.getElementById('resumen-pago');

function dibujarResumen() {
  const servicio = servicios.find(function (s) { return s.id === selectServicio.value; });
  let filas = '';

  if (servicio) {
    filas += '<p><span>' + servicio.nombre + '</span><span>' + formatoPrecio(servicio.precio) + '</span></p>';
  }
  carrito.forEach(function (item) {
    const p = buscarProducto(item.id);
    filas += '<p><span>' + p.nombre + ' x' + item.cantidad + '</span><span>' + formatoPrecio(p.precio * item.cantidad) + '</span></p>';
  });

  const productosTexto = carrito.length
    ? 'Los productos te los entregamos en este turno. <button type="button" class="link" id="editar-carrito">Editar carrito</button>'
    : '¿Querés llevarte algo para casa? <a href="#tienda">Mirá la tienda</a> y te lo entregamos en el turno.';

  const total = (servicio ? servicio.precio : 0) + totalProductos(carrito);
  resumenPago.innerHTML =
    '<h4>A pagar en el turno</h4>' +
    (filas || '<p class="ayuda">Elegí un servicio para ver el total.</p>') +
    (filas ? '<p class="resumen-total"><span>Total</span><span>' + formatoPrecio(total) + '</span></p>' : '') +
    '<p class="ayuda">' + productosTexto + '</p>';
}

resumenPago.addEventListener('click', function (evento) {
  if (evento.target.id === 'editar-carrito') abrirCarrito();
});

// 3. Profesionales que hacen ese servicio en esa sucursal
function mostrarProfesionales() {
  opcionesProfesional.innerHTML = '';
  const servicio = servicios.find(function (s) { return s.id === selectServicio.value; });

  if (!sucursalElegida || !servicio) {
    ayudaProfesional.textContent = 'Primero elegí sucursal y servicio.';
    profesionalElegido = 'cualquiera';
    mostrarHorarios();
    return;
  }

  const lista = profesionalesPara(sucursalElegida.id, servicio.id);
  if (lista.length === 0) {
    ayudaProfesional.textContent = servicio.nombre + ' no se hace en ' + sucursalElegida.nombre + '. Probá con otra sucursal.';
    profesionalElegido = 'cualquiera';
    mostrarHorarios();
    return;
  }

  // Si la que estaba elegida no atiende acá, volvemos a "sin preferencia"
  if (!lista.some(function (p) { return p.id === profesionalElegido; })) {
    profesionalElegido = 'cualquiera';
  }

  ayudaProfesional.textContent = 'Elegí con quién atenderte, o dejá que te asignemos a quien tenga lugar.';
  let botones =
    '<button type="button" class="opcion" data-id="cualquiera">' +
      '<strong>Sin preferencia</strong><small>Quien tenga lugar</small>' +
    '</button>';
  lista.forEach(function (p) {
    botones +=
      '<button type="button" class="opcion" data-id="' + p.id + '">' +
        '<strong>' + p.nombre + '</strong><small>' + p.especialidad + '</small>' +
      '</button>';
  });
  opcionesProfesional.innerHTML = botones;
  marcarProfesional();
  mostrarHorarios();
}

function marcarProfesional() {
  opcionesProfesional.querySelectorAll('.opcion').forEach(function (boton) {
    boton.classList.toggle('activo', boton.dataset.id === profesionalElegido);
  });
}

opcionesProfesional.addEventListener('click', function (evento) {
  const boton = evento.target.closest('.opcion');
  if (!boton) return;
  profesionalElegido = boton.dataset.id;
  marcarProfesional();
  mostrarHorarios();
});

// Profesionales que pueden tomar el turno según lo elegido
function candidatas(servicio) {
  const lista = profesionalesPara(sucursalElegida.id, servicio.id);
  if (profesionalElegido === 'cualquiera') return lista;
  return lista.filter(function (p) { return p.id === profesionalElegido; });
}

// 4. Fecha: no se puede elegir un día pasado
inputFecha.min = hoyComoTexto();
inputFecha.addEventListener('change', mostrarHorarios);

// Arma los botones de horario según sucursal, servicio, profesional y día
async function mostrarHorarios() {
  horaElegida = null;

  const servicio = servicios.find(function (s) { return s.id === selectServicio.value; });
  const fecha = inputFecha.value;

  if (!sucursalElegida || !servicio || !fecha) {
    cajaHorarios.innerHTML = '';
    ayudaHorarios.textContent = 'Primero elegí sucursal, servicio y día.';
    return;
  }

  const lista = candidatas(servicio);
  if (lista.length === 0) {
    cajaHorarios.innerHTML = '';
    ayudaHorarios.textContent = 'No hay profesionales para ese servicio en esta sucursal.';
    return;
  }

  // ¿La sucursal abre ese día?
  const diaSemana = new Date(fecha + 'T00:00').getDay();
  if (!sucursalElegida.dias.includes(diaSemana)) {
    cajaHorarios.innerHTML = '';
    ayudaHorarios.textContent = sucursalElegida.nombre + ' no atiende ese día. Abre: ' + nombresDeDias(sucursalElegida.dias) + '.';
    return;
  }

  // Traemos la agenda actualizada antes de mostrar qué está libre
  await cargarTurnos();

  // Si es hoy, no mostramos horarios que ya pasaron
  const ahora = new Date();
  const minutosAhora = fecha === hoyComoTexto() ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

  const abre = aMinutos(sucursalElegida.abre);
  const cierra = aMinutos(sucursalElegida.cierra);
  let hayLibres = false;
  let botones = '';

  // El turno tiene que terminar antes de que cierre la sucursal
  for (let inicio = abre; inicio + servicio.duracion <= cierra; inicio += INTERVALO) {
    const fin = inicio + servicio.duracion;

    // Está libre si al menos una de las profesionales posibles no tiene nada en ese rango
    const hayQuien = profesionalesLibres(lista, turnos, fecha, inicio, fin).length > 0;
    const yaPaso = inicio <= minutosAhora;
    const libre = hayQuien && !yaPaso;
    if (libre) hayLibres = true;

    botones +=
      '<button type="button" class="hora" data-inicio="' + inicio + '"' + (libre ? '' : ' disabled') + '>' +
        aHora(inicio) +
      '</button>';
  }
  cajaHorarios.innerHTML = botones;

  ayudaHorarios.textContent = hayLibres
    ? 'Tocá el horario que prefieras.'
    : 'No quedan horarios libres ese día. Probá con otra fecha o profesional.';
}

cajaHorarios.addEventListener('click', function (evento) {
  const boton = evento.target.closest('.hora');
  if (!boton || boton.disabled) return;
  horaElegida = Number(boton.dataset.inicio);
  cajaHorarios.querySelectorAll('.hora').forEach(function (b) {
    b.classList.toggle('activo', b === boton);
  });
});

// Reserva sin servidor: revisamos de nuevo que no se pise con nada y guardamos en el navegador
function reservarLocal(turno, servicio) {
  turnos = leerTurnosLocales();
  const libres = profesionalesLibres(candidatas(servicio), turnos, turno.fecha, turno.inicio, turno.fin);
  if (libres.length === 0) {
    return { error: 'Ese horario se acaba de ocupar. Elegí otro.' };
  }

  const telefonoDigitos = turno.telefono.replace(/\D/g, '');
  const yaTieneOtro = turnos.some(function (t) {
    return t.telefono && t.telefono.replace(/\D/g, '') === telefonoDigitos &&
      t.fecha === turno.fecha && seSuperponen(turno.inicio, turno.fin, t.inicio, t.fin);
  });
  if (yaTieneOtro) {
    return { error: 'Ya tenés otro turno a esa hora. Elegí otro horario.' };
  }

  turno.id = nuevoId();
  turno.profesional = libres[0].id;
  guardarTurnoLocal(turno);
  return { profesional: turno.profesional, whatsapp: 'sin-servidor' };
}

// Reserva con servidor: él revisa la agenda de todos y manda el WhatsApp
async function reservarEnServidor(turno) {
  try {
    const respuesta = await fetch('api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turno)
    });
    return await respuesta.json();
  } catch (e) {
    return { error: 'No pudimos conectarnos. Revisá tu internet y probá de nuevo.' };
  }
}

// 5. Confirmar
form.addEventListener('submit', async function (evento) {
  evento.preventDefault();

  const servicio = servicios.find(function (s) { return s.id === selectServicio.value; });
  const nombre = document.getElementById('nombre').value.trim();
  const telefono = document.getElementById('telefono').value.trim();
  const email = document.getElementById('email').value.trim();
  const comentarios = document.getElementById('comentarios').value.trim();

  // Revisamos que no falte nada
  let falta = '';
  if (!sucursalElegida) falta = 'Elegí una sucursal.';
  else if (!servicio) falta = 'Elegí un servicio.';
  else if (candidatas(servicio).length === 0) falta = 'Ese servicio no se hace en esta sucursal.';
  else if (!inputFecha.value) falta = 'Elegí un día.';
  else if (horaElegida === null) falta = 'Elegí un horario.';
  else if (!nombre) falta = 'Completá tu nombre.';
  else if (telefono.replace(/\D/g, '').length < 8) falta = 'Revisá el número de WhatsApp.';

  textoError.textContent = falta;
  if (falta) return;

  const turno = {
    sucursal: sucursalElegida.id,
    servicio: servicio.id,
    profesional: profesionalElegido,
    fecha: inputFecha.value,
    inicio: horaElegida,
    fin: horaElegida + servicio.duracion,
    nombre: nombre,
    telefono: telefono,
    email: email,
    comentarios: comentarios,
    productos: carrito
  };

  botonConfirmar.disabled = true;
  await servidorListo;
  const resultado = modoServidor ? await reservarEnServidor(turno) : reservarLocal(turno, servicio);
  botonConfirmar.disabled = false;

  if (resultado.error) {
    textoError.textContent = resultado.error;
    mostrarHorarios(); // refrescamos para que se vea lo que se ocupó
    return;
  }

  // Mostramos el resumen
  const profesional = profesionales.find(function (p) { return p.id === resultado.profesional; });
  const resumen = servicio.nombre + ' con ' + profesional.nombre + ' el ' + fechaLinda(turno.fecha) +
    ' a las ' + aHora(turno.inicio) + ' h en ' + sucursalElegida.nombre + ' (' + sucursalElegida.direccion + ').';

  document.getElementById('detalle-turno').textContent = nombre + ', te esperamos: ' + resumen;

  const cantidad = cantidadProductos(turno.productos);
  document.getElementById('total-turno').textContent = 'Total a pagar en el turno: ' + formatoPrecio(totalTurno(turno)) +
    (cantidad ? ' (incluye ' + cantidad + (cantidad === 1 ? ' producto' : ' productos') + ' que te entregamos ese día)' : '');
  vaciarCarrito();

  const estadoWhatsapp = document.getElementById('estado-whatsapp');
  const linkWhatsapp = document.getElementById('link-whatsapp');
  if (resultado.whatsapp === 'enviado') {
    estadoWhatsapp.textContent = 'Te mandamos la confirmación por WhatsApp al ' + telefono + '.';
    linkWhatsapp.classList.add('oculto');
  } else {
    // Si no se pudo mandar solo, dejamos el botón para avisarle a la sucursal
    estadoWhatsapp.textContent = 'Avisale a la sucursal por WhatsApp para que te confirmen.';
    const listaProductosTexto = turno.productos.map(function (item) {
      return buscarProducto(item.id).nombre + ' x' + item.cantidad;
    }).join(', ');
    const mensaje = 'Hola! Soy ' + nombre + ' y reservé un turno: ' + resumen +
      (listaProductosTexto ? ' Productos para retirar: ' + listaProductosTexto + '.' : '') +
      ' Total: ' + formatoPrecio(totalTurno(turno)) + '.' +
      (comentarios ? ' Comentarios: ' + comentarios : '');
    linkWhatsapp.href = 'https://wa.me/' + sucursalElegida.whatsapp + '?text=' + encodeURIComponent(mensaje);
    linkWhatsapp.classList.remove('oculto');
  }

  form.classList.add('oculto');
  confirmacion.classList.remove('oculto');
  confirmacion.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

// Volver a empezar
document.getElementById('otro-turno').addEventListener('click', function () {
  form.reset();
  sucursalElegida = null;
  profesionalElegido = 'cualquiera';
  textoError.textContent = '';
  opcionesSucursal.querySelectorAll('.opcion').forEach(function (b) { b.classList.remove('activo'); });
  mostrarProfesionales();
  dibujarResumen();
  confirmacion.classList.add('oculto');
  form.classList.remove('oculto');
});

const servidorListo = detectarServidor();
dibujarCarrito();
dibujarResumen();
