const board = document.getElementById("board");
const size = 10;
const cells = [];
let juegoIniciado = false;
let totalMinas = null;
let movimientos = 0;
const nextMoveBtn = document.getElementById("nextMoveBtn");
const startBtn = document.getElementById("startBtn");
const messageDiv = document.getElementById("message");
const mineCountInput = document.getElementById("mineCount");
const minasRestantesSpan = document.getElementById("minasRestantes");
const movimientosSpan = document.getElementById("movimientos");

// Inicializar el tablero
for (let row = 0; row < size; row++) {
  for (let col = 0; col < size; col++) {
    const cell = document.createElement("div");
    cell.classList.add("cell");
    cell.dataset.row = row;
    cell.dataset.col = col;
    cell.addEventListener("click", () => revealCell(row, col));
    board.appendChild(cell);
    cells.push(cell);
  }
}

// Revelar celda 
function revealCell(row, col) {
  const cell = cells[row * size + col];
  if (cell.classList.contains("revealed")) return;

  let value = prompt(`Ingresa el valor para la celda (${row+1}, ${col+1})\nValores válidos:\n - Números del 0 al 8\n - M para mina`);
  if (value === null) return;

  value = value.trim().toUpperCase();
  const isValid = /^[0-8M]$/.test(value);

  if (!isValid) {
    alert("Valor inválido. Solo se permiten números del 0 al 8 o la letra M.");
    return;
  }

  // Validar coherencia con celdas vecinas reveladas
  if (/^[1-8]$/.test(value)) {
    const vecinos = getVecinos(row, col);
    let minasVecinas = 0;
    
    vecinos.forEach(({row: r, col: c}) => {
      const vecino = cells[r * size + c];
      if (vecino.classList.contains("mina-marcada") || vecino.textContent === "🚩") {
        minasVecinas++;
      }
    });
    
    if (parseInt(value) < minasVecinas) {
      alert(`Error: El valor ${value} es menor que las minas marcadas alrededor (${minasVecinas})`);
      return;
    }
  }

  cell.textContent = value;
  cell.classList.add("revealed");
  cell.dataset.value = value;

  if (value === "M") {
    mostrarMensajeDerrota();
  } else {
    registrarMovimiento();
  }
}

// Iniciar partida (sugerencia inicial)
startBtn.addEventListener("click", () => {
  if (juegoIniciado) {
    alert("Usa el botón 'Siguiente movimiento' para continuar.");
    return;
  }

  // Validar entrada de minas si se proporcionó
  if (mineCountInput.value) {
    totalMinas = parseInt(mineCountInput.value);
    if (isNaN(totalMinas) || totalMinas <= 0 || totalMinas > size*size) {
      alert("Número de minas inválido. Debe ser entre 1 y " + (size*size));
      return;
    }
    minasRestantesSpan.textContent = totalMinas;
  } else {
    minasRestantesSpan.textContent = "-";
  }

  const celdasNoReveladas = cells.filter(cell => !cell.classList.contains("revealed"));
  if (celdasNoReveladas.length === 0) {
    alert("¡Todas las celdas ya están reveladas!");
    return;
  }

  const celdaSugerida = celdasNoReveladas[Math.floor(Math.random() * celdasNoReveladas.length)];
  sugerirCelda(celdaSugerida, "Primer movimiento aleatorio");
  juegoIniciado = true;
  registrarMovimiento();
});

// Lógica del resolvedor 
nextMoveBtn.addEventListener("click", () => {
  if (verificarVictoria()) return;
  
  if (cells.some(cell => cell.classList.contains("revealed") && cell.dataset.value === "M")) {
    mostrarMensajeDerrota();
    return;
  }

  // PRIORIDAD 1: Expansión desde celdas "0"
  const expansionCero = expandirDesdeCerosAvanzado();
  if (expansionCero) {
    sugerirCelda(expansionCero, "Estrategia: Expansión desde cero");
    registrarMovimiento();
    return;
  }

  // PRIORIDAD 2: Patrones avanzados de minas 
  const patronesMina = detectarPatronesAvanzados();
  if (patronesMina.length > 0) {
    marcarMinas(patronesMina);
    registrarMovimiento();
    return;
  }

  // PRIORIDAD 3: Celdas seguras por conteo exacto
  const celdasSeguras = buscarCeldasSegurasAvanzado();
  if (celdasSeguras.length > 0) {
    sugerirCelda(celdasSeguras[0], "Estrategia: Conteo exacto");
    registrarMovimiento();
    return;
  }

  // PRIORIDAD 4: Análisis de fronteras
  const analisisFrontera = analizarFronteras();
  if (analisisFrontera) {
    sugerirCelda(analisisFrontera.celda, `Estrategia: ${analisisFrontera.razon} (${analisisFrontera.probabilidad.toFixed(2)}% mina)`);
    registrarMovimiento();
    return;
  }

  // PRIORIDAD 5: Análisis global probabilístico
  const mejorOpcion = calcularMejorMovimientoGlobal();
  if (mejorOpcion) {
    sugerirCelda(mejorOpcion.celda, `Estrategia: ${mejorOpcion.razon} (${mejorOpcion.probabilidad.toFixed(2)}% mina)`);
    registrarMovimiento();
    return;
  }

  // Si no hay nada, verificar si el juego terminó
  if (verificarVictoria()) return;
  
  mostrarMensaje("No se detectaron movimientos obvios. Revele más celdas manualmente.");
});

function getVecinos(row, col) {
  const vecinos = [];
  for (let r = Math.max(0, row - 1); r <= Math.min(size - 1, row + 1); r++) {
    for (let c = Math.max(0, col - 1); c <= Math.min(size - 1, col + 1); c++) {
      if (r !== row || c !== col) vecinos.push({ row: r, col: c });
    }
  }
  return vecinos;
}

function marcarMinas(minas) {
  minas.forEach(({ row, col }) => {
    const cell = cells[row * size + col];
    cell.textContent = "🚩";
    cell.classList.add("mina-marcada");
    
    // Actualizar contador si está activo
    if (totalMinas !== null) {
      const minasMarcadas = document.querySelectorAll(".mina-marcada").length;
      minasRestantesSpan.textContent = totalMinas - minasMarcadas;
      if (minasMarcadas > totalMinas) mostrarMensajeDerrota("¡Has marcado más minas de las disponibles!");
    
      
      // Validar no exceder el límite
      if (totalMinas < 0) {
        mostrarMensajeDerrota("¡Has marcado más minas de las disponibles!");
      }
    }
  });
  messageDiv.textContent = `Minas marcadas: ${minas.length}`;
}


function expandirDesdeCerosAvanzado() {
  const celdasCero = cells.filter(c => c.classList.contains("revealed") && c.dataset.value === "0");
  
  // Ordenar por cantidad de vecinos no revelados
  celdasCero.sort((a, b) => {
    const vecinosA = getVecinos(+a.dataset.row, +a.dataset.col)
      .filter(v => !cells[v.row * size + v.col].classList.contains("revealed")).length;
    const vecinosB = getVecinos(+b.dataset.row, +b.dataset.col)
      .filter(v => !cells[v.row * size + v.col].classList.contains("revealed")).length;
    return vecinosB - vecinosA;
  });

  for (const cell of celdasCero) {
    const vecinos = getVecinos(+cell.dataset.row, +cell.dataset.col);
    for (const {row, col} of vecinos) {
      const vecino = cells[row * size + col];
      if (!vecino.classList.contains("revealed") && !vecino.classList.contains("mina-marcada")) {
        return vecino;
      }
    }
  }
  return null;
}

function detectarPatronesAvanzados() {
  const minasDetectadas = [];
  
  // Buscar celdas con valor 8 
  cells.forEach(cell => {
    if (cell.classList.contains("revealed") && cell.dataset.value === "8") {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      const vecinos = getVecinos(row, col);
      
      vecinos.forEach(({row: r, col: c}) => {
        const vecino = cells[r * size + c];
        if (!vecino.classList.contains("mina-marcada") && !vecino.classList.contains("revealed")) {
          minasDetectadas.push({row: r, col: c});
        }
      });
    }
  });

  // Solo si no encontramos 8s, buscamos otros patrones
  if (minasDetectadas.length === 0) {
    // Patrón 1-2-1 clásico
    cells.forEach(cell => {
      if (cell.classList.contains("revealed") && cell.dataset.value === "1") {
        const row = +cell.dataset.row;
        const col = +cell.dataset.col;
        
        // Verificar patrón horizontal 1-2-1
        const derecha = cells[row * size + col + 1];
        const dosDerecha = cells[row * size + col + 2];
        
        if (derecha?.classList.contains("revealed") && derecha.dataset.value === "2" &&
            dosDerecha?.classList.contains("revealed") && dosDerecha.dataset.value === "1") {
          const vecinosCentro = getVecinos(row, col + 1);
          const posiblesMinas = vecinosCentro.filter(v => 
            !cells[v.row * size + v.col].classList.contains("revealed") &&
            !cells[v.row * size + v.col].classList.contains("mina-marcada")
          );
          
          if (posiblesMinas.length === 2) {
            minasDetectadas.push({row: posiblesMinas[0].row, col: posiblesMinas[0].col});
            minasDetectadas.push({row: posiblesMinas[1].row, col: posiblesMinas[1].col});
          }
        }
      }
    });
  }

  return [...new Set(minasDetectadas.map(m => `${m.row},${m.col}`))].map(s => {
    const [r, c] = s.split(',');
    return {row: +r, col: +c};
  });
}

function buscarCeldasSegurasAvanzado() {
  const seguras = [];
  const celdasReveladas = cells.filter(c => c.classList.contains("revealed") && c.dataset.value !== "0" && c.dataset.value !== "M");
  
  celdasReveladas.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const valor = +cell.dataset.value;
    const vecinos = getVecinos(row, col);
    
    let minasMarcadas = 0;
    const celdasOcultas = [];
    
    vecinos.forEach(({row: r, col: c}) => {
      const vecino = cells[r * size + c];
      if (vecino.classList.contains("mina-marcada") || vecino.textContent === "🚩") {
        minasMarcadas++;
      } else if (!vecino.classList.contains("revealed")) {
        celdasOcultas.push(vecino);
      }
    });
    
    if (minasMarcadas === valor && celdasOcultas.length > 0) {
      seguras.push(...celdasOcultas);
    }
  });
  
  return [...new Set(seguras)];
}

function analizarFronteras() {
  const frontera = new Set();
  const celdasReveladas = cells.filter(c => c.classList.contains("revealed") && c.dataset.value !== "0" && c.dataset.value !== "M");
  
  // Identificar frontera
  celdasReveladas.forEach(cell => {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const vecinos = getVecinos(row, col);
    
    if (vecinos.some(({row: r, col: c}) => !cells[r * size + c].classList.contains("revealed"))) {
      frontera.add(cell);
    }
  });
  
  // Analizar cada celda en la frontera
  for (const cell of frontera) {
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const valor = +cell.dataset.value;
    const vecinos = getVecinos(row, col);
    
    let minasMarcadas = 0;
    const celdasOcultas = [];
    
    vecinos.forEach(({row: r, col: c}) => {
      const vecino = cells[r * size + c];
      if (vecino.classList.contains("mina-marcada") || vecino.textContent === "🚩") {
        minasMarcadas++;
      } else if (!vecino.classList.contains("revealed")) {
        celdasOcultas.push({row: r, col: c});
      }
    });
    
    const minasFaltantes = valor - minasMarcadas;
    
    // Si solo falta 1 mina entre varias celdas
    if (minasFaltantes === 1 && celdasOcultas.length > 1) {
      const probabilidades = {};
      
      celdasOcultas.forEach(({row: r, col: c}) => {
        probabilidades[`${r},${c}`] = 1; // Base
        
        // Verificar otras celdas frontera que ven esta celda
        const vecinasReveladas = getVecinos(r, c)
          .map(({row: vr, col: vc}) => cells[vr * size + vc])
          .filter(c => c.classList.contains("revealed") && c.dataset.value !== "0" && c.dataset.value !== "M");
        
        vecinasReveladas.forEach(c => {
          const vRow = +c.dataset.row;
          const vCol = +c.dataset.col;
          const vValor = +c.dataset.value;
          const vVecinos = getVecinos(vRow, vCol);
          
          let vMinasMarcadas = 0;
          let vCeldasOcultas = 0;
          
          vVecinos.forEach(({row: vr, col: vc}) => {
            const vecino = cells[vr * size + vc];
            if (vecino.classList.contains("mina-marcada") || vecino.textContent === "🚩") {
              vMinasMarcadas++;
            } else if (!vecino.classList.contains("revealed")) {
              vCeldasOcultas++;
            }
          });
          
          const vMinasFaltantes = vValor - vMinasMarcadas;
          if (vCeldasOcultas > 0) {
            probabilidades[`${r},${c}`] += vMinasFaltantes / vCeldasOcultas;
          }
        });
      });
      
      // Encontrar la celda con menor probabilidad
      let mejorCelda = null;
      let menorProbabilidad = Infinity;
      
      Object.entries(probabilidades).forEach(([key, prob]) => {
        if (prob < menorProbabilidad) {
          menorProbabilidad = prob;
          const [r, c] = key.split(',').map(Number);
          
          const total = Object.values(probabilidades).reduce((a, b) => a + b, 0);
          let probabilidadCalculada = 0;
          
          if (total !== 0) {
            probabilidadCalculada = (prob / total) * 100;
          }
          
          mejorCelda = {
            celda: cells[r * size + c],
            probabilidad: probabilidadCalculada,
            razon: "Análisis de frontera"
          };
        }
      });
      
      if (mejorCelda) return mejorCelda;
    }
  }
  
  return null;
}

function calcularMejorMovimientoGlobal() {
  const probabilidades = {};
  const celdasOcultas = cells.filter(c => 
    !c.classList.contains("revealed") && !c.classList.contains("mina-marcada")
  );
  
  if (celdasOcultas.length === 0) return null;
  
  // Inicializar probabilidades
  celdasOcultas.forEach(c => {
    probabilidades[`${c.dataset.row},${c.dataset.col}`] = {
      celda: c,
      mina: 0,
      total: 0,
      razon: "Probabilidad global"
    };
  });
  
  // Analizar todas las celdas reveladas
  cells.filter(c => c.classList.contains("revealed") && c.dataset.value !== "0" && c.dataset.value !== "M")
    .forEach(cell => {
      const row = +cell.dataset.row;
      const col = +cell.dataset.col;
      const valor = +cell.dataset.value;
      const vecinos = getVecinos(row, col);
      
      let minasMarcadas = 0;
      const celdasOcultasVecinas = [];
      
      vecinos.forEach(({row: r, col: c}) => {
        const vecino = cells[r * size + c];
        if (vecino.classList.contains("mina-marcada") || vecino.textContent === "🚩") {
          minasMarcadas++;
        } else if (!vecino.classList.contains("revealed")) {
          celdasOcultasVecinas.push(`${r},${c}`);
        }
      });
      
      const minasFaltantes = valor - minasMarcadas;
      if (celdasOcultasVecinas.length > 0 && minasFaltantes > 0) {
        const probabilidadPorCelda = minasFaltantes / celdasOcultasVecinas.length;
        celdasOcultasVecinas.forEach(key => {
          probabilidades[key].mina += probabilidadPorCelda;
          probabilidades[key].total++;
        });
      }
    });
  
  // Calcular probabilidad final
  const resultados = Object.values(probabilidades).map(p => ({
    ...p,
    probabilidad: (p.mina / p.total || 0) * 100
  }));
  
  // Ordenar por menor probabilidad de mina
  resultados.sort((a, b) => a.probabilidad - b.probabilidad);
  
  // Si hay celdas con probabilidad 0, son seguras
  const celdasSeguras = resultados.filter(r => r.probabilidad === 0);
  if (celdasSeguras.length > 0) {
    return {
      celda: celdasSeguras[0].celda,
      probabilidad: 0,
      razon: "Segura por análisis global"
    };
  }
  
  // Devolver la celda con menor probabilidad
  return resultados[0];
}

function sugerirCelda(cell) { //
  cells.forEach(c => c.classList.remove("suggested"));
  cell.classList.add("suggested");
  cell.scrollIntoView({ behavior: "smooth", block: "center" });
  messageDiv.textContent = `Sugerencia: Revelar (${+cell.dataset.row + 1}, ${+cell.dataset.col + 1})`;
}

function registrarMovimiento() {
  movimientos++;
  movimientosSpan.textContent = movimientos;
  
  // Actualizar contador de minas si es necesario
  if (totalMinas !== null) {
    const minasMarcadas = document.querySelectorAll(".mina-marcada").length;
    minasRestantesSpan.textContent = totalMinas - minasMarcadas;
  }
}

function mostrarMensaje(mensaje) {
  messageDiv.textContent = mensaje;
}

function mostrarMensajeDerrota(mensajePersonalizado) {
  const celdasSeguras = cells.filter(cell => 
    cell.classList.contains("revealed") && cell.dataset.value !== "M"
  ).length;

  messageDiv.innerHTML = `
    <p>💥 <strong>¡PERDISTE!</strong> 💥</p>
    ${mensajePersonalizado ? `<p>${mensajePersonalizado}</p>` : ''}
    <p>Minas encontradas: ${document.querySelectorAll(".mina-marcada").length}</p>
    <p>Celdas seguras reveladas: ${celdasSeguras}</p>
    <p>Movimientos totales: ${movimientos}</p>
    <button id="restartBtn">Reiniciar juego</button>
  `;

  cells.forEach(cell => cell.style.pointerEvents = "none");
  nextMoveBtn.disabled = true;
  startBtn.disabled = true;

  document.getElementById("restartBtn").addEventListener("click", () => location.reload());
}

function verificarVictoria() {
  const celdasReveladas = cells.filter(cell => 
    cell.classList.contains("revealed") && cell.dataset.value !== "M"
  ).length;
  
  const celdasSeguras = size * size - (totalMinas !== null ? totalMinas : 10);
  
  if (celdasReveladas >= celdasSeguras) {
    messageDiv.innerHTML = `
      <p>🎉 <strong>¡VICTORIA!</strong> 🎉</p>
      <p>Minas encontradas: ${document.querySelectorAll(".mina-marcada").length}</p>
      <p>Celdas seguras reveladas: ${celdasReveladas}</p>
      <p>Movimientos totales: ${movimientos}</p>
      <button id="restartBtn">Reiniciar juego</button>
    `;
    board.classList.add("victory");
    cells.forEach(cell => cell.style.pointerEvents = "none");
    nextMoveBtn.disabled = true;
    startBtn.disabled = true;
    
    document.getElementById("restartBtn").addEventListener("click", () => location.reload());
    return true;
  }
  return false;
}

// Reiniciar juego
document.getElementById("restartBtn").addEventListener("click", () => {
  location.reload();
});